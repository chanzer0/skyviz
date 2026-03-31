import {
  fetchDailyMissionsManifestData,
  fetchDailyMissionsSnapshotData,
} from './data.js?v=20260331-live-version-poll-1';
import {
  buildAircraftMarkerHtml,
  buildLeafletAircraftMarkerIcon,
  createAircraftMarkerAssetResolver,
  getAircraftMarkerMetrics,
  normalizeAircraftRegistration,
  normalizeAircraftTypeCode,
} from './aircraft-markers.js?v=20260325-aircraft-markers-1';
import { escapeHtml, formatCompact, formatNumber, sanitizeText } from './format.js?v=20260324-daily-missions-2';

const $ = (selector) => document.querySelector(selector);
const el = {
  selectors: [...document.querySelectorAll('[data-mission-selector]')],
  title: $('#mission-board-title'),
  summary: $('#mission-board-summary'),
  desktopTitle: $('#mission-desktop-title'),
  desktopSummary: $('#mission-desktop-summary'),
  updated: $('#mission-updated-value'),
  refresh: $('#mission-refresh-value'),
  flights: $('#mission-flights-value'),
  source: $('#mission-source-value'),
  desktopUpdated: $('#mission-desktop-updated'),
  desktopRefresh: $('#mission-desktop-refresh'),
  desktopFlights: $('#mission-desktop-flights'),
  desktopSource: $('#mission-desktop-source'),
  banner: $('#mission-banner'),
  toolbar: $('#mission-toolbar-summary'),
  desktopToolbar: $('#mission-desktop-toolbar'),
  search: $('#mission-search'),
  sort: $('#mission-sort'),
  mapDetail: $('#mission-map-detail'),
  intel: $('#mission-intel'),
  selectedFlight: $('#mission-selected-flight'),
  listMeta: $('#mission-list-meta'),
  list: $('#mission-flight-list'),
  refreshButton: $('#mission-refresh-button'),
  desktopRefreshButton: $('#mission-desktop-refresh-button'),
  map: $('#mission-map'),
  mapEmpty: $('#mission-map-empty'),
};

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; CARTO';
const COLORS = ['#0f3f70', '#168392', '#ec7f35'];
const MULTI = '#7e9e4d';
const MAP_CLUSTER_THRESHOLD = 80;
const DAILY_MISSIONS_MANIFEST_POLL_SECONDS = 15;
const VIEW = { center: [20, 0], zoom: 1.75 };
const state = {
  board: null,
  manifest: null,
  source: null,
  active: 'all',
  query: '',
  sort: 'freshest',
  mapDetail: 'popup',
  selected: '',
  openPopupFlightId: '',
  pendingSelectionFocus: null,
  pendingViewportMode: 'initial',
  viewportInitialized: false,
  seconds: 60,
  timer: null,
  map: null,
  layer: null,
  markers: new Map(),
  markerAssetStatusByTypeCode: new Map(),
  markerRefreshQueued: false,
  message: '',
  loadPromise: null,
};

const missionMarkerAssetResolver = createAircraftMarkerAssetResolver({
  assetStatusByTypeCode: state.markerAssetStatusByTypeCode,
  onAssetStatusChange: () => {
    queueMissionMarkerRefresh();
  },
});

const ordinal = (day) => {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  if (day % 10 === 1) return 'st';
  if (day % 10 === 2) return 'nd';
  if (day % 10 === 3) return 'rd';
  return 'th';
};

const friendlyDate = (dateKey) => {
  const date = new Date(`${sanitizeText(dateKey)}T00:00:00Z`);
  const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
  return Number.isNaN(date.getTime()) ? 'Daily Missions' : `${months[date.getUTCMonth()]} ${date.getUTCDate()}${ordinal(date.getUTCDate())}`;
};

const timeLabel = (value) => {
  const timestamp = Date.parse(value || '');
  return Number.isFinite(timestamp)
    ? new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
    })
    : '--';
};

const ageLabel = (lastSeenAt) => {
  const delta = Math.max(0, Math.floor(Date.now() / 1000) - Math.floor(Number(lastSeenAt) || 0));
  if (delta < 60) return `${delta}s ago`;
  if (delta < 3600) return `${Math.floor(delta / 60)}m ago`;
  return `${Math.floor(delta / 3600)}h ago`;
};

const countdownLabel = (seconds) => {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const rem = safe % 60;
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${String(rem).padStart(2, '0')}s`;
};

const boardVersion = (manifest) => sanitizeText(manifest?.version)
  || sanitizeText(manifest?.snapshotPath)
  || sanitizeText(manifest?.generatedAt);

const missionFromUrl = () => sanitizeText(new URL(window.location.href).searchParams.get('mission'));
const dateFromUrl = () => sanitizeText(new URL(window.location.href).searchParams.get('date'));
const normalizeText = (value) => sanitizeText(value).toLowerCase();
const sortValue = (left, right, key) => (Number(right[key]) || -Infinity) - (Number(left[key]) || -Infinity);

function normalizeBoard(payload, source) {
  const missions = (payload?.missions || []).map((mission, index) => ({
    ...mission,
    key: sanitizeText(mission.key) || `mission-${index + 1}`,
    ordinal: index + 1,
    title: sanitizeText(mission.title) || `Mission ${index + 1}`,
    matchCount: Number(mission.matchCount) || 0,
    displayedMatchCount: Number(mission.displayedMatchCount) || 0,
    truncated: Boolean(mission.truncated),
    finder: {
      sections: (mission?.finder?.sections || []).map((section) => ({
        label: sanitizeText(section.label) || 'Filter values',
        copyText: sanitizeText(section.copyText) || (section.values || []).map((value) => sanitizeText(value)).filter(Boolean).join(', '),
      })).filter((section) => section.copyText),
      notes: (mission?.finder?.notes || []).map((note) => sanitizeText(note)).filter(Boolean),
    },
  }));
  const titleByKey = new Map(missions.map((mission) => [mission.key, mission.title]));
  const orderByKey = new Map(missions.map((mission) => [mission.key, mission.ordinal]));
  const flights = (payload?.flights || []).map((flight) => {
    const matchedMissionKeys = [...new Set((flight?.matchedMissionKeys || []).map((value) => sanitizeText(value)).filter(Boolean))];
    const matchedMissionOrdinals = matchedMissionKeys.map((key) => orderByKey.get(key)).filter(Boolean);
    return {
      ...flight,
      id: sanitizeText(flight.id),
      callsign: sanitizeText(flight.callsign) || sanitizeText(flight.flightNumber) || 'Unknown flight',
      flightNumber: sanitizeText(flight.flightNumber),
      registration: normalizeAircraftRegistration(flight.registration),
      typeCode: normalizeAircraftTypeCode(flight.typeCode),
      manufacturer: sanitizeText(flight.manufacturer),
      modelName: sanitizeText(flight.modelName),
      fr24Url: sanitizeText(flight.fr24Url),
      originIata: sanitizeText(flight.originIata).toUpperCase(),
      destinationIata: sanitizeText(flight.destinationIata).toUpperCase(),
      displayRouteLabel: sanitizeText(flight.displayRouteLabel) || 'Unknown route',
      lat: Number(flight.lat),
      lon: Number(flight.lon),
      track: Number(flight.track),
      speed: Number(flight.speed),
      altitude: Number(flight.altitude),
      distanceKm: Number(flight.distanceKm),
      lastSeenAt: Number(flight.lastSeenAt),
      matchedMissionKeys,
      matchedMissionOrdinals,
      missionTitles: matchedMissionKeys.map((key) => titleByKey.get(key)).filter(Boolean),
      searchText: normalizeText([
        flight.callsign,
        flight.flightNumber,
        flight.registration,
        flight.typeCode,
        flight.manufacturer,
        flight.modelName,
        flight.originIata,
        flight.destinationIata,
        flight.displayRouteLabel,
        ...matchedMissionKeys.map((key) => titleByKey.get(key)),
      ].filter(Boolean).join(' ')),
    };
  }).filter((flight) => flight.id);
  return { ...payload, missions, flights, missionMap: new Map(missions.map((mission) => [mission.key, mission])), source };
}

function activeMission() {
  return state.active === 'all' ? null : state.board?.missionMap?.get(state.active);
}

function visibleFlights() {
  const tokens = normalizeText(state.query).split(/\s+/).filter(Boolean);
  const flights = (state.board?.flights || []).filter((flight) => state.active === 'all' || flight.matchedMissionKeys.includes(state.active));
  const filtered = tokens.length ? flights.filter((flight) => tokens.every((token) => flight.searchText.includes(token))) : flights;
  return filtered.sort((left, right) => {
    if (state.sort === 'speed') return sortValue(left, right, 'speed') || sortValue(left, right, 'lastSeenAt');
    if (state.sort === 'altitude') return sortValue(left, right, 'altitude') || sortValue(left, right, 'lastSeenAt');
    if (state.sort === 'distance') return sortValue(left, right, 'distanceKm') || sortValue(left, right, 'lastSeenAt');
    if (state.sort === 'mission') return (Math.min(...left.matchedMissionOrdinals, 99) - Math.min(...right.matchedMissionOrdinals, 99)) || sortValue(left, right, 'lastSeenAt');
    if (state.sort === 'callsign') return left.callsign.localeCompare(right.callsign) || sortValue(left, right, 'lastSeenAt');
    return sortValue(left, right, 'lastSeenAt') || left.callsign.localeCompare(right.callsign);
  });
}

function missionColor(ordinalValue) {
  return COLORS[(Math.max(1, Number(ordinalValue) || 1) - 1) % COLORS.length];
}

function buildAircraftSummary(flight) {
  return [flight.manufacturer, flight.modelName].filter(Boolean).join(' ') || flight.typeCode || 'Unknown aircraft';
}

function buildFlightIdentitySummary(flight) {
  const bits = [];
  if (flight.registration) {
    bits.push(`Reg ${flight.registration}`);
  }
  if (flight.typeCode) {
    bits.push(`ICAO ${flight.typeCode}`);
  }
  return bits.join(' | ') || 'Registration n/a';
}

function buildMissionBadges(ordinals = []) {
  return ordinals.map((ordinalValue) => `
    <span class="mission-flight-badge" style="--mission-accent:${missionColor(ordinalValue)}">M${ordinalValue}</span>
  `).join('');
}

function buildMetricPills(metrics = []) {
  return metrics.map((metric) => `
    <span class="daily-missions-metric-pill${metric.neutral ? ' daily-missions-metric-pill--neutral' : ''}">${escapeHtml(metric.value)}</span>
  `).join('');
}

function buildFlightTelemetryMetrics(flight, options = {}) {
  const metrics = [];
  if (options.includeRegistration) {
    metrics.push({
      value: flight.registration ? `Reg ${flight.registration}` : 'Reg n/a',
      neutral: !flight.registration,
    });
  }
  if (options.includeTypeCode) {
    metrics.push({
      value: flight.typeCode ? `ICAO ${flight.typeCode}` : 'ICAO n/a',
      neutral: !flight.typeCode,
    });
  }
  if (options.includeSpeed !== false) {
    metrics.push({
      value: Number.isFinite(flight.speed) ? `${Math.round(flight.speed)} kt` : 'Speed n/a',
      neutral: !Number.isFinite(flight.speed),
    });
  }
  if (options.includeAltitude !== false) {
    metrics.push({
      value: Number.isFinite(flight.altitude) ? `${formatNumber(Math.round(flight.altitude))} ft` : 'Altitude n/a',
      neutral: !Number.isFinite(flight.altitude),
    });
  }
  if (options.includeHeading) {
    metrics.push({
      value: Number.isFinite(flight.track) ? `Heading ${Math.round(flight.track)} deg` : 'Heading n/a',
      neutral: !Number.isFinite(flight.track),
    });
  }
  if (options.includeDistance) {
    metrics.push({
      value: Number.isFinite(flight.distanceKm) ? `${formatNumber(Math.round(flight.distanceKm))} km` : 'Route n/a',
      neutral: !Number.isFinite(flight.distanceKm),
    });
  }
  if (options.includeAge !== false) {
    metrics.push({ value: ageLabel(flight.lastSeenAt), neutral: false });
  }
  return metrics;
}

function missionMarkerAccentColor(flight) {
  const ordinals = flight.matchedMissionOrdinals || [];
  const activeOrdinal = activeMission()?.ordinal || ordinals[0] || 1;
  return state.active === 'all' && ordinals.length > 1 ? MULTI : missionColor(activeOrdinal);
}

function buildMissionMarkerBadgeStack(flight) {
  const ordinals = (flight.matchedMissionOrdinals || []).slice(0, 3);
  if (!ordinals.length) {
    return '';
  }
  return `
    <div class="mission-aircraft-marker-badge-stack" aria-hidden="true">
      ${ordinals.map((ordinalValue) => `
        <span class="mission-aircraft-marker-badge" style="--mission-accent:${missionColor(ordinalValue)}">${escapeHtml(String(ordinalValue))}</span>
      `).join('')}
    </div>
  `;
}

function buildSelectedMarkerCallout(flight) {
  if (state.mapDetail !== 'selected' || flight.id !== state.selected) {
    return '';
  }
  const title = [flight.registration, flight.typeCode].filter(Boolean).join(' | ') || buildAircraftSummary(flight);
  const meta = [
    Number.isFinite(flight.speed) ? `${Math.round(flight.speed)} kt` : 'Speed n/a',
    Number.isFinite(flight.altitude) ? `${formatNumber(Math.round(flight.altitude))} ft` : 'Altitude n/a',
  ].join(' | ');
  return `
    <div class="mission-aircraft-marker-callout" aria-hidden="true">
      <strong class="mission-aircraft-marker-callout-title">${escapeHtml(title)}</strong>
      <span class="mission-aircraft-marker-callout-meta">${escapeHtml(meta)}</span>
    </div>
  `;
}

function getMissionMarkerMetrics(isSelected = false) {
  return getAircraftMarkerMetrics(state.map?.getZoom?.() || VIEW.zoom, {
    isSelected,
    baseSize: 20,
    minZoom: 2,
    maxZoom: 8,
    fallbackZoom: 2,
    zoomStep: 3,
    selectedSizeBoost: 6,
    minRingInset: 4,
    ringInsetRatio: 0.18,
    minFallbackInset: 4,
    fallbackInsetRatio: 0.22,
    minPopupOffset: 14,
    popupOffsetRatio: 0.48,
  });
}

function buildMissionMarkerHtml(flight, isSelected = false, metrics = getMissionMarkerMetrics(isSelected)) {
  const markerUrl = missionMarkerAssetResolver.resolveMarkerUrl(flight.typeCode);
  return buildAircraftMarkerHtml({
    typeCode: flight.typeCode,
    markerUrl,
    fallbackLabel: (flight.typeCode || flight.registration || flight.callsign || 'FLT').slice(0, 3),
    resolverId: missionMarkerAssetResolver.resolverId,
    rotation: Number.isFinite(flight.track) ? Number(flight.track) : 0,
    isSelected,
    metrics,
    rootClassName: 'mission-aircraft-marker',
    imageClassName: 'mission-aircraft-marker-image',
    fallbackClassName: 'mission-aircraft-marker-fallback',
    overlayHtml: `${buildMissionMarkerBadgeStack(flight)}${buildSelectedMarkerCallout(flight)}`,
    styleMap: {
      '--mission-marker-accent': missionMarkerAccentColor(flight),
    },
  });
}

function markerIcon(flight) {
  const isSelected = flight.id === state.selected;
  const metrics = getMissionMarkerMetrics(isSelected);
  return buildLeafletAircraftMarkerIcon({
    leaflet: window.L,
    metrics,
    html: buildMissionMarkerHtml(flight, isSelected, metrics),
    shellClassName: 'mission-aircraft-marker-shell',
  });
}

function queueMissionMarkerRefresh() {
  if (state.markerRefreshQueued) {
    return;
  }
  state.markerRefreshQueued = true;
  requestAnimationFrame(() => {
    state.markerRefreshQueued = false;
    updateMissionMarkerIcons();
  });
}

function updateMissionMarkerIcons() {
  if (!window.L || !state.markers.size) {
    return;
  }
  const visibleFlightsById = new Map(visibleFlights().map((flight) => [flight.id, flight]));
  state.markers.forEach((marker, flightId) => {
    const flight = visibleFlightsById.get(flightId);
    if (!flight) {
      return;
    }
    marker.setIcon(markerIcon(flight));
    marker.setZIndexOffset(flightId === state.selected ? 1200 : 0);
  });
}

function buildMapPopup(flight) {
  return `
    <div class="mission-map-popup">
      <div class="mission-map-popup-head">
        <div class="mission-map-popup-copy">
          <span class="daily-missions-selected-kicker">Live flight</span>
          <strong class="mission-map-popup-title">${escapeHtml(flight.callsign)}</strong>
          <p class="mission-map-popup-support">${escapeHtml(buildAircraftSummary(flight))}</p>
        </div>
        <div class="mission-flight-badges">${buildMissionBadges(flight.matchedMissionOrdinals || [])}</div>
      </div>
      <p class="mission-map-popup-route">${escapeHtml(flight.displayRouteLabel)}</p>
      <div class="mission-map-popup-metrics">
        ${buildMetricPills(buildFlightTelemetryMetrics(flight, {
    includeRegistration: true,
    includeTypeCode: true,
    includeHeading: true,
    includeAge: true,
  }))}
      </div>
      <div class="mission-map-popup-actions">
        <a class="mission-flight-link" href="${escapeHtml(flight.fr24Url || '#')}" target="_blank" rel="noopener noreferrer">Open in FR24</a>
      </div>
    </div>
  `;
}

function ensureMap() {
  if (state.map || !window.L || !el.map) return state.map;
  state.map = window.L.map(el.map, {
    center: VIEW.center,
    zoom: VIEW.zoom,
    zoomSnap: 0.25,
    preferCanvas: true,
  });
  window.L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(state.map);
  state.map.on('zoomend', () => {
    updateMissionMarkerIcons();
  });
  return state.map;
}

function clusterColor(markers) {
  const ordinals = new Set();
  markers.forEach((marker) => {
    const missionOrdinals = Array.isArray(marker.options?.missionOrdinals) ? marker.options.missionOrdinals : [];
    missionOrdinals.forEach((ordinalValue) => {
      if (Number.isFinite(ordinalValue)) {
        ordinals.add(ordinalValue);
      }
    });
  });
  if (state.active === 'all' && ordinals.size > 1) {
    return MULTI;
  }
  const ordinalValue = activeMission()?.ordinal || ordinals.values().next().value || 1;
  return COLORS[(ordinalValue - 1) % COLORS.length];
}

function clusterIcon(cluster) {
  const markers = cluster.getAllChildMarkers();
  const color = clusterColor(markers);
  return window.L.divIcon({
    className: '',
    html: `<div class="mission-map-cluster" style="--mission-marker-color:${color}"><span>${escapeHtml(formatCompact(markers.length))}</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function renderMap() {
  const map = ensureMap();
  if (!map) {
    el.mapEmpty.hidden = false;
    el.mapEmpty.textContent = 'Leaflet failed to load.';
    return;
  }
  const previouslyOpenPopupFlightId = state.openPopupFlightId;
  map.closePopup();
  if (state.layer) map.removeLayer(state.layer);
  state.layer = null;
  state.markers = new Map();
  const flights = visibleFlights().filter((flight) => Number.isFinite(flight.lat) && Number.isFinite(flight.lon));
  const useClusters = flights.length >= MAP_CLUSTER_THRESHOLD && typeof window.L.markerClusterGroup === 'function';
  const visibleFlightIds = new Set(flights.map((flight) => flight.id));
  el.mapEmpty.hidden = flights.length > 0;
  el.mapEmpty.textContent = flights.length ? '' : 'No live matches are visible for the current mission filter.';
  if (visibleFlightIds.has(previouslyOpenPopupFlightId)) {
    state.openPopupFlightId = previouslyOpenPopupFlightId;
  }
  if (!visibleFlightIds.has(state.openPopupFlightId)) {
    state.openPopupFlightId = '';
  }
  if (!flights.length) {
    state.pendingSelectionFocus = null;
    if (state.pendingViewportMode || !state.viewportInitialized) {
      map.setView(VIEW.center, VIEW.zoom);
      state.pendingViewportMode = '';
      state.viewportInitialized = true;
    }
    return;
  }
  const markers = flights.map((flight) => {
    const marker = window.L.marker([flight.lat, flight.lon], {
      icon: markerIcon(flight),
      title: flight.callsign,
      missionOrdinals: flight.matchedMissionOrdinals || [],
      zIndexOffset: flight.id === state.selected ? 1200 : 0,
    });
    marker.bindPopup(buildMapPopup(flight), {
      maxWidth: 340,
      className: 'mission-map-popup-shell',
      autoPan: false,
    });
    marker.on('popupopen', () => {
      state.openPopupFlightId = flight.id;
    });
    marker.on('popupclose', () => {
      if (state.openPopupFlightId === flight.id) {
        state.openPopupFlightId = '';
      }
    });
    marker.on('click', () => {
      state.selected = flight.id;
      state.openPopupFlightId = flight.id;
      state.pendingSelectionFocus = {
        pan: false,
        openPopup: true,
      };
      renderSelectedFlight();
      renderList();
      renderMap();
    });
    state.markers.set(flight.id, marker);
    return marker;
  });
  state.layer = useClusters
    ? window.L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 42,
      disableClusteringAtZoom: 7,
      iconCreateFunction: clusterIcon,
    })
    : window.L.layerGroup(markers);
  markers.forEach((marker) => state.layer.addLayer(marker));
  state.layer.addTo(map);
  if (state.pendingSelectionFocus && state.selected && state.markers.has(state.selected)) {
    const marker = state.markers.get(state.selected);
    const selectionFocus = state.pendingSelectionFocus;
    const focusSelectedMarker = () => {
      if (selectionFocus.pan !== false) {
        map.setView(marker.getLatLng(), Math.max(map.getZoom(), 5));
      }
      if (selectionFocus.openPopup !== false) {
        marker.openPopup();
      }
    };
    state.pendingSelectionFocus = null;
    state.pendingViewportMode = '';
    state.viewportInitialized = true;
    if (selectionFocus.pan !== false && useClusters && typeof state.layer.zoomToShowLayer === 'function') {
      state.layer.zoomToShowLayer(marker, focusSelectedMarker);
      return;
    }
    focusSelectedMarker();
    return;
  }
  state.pendingSelectionFocus = null;
  if (state.openPopupFlightId && state.markers.has(state.openPopupFlightId)) {
    state.markers.get(state.openPopupFlightId).openPopup();
  }
  if (!state.pendingViewportMode) {
    state.viewportInitialized = true;
    return;
  }
  if (state.active === 'all') {
    map.setView(VIEW.center, VIEW.zoom);
  } else if (flights.length === 1) {
    map.setView([flights[0].lat, flights[0].lon], 6);
  } else {
    map.fitBounds(window.L.latLngBounds(flights.map((flight) => [flight.lat, flight.lon])).pad(0.16), {
      animate: false,
      maxZoom: 7,
    });
  }
  state.pendingViewportMode = '';
  state.viewportInitialized = true;
}

function renderRailHeader() {
  const requestedDate = dateFromUrl();
  const source = sanitizeText(state.source?.label) || 'Shared mission board';
  el.title.textContent = 'Daily Missions';
  if (el.desktopTitle) {
    el.desktopTitle.textContent = 'Daily Missions';
  }
  const summary = [
    `${friendlyDate(state.board.missionDate)} board`,
    source,
    requestedDate && requestedDate !== state.board.missionDate ? `showing ${state.board.missionDate}` : '',
  ].filter(Boolean).join(' | ');
  el.summary.textContent = summary;
  if (el.desktopSummary) {
    el.desktopSummary.textContent = summary;
  }
  const updated = timeLabel(state.board.generatedAt);
  const refresh = countdownLabel(state.seconds);
  const flights = formatNumber(state.board.rowCount || 0);
  const sourceText = sanitizeText(state.source?.role) ? `${source} | ${sanitizeText(state.source.role)}` : source;
  el.updated.textContent = updated;
  el.refresh.textContent = refresh;
  el.flights.textContent = flights;
  el.source.textContent = sourceText;
  if (el.desktopUpdated) {
    el.desktopUpdated.textContent = updated;
  }
  if (el.desktopRefresh) {
    el.desktopRefresh.textContent = refresh;
  }
  if (el.desktopFlights) {
    el.desktopFlights.textContent = flights;
  }
  if (el.desktopSource) {
    el.desktopSource.textContent = sourceText;
  }
  document.title = `${friendlyDate(state.board.missionDate)} Daily Missions | Skyviz`;
}

function renderBanner() {
  const stale = Date.now() - Date.parse(state.board?.generatedAt || 0) > (Number(state.board?.staleAfterSeconds) || 900) * 1000;
  const copy = state.message || (stale ? 'Mission feed is stale.' : '');
  el.banner.hidden = !copy;
  el.banner.textContent = copy;
  el.banner.dataset.tone = stale ? 'warning' : 'quiet';
}

function renderSelector() {
  const totalMissionMatches = (state.board.missions || []).reduce((sum, mission) => sum + mission.matchCount, 0);
  const html = [
    `
    <button class="mission-selector-card mission-selector-card--all${state.active === 'all' ? ' is-active' : ''}" type="button" data-mission="all" aria-pressed="${state.active === 'all' ? 'true' : 'false'}">
      <span class="mission-selector-card-index">All missions</span>
      <strong class="mission-selector-card-title">Whole mission board</strong>
      <span class="mission-selector-card-meta">${formatCompact(totalMissionMatches)} mission matches across ${formatNumber(state.board.rowCount || 0)} flights</span>
    </button>`,
    ...state.board.missions.map((mission) => `
      <button class="mission-selector-card${mission.key === state.active ? ' is-active' : ''}" type="button" data-mission="${escapeHtml(mission.key)}" aria-pressed="${mission.key === state.active ? 'true' : 'false'}">
        <span class="mission-selector-card-index" style="--mission-accent:${COLORS[(mission.ordinal - 1) % COLORS.length]}">Mission ${mission.ordinal}</span>
        <strong class="mission-selector-card-title">${escapeHtml(mission.title)}</strong>
        <span class="mission-selector-card-meta">${mission.truncated ? `${formatNumber(mission.displayedMatchCount)} shown of ${formatCompact(mission.matchCount)}` : `${formatNumber(mission.matchCount)} live matches`}</span>
      </button>`),
  ].join('');
  el.selectors.forEach((selectorRoot) => {
    selectorRoot.innerHTML = html;
  });
}

function updateScopeChrome(flights) {
  const mission = activeMission();
  const scopeMeta = mission
    ? `${formatNumber(flights.length)} flights visible`
    : `${formatNumber(flights.length)} visible across ${formatNumber(state.board.missions.length)} missions`;
  el.toolbar.textContent = mission ? `${mission.title} | ${formatNumber(flights.length)} visible` : scopeMeta;
  if (el.desktopToolbar) {
    el.desktopToolbar.textContent = el.toolbar.textContent;
  }
  el.listMeta.textContent = `${formatNumber(flights.length)} visible`;
}

function selectedFlight() {
  return visibleFlights().find((flight) => flight.id === state.selected) || null;
}

function renderSelectedFlight() {
  const flight = selectedFlight();
  if (!flight) {
    el.selectedFlight.innerHTML = `
      <div class="daily-missions-selected-empty">
        <span class="daily-missions-selected-kicker">Highlighted flight</span>
        <strong>No visible flight selected</strong>
        <p class="daily-missions-summary">Pick a flight from the map or the live matches list.</p>
      </div>`;
    return;
  }
  const metrics = buildFlightTelemetryMetrics(flight, {
    includeHeading: true,
    includeDistance: true,
    includeAge: true,
  });
  el.selectedFlight.innerHTML = `
    <article class="daily-missions-selected-card">
      <div class="daily-missions-selected-head">
        <div class="daily-missions-selected-copy">
          <span class="daily-missions-selected-kicker">Highlighted flight</span>
          <h3 class="daily-missions-selected-title">${escapeHtml(flight.callsign)}</h3>
          <p class="daily-missions-selected-support">${escapeHtml(buildAircraftSummary(flight))}</p>
        </div>
        <div class="mission-flight-badges">${buildMissionBadges(flight.matchedMissionOrdinals || [])}</div>
      </div>
      <p class="daily-missions-selected-route">${escapeHtml(flight.displayRouteLabel)}</p>
      <p class="daily-missions-selected-support">${escapeHtml(buildFlightIdentitySummary(flight))}</p>
      <div class="daily-missions-selected-metrics">
        ${buildMetricPills(metrics)}
      </div>
      <div class="daily-missions-selected-actions">
        <a class="mission-flight-link" href="${escapeHtml(flight.fr24Url || '#')}" target="_blank" rel="noopener noreferrer">Open in FR24</a>
      </div>
    </article>`;
}

function renderList() {
  const flights = visibleFlights();
  if (!flights.some((flight) => flight.id === state.selected)) {
    state.selected = flights[0]?.id || '';
  }
  updateScopeChrome(flights);
  el.list.innerHTML = flights.length ? flights.map((flight) => {
    const metrics = buildFlightTelemetryMetrics(flight, { includeAge: true });
    return `
      <article class="mission-flight-row${flight.id === state.selected ? ' is-selected' : ''}" data-flight-id="${escapeHtml(flight.id)}">
        <button class="mission-flight-focus" type="button" data-flight="${escapeHtml(flight.id)}" aria-pressed="${flight.id === state.selected ? 'true' : 'false'}">
          <div class="mission-flight-head">
            <div class="mission-flight-title-wrap">
              <h3 class="mission-flight-title">${escapeHtml(flight.callsign)}</h3>
              <p class="mission-flight-support">${escapeHtml(buildAircraftSummary(flight))}</p>
            </div>
            <div class="mission-flight-badges">${buildMissionBadges(flight.matchedMissionOrdinals || [])}</div>
          </div>
          <p class="mission-flight-route">${escapeHtml(flight.displayRouteLabel)} | ${escapeHtml(buildFlightIdentitySummary(flight))}</p>
          <div class="mission-flight-metrics">
            ${buildMetricPills(metrics)}
          </div>
        </button>
      </article>`;
  }).join('') : '<div class="daily-missions-empty-state">No live matches right now. Try another mission or clear the search.</div>';
}

function renderIntel() {
  const missions = state.active === 'all' ? state.board.missions : [activeMission()].filter(Boolean);
  el.intel.innerHTML = missions.map((mission) => `
    <section class="mission-intel-card">
      <div class="mission-intel-head">
        <div>
          <span class="mission-finder-kicker">Mission ${mission.ordinal}</span>
          <h3>${escapeHtml(mission.title)}</h3>
        </div>
        <span class="mission-status-pill" style="--mission-accent:${COLORS[(mission.ordinal - 1) % COLORS.length]}">${mission.truncated ? `${formatNumber(mission.displayedMatchCount)} shown` : `${formatNumber(mission.matchCount)} live`}</span>
      </div>
      <div class="mission-finder-list">
        ${(mission.finder.sections || []).map((section) => `
          <article class="mission-finder-block">
            <div class="mission-finder-head">
              <div>
                <span class="mission-finder-kicker">${escapeHtml(section.label)}</span>
                <h4>${escapeHtml(mission.title)}</h4>
              </div>
              <button class="mission-copy-button" type="button" data-copy="${escapeHtml(section.copyText)}" data-label="${escapeHtml(`${mission.title} ${section.label}`)}">Copy</button>
            </div>
            <code class="mission-finder-code">${escapeHtml(section.copyText)}</code>
          </article>`).join('')}
      </div>
      ${(mission.finder.notes || []).length
        ? `<p class="mission-intel-note">${escapeHtml(mission.finder.notes.join(' '))}</p>`
        : '<p class="mission-intel-note">Paste the copied value into the matching FR24 finder field.</p>'}
    </section>`).join('');
}

function render() {
  if (el.mapDetail) {
    el.mapDetail.value = state.mapDetail;
  }
  renderRailHeader();
  renderBanner();
  renderSelector();
  renderList();
  renderSelectedFlight();
  renderIntel();
  renderMap();
  const url = new URL(window.location.href);
  url.searchParams.set('date', state.board.missionDate || '');
  url.searchParams.set('mission', state.active || 'all');
  window.history.replaceState({}, '', url);
}

async function load(silent = false, options = {}) {
  if (state.loadPromise) {
    return state.loadPromise;
  }
  const forceSnapshot = options.forceSnapshot === true;
  state.loadPromise = (async () => {
    const manifestData = await fetchDailyMissionsManifestData();
    const nextVersion = boardVersion(manifestData.manifest);
    const currentVersion = boardVersion(state.manifest);
    const shouldFetchSnapshot = forceSnapshot
      || !state.board
      || !nextVersion
      || nextVersion !== currentVersion;
    if (shouldFetchSnapshot) {
      const hadBoard = Boolean(state.board);
      const live = await fetchDailyMissionsSnapshotData({ manifestData });
      state.board = normalizeBoard(live.payload, live.source);
      state.manifest = live.manifest;
      state.source = live.source;
      const requestedMission = missionFromUrl();
      state.active = state.board.missionMap.has(requestedMission)
        ? requestedMission
        : (requestedMission === 'all' ? 'all' : (state.active === 'all' || state.board.missionMap.has(state.active) ? state.active : 'all'));
      if (!state.viewportInitialized || !hadBoard) {
        state.pendingViewportMode = 'initial';
      }
    } else {
      state.manifest = manifestData.manifest;
      state.source = manifestData.source;
    }
    if (!silent) {
      state.message = state.source?.fallbackUsed ? 'Local daily-missions fixture was unavailable, so Skyviz fell back to the shared live board.' : '';
    }
    state.seconds = DAILY_MISSIONS_MANIFEST_POLL_SECONDS;
    render();
  })().finally(() => {
    state.loadPromise = null;
  });
  return state.loadPromise;
}

async function copyValue(value, label) {
  const text = sanitizeText(value);
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    state.message = `Copied ${label}.`;
  } catch (_error) {
    state.message = `Unable to copy ${label}.`;
  }
  renderBanner();
  window.setTimeout(() => {
    if (state.message === `Copied ${label}.`) {
      state.message = '';
      renderBanner();
    }
  }, 2500);
}

el.refreshButton?.addEventListener('click', () => load(false, { forceSnapshot: true }));
el.desktopRefreshButton?.addEventListener('click', () => load(false, { forceSnapshot: true }));
el.search?.addEventListener('input', () => {
  state.query = sanitizeText(el.search.value);
  state.pendingSelectionFocus = null;
  renderList();
  renderSelectedFlight();
  renderMap();
});
el.sort?.addEventListener('change', () => {
  state.sort = sanitizeText(el.sort.value) || 'freshest';
  state.pendingSelectionFocus = null;
  renderList();
  renderSelectedFlight();
  renderMap();
});
el.mapDetail?.addEventListener('change', () => {
  state.mapDetail = sanitizeText(el.mapDetail.value) === 'selected' ? 'selected' : 'popup';
  renderMap();
});
el.selectors.forEach((selectorRoot) => {
  selectorRoot.addEventListener('click', (event) => {
    const button = event.target instanceof Element ? event.target.closest('button[data-mission]') : null;
    if (!button) return;
    state.active = sanitizeText(button.getAttribute('data-mission')) || 'all';
    state.selected = '';
    state.openPopupFlightId = '';
    state.pendingSelectionFocus = null;
    state.pendingViewportMode = 'scope';
    render();
  });
});
el.intel?.addEventListener('click', async (event) => {
  const button = event.target instanceof Element ? event.target.closest('button[data-copy]') : null;
  if (!button) return;
  await copyValue(button.getAttribute('data-copy'), button.getAttribute('data-label') || 'filter values');
});
el.list?.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest('button[data-flight]') : null;
  if (!button) return;
  state.selected = sanitizeText(button.getAttribute('data-flight'));
  state.openPopupFlightId = state.selected;
  state.pendingSelectionFocus = {
    pan: true,
    openPopup: true,
  };
  renderSelectedFlight();
  renderList();
  renderMap();
});

state.timer = window.setInterval(() => {
  if (!state.board) return;
  state.seconds = Math.max(0, state.seconds - 1);
  renderRailHeader();
  renderBanner();
  if (state.seconds <= 0 && !state.loadPromise) {
    load(true).catch((error) => {
      state.message = error instanceof Error ? error.message : 'Unable to refresh the mission board.';
      renderBanner();
    });
  }
}, 1000);

load().catch((error) => {
  state.message = error instanceof Error ? error.message : 'Unable to load the mission board.';
  renderBanner();
});
