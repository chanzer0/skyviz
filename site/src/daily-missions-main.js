import { fetchDailyMissionsSnapshotData } from './data.js?v=20260324-daily-missions-3';
import { escapeHtml, formatCompact, formatNumber, sanitizeText } from './format.js?v=20260324-daily-missions-2';

const $ = (selector) => document.querySelector(selector);
const el = {
  title: $('#mission-board-title'),
  summary: $('#mission-board-summary'),
  updated: $('#mission-updated-value'),
  refresh: $('#mission-refresh-value'),
  flights: $('#mission-flights-value'),
  source: $('#mission-source-value'),
  banner: $('#mission-banner'),
  selector: $('#mission-selector'),
  toolbar: $('#mission-toolbar-summary'),
  search: $('#mission-search'),
  sort: $('#mission-sort'),
  intel: $('#mission-intel'),
  listMeta: $('#mission-list-meta'),
  list: $('#mission-flight-list'),
  refreshButton: $('#mission-refresh-button'),
  map: $('#mission-map'),
  mapEmpty: $('#mission-map-empty'),
  mapScope: $('#mission-map-scope'),
  mapScopeMeta: $('#mission-map-scope-meta'),
  mapOverlay: $('#mission-map-overlay'),
  mapOverlayTitle: $('#mission-map-overlay-title'),
  mapOverlayMeta: $('#mission-map-overlay-meta'),
};

const TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; CARTO';
const COLORS = ['#0f3f70', '#168392', '#ec7f35'];
const MULTI = '#7e9e4d';
const MAP_CLUSTER_THRESHOLD = 80;
const VIEW = { center: [18, 0], zoom: 2 };
const state = {
  board: null,
  source: null,
  active: 'all',
  query: '',
  sort: 'freshest',
  selected: '',
  seconds: 60,
  timer: null,
  map: null,
  layer: null,
  markers: new Map(),
  message: '',
  loadPromise: null,
};

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

const missionFromUrl = () => sanitizeText(new URL(window.location.href).searchParams.get('mission'));
const dateFromUrl = () => sanitizeText(new URL(window.location.href).searchParams.get('date'));
const sortValue = (left, right, key) => (Number(right[key]) || -Infinity) - (Number(left[key]) || -Infinity);
const normalizeText = (value) => sanitizeText(value).toLowerCase();

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
      registration: sanitizeText(flight.registration),
      typeCode: sanitizeText(flight.typeCode),
      manufacturer: sanitizeText(flight.manufacturer),
      modelName: sanitizeText(flight.modelName),
      displayRouteLabel: sanitizeText(flight.displayRouteLabel) || 'Unknown route',
      lat: Number(flight.lat),
      lon: Number(flight.lon),
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

function activeMissionAccent() {
  const mission = activeMission();
  return mission ? COLORS[(mission.ordinal - 1) % COLORS.length] : MULTI;
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

function ensureMap() {
  if (state.map || !window.L || !el.map) return state.map;
  state.map = window.L.map(el.map, { center: VIEW.center, zoom: VIEW.zoom, preferCanvas: true });
  window.L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(state.map);
  return state.map;
}

function markerIcon(flight) {
  const ordinals = flight.matchedMissionOrdinals || [];
  const activeOrdinal = activeMission()?.ordinal || ordinals[0] || 1;
  const color = state.active === 'all' && ordinals.length > 1 ? MULTI : COLORS[(activeOrdinal - 1) % COLORS.length];
  const label = state.active === 'all' ? `${ordinals.length > 1 ? ordinals.length : activeOrdinal}` : `${activeOrdinal}`;
  return window.L.divIcon({
    className: '',
    html: `<div class="mission-map-marker${flight.id === state.selected ? ' is-selected' : ''}" style="--mission-marker-color:${color}"><span>${escapeHtml(label)}</span></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });
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
  if (state.layer) map.removeLayer(state.layer);
  state.layer = null;
  state.markers = new Map();
  const flights = visibleFlights().filter((flight) => Number.isFinite(flight.lat) && Number.isFinite(flight.lon));
  const useClusters = flights.length >= MAP_CLUSTER_THRESHOLD && typeof window.L.markerClusterGroup === 'function';
  el.mapEmpty.hidden = flights.length > 0;
  el.mapEmpty.textContent = flights.length ? '' : 'No live matches are visible for the current mission filter.';
  if (!flights.length) {
    map.setView(VIEW.center, VIEW.zoom);
    return;
  }
  const markers = flights.map((flight) => {
    const marker = window.L.marker([flight.lat, flight.lon], {
      icon: markerIcon(flight),
      title: flight.callsign,
      missionOrdinals: flight.matchedMissionOrdinals || [],
    });
    marker.bindPopup(`<strong>${escapeHtml(flight.callsign)}</strong><br>${escapeHtml(flight.displayRouteLabel)}<br><a href="${escapeHtml(flight.fr24Url || '#')}" target="_blank" rel="noopener noreferrer">Open in FR24</a>`);
    marker.on('click', () => {
      state.selected = flight.id;
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
  if (state.selected && state.markers.has(state.selected)) {
    const marker = state.markers.get(state.selected);
    const focusSelectedMarker = () => {
      map.setView(marker.getLatLng(), Math.max(map.getZoom(), 5));
      marker.openPopup();
    };
    if (useClusters && typeof state.layer.zoomToShowLayer === 'function') {
      state.layer.zoomToShowLayer(marker, focusSelectedMarker);
      return;
    }
    focusSelectedMarker();
    return;
  }
  if (flights.length === 1) {
    map.setView([flights[0].lat, flights[0].lon], 6);
    return;
  }
  map.fitBounds(window.L.latLngBounds(flights.map((flight) => [flight.lat, flight.lon])).pad(0.16), { animate: false, maxZoom: 7 });
}

function renderHeader() {
  const stale = Date.now() - Date.parse(state.board.generatedAt || 0) > (Number(state.board.staleAfterSeconds) || 900) * 1000;
  const requestedDate = dateFromUrl();
  const source = sanitizeText(state.source?.label) || 'Shared mission board';
  const summary = [
    'All missions first, then pin one lane for exact FR24 finder values.',
    `Source: ${source}.`,
    requestedDate && requestedDate !== state.board.missionDate ? `Requested ${requestedDate}; showing ${state.board.missionDate}.` : '',
  ].filter(Boolean).join(' ');
  el.title.textContent = `${friendlyDate(state.board.missionDate)} Daily Missions`;
  el.summary.textContent = summary;
  el.updated.textContent = timeLabel(state.board.generatedAt);
  el.refresh.textContent = stale ? `Stale | ${countdownLabel(state.seconds)}` : countdownLabel(state.seconds);
  el.flights.textContent = formatNumber(state.board.rowCount || 0);
  el.source.textContent = sanitizeText(state.source?.role) ? `${source} | ${sanitizeText(state.source.role)}` : source;
  document.title = `${friendlyDate(state.board.missionDate)} Daily Missions | Skyviz`;
}

function renderBanner() {
  const stale = Date.now() - Date.parse(state.board?.generatedAt || 0) > (Number(state.board?.staleAfterSeconds) || 900) * 1000;
  const copy = state.message || (stale ? 'Mission feed is stale. You can keep exploring the latest published board while Skyviz waits for a fresh snapshot.' : '');
  el.banner.hidden = !copy;
  el.banner.textContent = copy;
  el.banner.dataset.tone = stale ? 'warning' : 'quiet';
}

function renderSelector() {
  const totalMissionMatches = (state.board.missions || []).reduce((sum, mission) => sum + mission.matchCount, 0);
  const allCard = `
    <button class="mission-selector-card mission-selector-card--all${state.active === 'all' ? ' is-active' : ''}" type="button" data-mission="all" aria-pressed="${state.active === 'all' ? 'true' : 'false'}">
      <span class="mission-selector-card-index">All missions</span>
      <strong class="mission-selector-card-title">Show the entire live mission board</strong>
      <span class="mission-selector-card-meta">${formatCompact(totalMissionMatches)} mission matches across ${formatNumber(state.board.rowCount || 0)} published flights</span>
    </button>`;
  el.selector.innerHTML = [
    allCard,
    ...state.board.missions.map((mission) => `
      <button class="mission-selector-card${mission.key === state.active ? ' is-active' : ''}" type="button" data-mission="${escapeHtml(mission.key)}" aria-pressed="${mission.key === state.active ? 'true' : 'false'}">
        <span class="mission-selector-card-index" style="--mission-accent:${COLORS[(mission.ordinal - 1) % COLORS.length]}">Mission ${mission.ordinal}</span>
        <strong class="mission-selector-card-title">${escapeHtml(mission.title)}</strong>
        <span class="mission-selector-card-meta">${mission.truncated ? `${formatNumber(mission.displayedMatchCount)} shown of ${formatCompact(mission.matchCount)}` : `${formatNumber(mission.matchCount)} live matches`}</span>
      </button>`),
  ].join('');
}

function renderIntel() {
  const missions = state.active === 'all' ? state.board.missions : [activeMission()].filter(Boolean);
  el.intel.innerHTML = missions.map((mission) => `
    <section class="mission-intel-card${state.active === 'all' ? ' is-compact' : ''}">
      <div class="mission-intel-head">
        <div>
          <p class="eyebrow">Mission ${mission.ordinal}</p>
          <h3>${escapeHtml(mission.title)}</h3>
        </div>
        <span class="mission-status-pill" style="--mission-accent:${COLORS[(mission.ordinal - 1) % COLORS.length]}">${mission.truncated ? `${formatNumber(mission.displayedMatchCount)} shown` : `${formatNumber(mission.matchCount)} live`}</span>
      </div>
      <div class="mission-finder-list">
        ${(mission.finder.sections || []).map((section) => `
          <article class="mission-finder-block">
            <div class="mission-finder-head">
              <div>
                <p class="mission-finder-kicker">Mission ${mission.ordinal}</p>
                <h4>${escapeHtml(section.label)}</h4>
              </div>
              <button class="mission-copy-button" type="button" data-copy="${escapeHtml(section.copyText)}" data-label="${escapeHtml(`${mission.title} ${section.label}`)}">Copy</button>
            </div>
            <code class="mission-finder-code">${escapeHtml(section.copyText)}</code>
          </article>`).join('')}
      </div>
      ${(mission.finder.notes || []).length
        ? `<ul class="mission-note-list">${mission.finder.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}</ul>`
        : '<p class="mission-muted-copy">Paste the copied values into the matching FR24 finder field.</p>'}
    </section>`).join('');
}

function updateScopeChrome(flights) {
  const mission = activeMission();
  const accent = activeMissionAccent();
  const scopeLabel = mission ? `Mission ${mission.ordinal}` : 'All missions';
  const scopeTitle = mission?.title || 'All missions';
  const scopeMeta = mission
    ? `${scopeTitle} | ${formatNumber(flights.length)} flights visible`
    : `${formatNumber(flights.length)} visible flights across ${formatNumber(state.board.missions.length)} missions`;
  if (el.mapScope) {
    el.mapScope.textContent = scopeLabel;
    el.mapScope.dataset.tone = mission ? 'mission' : 'all';
    el.mapScope.style.setProperty('--mission-accent', accent);
  }
  if (el.mapScopeMeta) {
    el.mapScopeMeta.textContent = scopeMeta;
  }
  if (el.mapOverlay) {
    el.mapOverlay.style.setProperty('--mission-accent', accent);
  }
  if (el.mapOverlayTitle) {
    el.mapOverlayTitle.textContent = scopeTitle;
  }
  if (el.mapOverlayMeta) {
    el.mapOverlayMeta.textContent = mission
      ? `${formatNumber(flights.length)} visible flights for this lane`
      : `${formatNumber(flights.length)} visible flights across the full mission board`;
  }
  el.toolbar.textContent = scopeMeta;
}

function renderList() {
  const flights = visibleFlights();
  if (!flights.some((flight) => flight.id === state.selected)) state.selected = flights[0]?.id || '';
  updateScopeChrome(flights);
  el.listMeta.textContent = flights.length ? `${formatNumber(flights.length)} flights in the current board view` : 'No flights match the current search and mission filters.';
  el.list.innerHTML = flights.length ? flights.map((flight) => {
    const badges = (flight.matchedMissionOrdinals || []).map((ordinalValue) => `<span class="mission-flight-badge" style="--mission-accent:${COLORS[(ordinalValue - 1) % COLORS.length]}">M${ordinalValue}</span>`).join('');
    const aircraft = [flight.manufacturer, flight.modelName].filter(Boolean).join(' ') || flight.typeCode || 'Unknown aircraft';
    const metrics = [
      { value: Number.isFinite(flight.speed) ? `${Math.round(flight.speed)} kt` : 'Speed n/a', neutral: !Number.isFinite(flight.speed) },
      { value: Number.isFinite(flight.altitude) ? `${formatNumber(Math.round(flight.altitude))} ft` : 'Altitude n/a', neutral: !Number.isFinite(flight.altitude) },
      { value: Number.isFinite(flight.distanceKm) ? `${formatNumber(Math.round(flight.distanceKm))} km` : 'Route n/a', neutral: !Number.isFinite(flight.distanceKm) },
      { value: ageLabel(flight.lastSeenAt), neutral: false },
    ];
    return `
      <article class="mission-flight-row${flight.id === state.selected ? ' is-selected' : ''}" data-flight-id="${escapeHtml(flight.id)}">
        <button class="mission-flight-focus" type="button" data-flight="${escapeHtml(flight.id)}" aria-pressed="${flight.id === state.selected ? 'true' : 'false'}">
          <div class="mission-flight-topline">
            <div class="mission-flight-title-wrap">
              <h3>${escapeHtml(flight.callsign)}</h3>
              <p>${escapeHtml(aircraft)}</p>
            </div>
            <div class="mission-flight-badges">${badges}</div>
          </div>
          <div class="mission-flight-route">
            <span>${escapeHtml(flight.displayRouteLabel)}</span>
            <span>${escapeHtml(flight.registration || flight.typeCode || 'Registration n/a')}</span>
          </div>
          <div class="mission-flight-meta-grid">
            ${metrics.map((metric) => `<span class="mission-flight-metric${metric.neutral ? ' mission-flight-metric--neutral' : ''}">${escapeHtml(metric.value)}</span>`).join('')}
          </div>
        </button>
        <div class="mission-flight-actions"><a class="mission-flight-link" href="${escapeHtml(flight.fr24Url || '#')}" target="_blank" rel="noopener noreferrer">Open in FR24</a></div>
      </article>`;
  }).join('') : '<div class="mission-empty-state">No live matches right now. Try another mission or clear the search.</div>';
}

function render() {
  renderHeader();
  renderBanner();
  renderSelector();
  renderIntel();
  renderList();
  renderMap();
  const url = new URL(window.location.href);
  url.searchParams.set('date', state.board.missionDate || '');
  url.searchParams.set('mission', state.active || 'all');
  window.history.replaceState({}, '', url);
}

async function load(silent = false) {
  if (state.loadPromise) {
    return state.loadPromise;
  }
  state.loadPromise = (async () => {
    const live = await fetchDailyMissionsSnapshotData();
    state.board = normalizeBoard(live.payload, live.source);
    state.source = live.source;
    const requestedMission = missionFromUrl();
    state.active = state.board.missionMap.has(requestedMission)
      ? requestedMission
      : (requestedMission === 'all' ? 'all' : (state.active === 'all' || state.board.missionMap.has(state.active) ? state.active : 'all'));
    if (!silent) {
      state.message = live.source?.fallbackUsed ? 'Local daily-missions fixture was unavailable, so Skyviz fell back to the shared live board.' : '';
    }
    state.seconds = Math.max(0, Math.ceil(((Date.parse(state.board.generatedAt || 0) + ((Number(state.board.publishIntervalSeconds) || 300) * 1000)) - Date.now()) / 1000));
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

el.refreshButton?.addEventListener('click', () => load());
el.search?.addEventListener('input', () => {
  state.query = sanitizeText(el.search.value);
  renderList();
  renderMap();
});
el.sort?.addEventListener('change', () => {
  state.sort = sanitizeText(el.sort.value) || 'freshest';
  renderList();
  renderMap();
});
el.selector?.addEventListener('click', (event) => {
  const button = event.target instanceof Element ? event.target.closest('button[data-mission]') : null;
  if (!button) return;
  state.active = sanitizeText(button.getAttribute('data-mission')) || 'all';
  state.selected = '';
  render();
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
  renderList();
  renderMap();
});

state.timer = window.setInterval(() => {
  if (!state.board) return;
  state.seconds = Math.max(0, state.seconds - 1);
  renderHeader();
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
