import { renderBarList } from './charts.js';
import {
  buildDashboardModel,
  loadAirportGameData,
  loadAirportGameManifest,
  loadCardleReferenceData,
  loadReferenceData,
  loadReferenceManifest,
  parseUserCollection,
} from './data.js';
import {
  DAILY_GAME_NAME,
  buildAirportGuessComparison,
  buildAirportHints,
  buildAirportOptionLabel,
  buildAirportSuggestions,
  buildDailyShareText,
  buildDailyStats,
  formatCountdown,
  getDailyChallengeProfile,
  getDailyHintUnlockThresholds,
  getNextUtcResetTime,
  getUtcDayKey,
  parseDailyHistory,
  resolveAirportGuess,
  selectDailyAirport,
  serializeDailyHistory,
} from './daily.js';
import {
  CARDLE_GAME_NAME,
  CARDLE_HASH,
  CARDLE_MAP_REVEAL_GUESS,
  CARDLE_MAX_GUESSES,
  CARDLE_MODEL_REVEAL_GUESS,
  CARDLE_TILE_SPECS,
  buildCardleDataset,
  buildCardleGuessComparison,
  buildCardleHotspotUrl,
  buildCardleModelCandidates,
  buildCardleOptionLabel,
  buildCardleShareText,
  buildCardleSuggestions,
  normalizeCardleHotspotPayload,
  resolveCardleGuess,
  selectDailyCardModel,
} from './cardle.js';
import { escapeHtml, formatCompact, formatDateFromMillis, formatLabel, formatNumber, formatPercent, sanitizeText } from './format.js';

const elements = {
  bootLoader: document.querySelector('#boot-loader'),
  bootStatus: document.querySelector('#boot-status'),
  landingView: document.querySelector('#landing-view'),
  fileInput: document.querySelector('#file-input'),
  dropzone: document.querySelector('#dropzone'),
  viewExampleButton: document.querySelector('#view-example'),
  dailyLaunchButton: document.querySelector('#navdle-launch'),
  dailyLandingSummary: document.querySelector('#navdle-landing-summary'),
  dailyLandingStats: document.querySelector('#navdle-landing-stats'),
  dailyLandingTeaser: document.querySelector('#navdle-landing-teaser'),
  cardleLaunchButton: document.querySelector('#cardle-launch'),
  cardleLandingSummary: document.querySelector('#cardle-landing-summary'),
  cardleLandingStats: document.querySelector('#cardle-landing-stats'),
  cardleLandingTeaser: document.querySelector('#cardle-landing-teaser'),
  persistUpload: document.querySelector('#persist-upload'),
  uploadStatus: document.querySelector('#upload-status'),
  referenceStatus: document.querySelector('#reference-status'),
  banner: document.querySelector('#message-banner'),
  dashboard: document.querySelector('#dashboard'),
  cardleTabButton: document.querySelector('#tab-cardle-button'),
  mapTabButton: document.querySelector('#tab-map-button'),
  aircraftTabButton: document.querySelector('#tab-aircraft-button'),
  dailyTabButton: document.querySelector('#tab-navdle-button'),
  dataToolsTrigger: document.querySelector('#data-tools-trigger'),
  dataToolsMenu: document.querySelector('#data-tools-menu'),
  dataToolsPersistUpload: document.querySelector('#data-tools-persist-upload'),
  dataToolsPersistStatus: document.querySelector('#data-tools-persist-status'),
  dataToolsPersistSummary: document.querySelector('#data-tools-persist-summary'),
  dataToolsCollectionSummary: document.querySelector('#data-tools-collection-summary'),
  dataToolsUpload: document.querySelector('#data-tools-upload'),
  dataToolsClear: document.querySelector('#data-tools-clear'),
  mapTabPanel: document.querySelector('#tab-map'),
  aircraftTabPanel: document.querySelector('#tab-aircraft'),
  dailyTabPanel: document.querySelector('#navdle'),
  cardleTabPanel: document.querySelector('#cardle'),
  mapSide: document.querySelector('#map-side'),
  mapCanvas: document.querySelector('#map-canvas'),
  mapLegend: document.querySelector('#map-legend'),
  mapAirportKpi: document.querySelector('#map-airport-kpi'),
  mapDrillPanel: document.querySelector('#map-drill-panel'),
  mapDrillEyebrow: document.querySelector('#map-drill-eyebrow'),
  mapDrillTitle: document.querySelector('#map-drill-title'),
  mapDrillHelper: document.querySelector('#map-drill-helper'),
  mapDrillNav: document.querySelector('#map-drill-nav'),
  mapDrillKpi: document.querySelector('#map-drill-kpi'),
  mapDrillSearch: document.querySelector('#map-drill-search'),
  mapDrillSort: document.querySelector('#map-drill-sort'),
  mapDrillSortDirection: document.querySelector('#map-drill-sort-direction'),
  mapDrillProgressMeta: document.querySelector('#map-drill-progress-meta'),
  mapDrillProgress: document.querySelector('#map-drill-progress'),
  aircraftOverviewPanel: document.querySelector('#aircraft-overview-panel'),
  aircraftTierXpPanel: document.querySelector('#aircraft-tier-xp-panel'),
  aircraftTierGlowPanel: document.querySelector('#aircraft-tier-glow-panel'),
  aircraftTypeProgressPanel: document.querySelector('#aircraft-type-progress-panel'),
  aircraftCategoryProgressPanel: document.querySelector('#aircraft-category-progress-panel'),
  aircraftTierCompletionPanel: document.querySelector('#aircraft-tier-completion-panel'),
  aircraftImagePlaceholderPanel: document.querySelector('#aircraft-image-placeholder-panel'),
  aircraftRegPlaceholderPanel: document.querySelector('#aircraft-reg-placeholder-panel'),
  aircraftSide: document.querySelector('#aircraft-side'),
  aircraftSearch: document.querySelector('#aircraft-search'),
  aircraftSort: document.querySelector('#aircraft-sort'),
  aircraftSortDirection: document.querySelector('#aircraft-sort-direction'),
  aircraftDeckMetrics: document.querySelector('#aircraft-deck-metrics'),
  aircraftListMeta: document.querySelector('#aircraft-list-meta'),
  aircraftList: document.querySelector('#aircraft-list'),
  aircraftRegTransparencyModal: document.querySelector('#aircraft-reg-transparency-modal'),
  aircraftRegTransparencyBackdrop: document.querySelector('#aircraft-reg-transparency-backdrop'),
  aircraftRegTransparencyClose: document.querySelector('#aircraft-reg-transparency-close'),
  aircraftRegTransparencySummary: document.querySelector('#aircraft-reg-transparency-summary'),
  aircraftRegTransparencySearch: document.querySelector('#aircraft-reg-transparency-search'),
  aircraftRegTransparencyFilter: document.querySelector('#aircraft-reg-transparency-filter'),
  aircraftRegModelOptions: document.querySelector('#aircraft-reg-model-options'),
  aircraftRegManualStorageMeta: document.querySelector('#aircraft-reg-manual-storage-meta'),
  aircraftRegManualExport: document.querySelector('#aircraft-reg-manual-export'),
  aircraftRegManualImportTrigger: document.querySelector('#aircraft-reg-manual-import-trigger'),
  aircraftRegManualImportInput: document.querySelector('#aircraft-reg-manual-import-input'),
  aircraftRegManualClear: document.querySelector('#aircraft-reg-manual-clear'),
  aircraftRegTransparencyMeta: document.querySelector('#aircraft-reg-transparency-meta'),
  aircraftRegTransparencyRows: document.querySelector('#aircraft-reg-transparency-rows'),
  aircraftRegTransparencyPrev: document.querySelector('#aircraft-reg-transparency-prev'),
  aircraftRegTransparencyNext: document.querySelector('#aircraft-reg-transparency-next'),
  aircraftRegTransparencyPageLabel: document.querySelector('#aircraft-reg-transparency-page-label'),
  aircraftModelRegsModal: document.querySelector('#aircraft-model-regs-modal'),
  aircraftModelRegsBackdrop: document.querySelector('#aircraft-model-regs-backdrop'),
  aircraftModelRegsClose: document.querySelector('#aircraft-model-regs-close'),
  aircraftModelRegsTitle: document.querySelector('#aircraft-model-regs-title'),
  aircraftModelRegsSummary: document.querySelector('#aircraft-model-regs-summary'),
  aircraftModelRegsBreakdown: document.querySelector('#aircraft-model-regs-breakdown'),
  aircraftModelRegsMeta: document.querySelector('#aircraft-model-regs-meta'),
  aircraftModelRegsRows: document.querySelector('#aircraft-model-regs-rows'),
  aircraftModelRegsPrev: document.querySelector('#aircraft-model-regs-prev'),
  aircraftModelRegsNext: document.querySelector('#aircraft-model-regs-next'),
  aircraftModelRegsPageLabel: document.querySelector('#aircraft-model-regs-page-label'),
  aircraftDetailModal: document.querySelector('#aircraft-detail-modal'),
  aircraftDetailBackdrop: document.querySelector('#aircraft-detail-backdrop'),
  aircraftDetailClose: document.querySelector('#aircraft-detail-close'),
  aircraftDetailTitle: document.querySelector('#aircraft-detail-title'),
  aircraftDetailSubtitle: document.querySelector('#aircraft-detail-subtitle'),
  aircraftDetailMediaHeading: document.querySelector('#aircraft-detail-media-heading'),
  aircraftDetailMediaNote: document.querySelector('#aircraft-detail-media-note'),
  aircraftDetailMediaStage: document.querySelector('#aircraft-detail-media-stage'),
  aircraftDetailMediaOptions: document.querySelector('#aircraft-detail-media-options'),
  aircraftDetailOpenRegs: document.querySelector('#aircraft-detail-open-regs'),
  aircraftDetailKpis: document.querySelector('#aircraft-detail-kpis'),
  aircraftDetailMetaSections: document.querySelector('#aircraft-detail-meta-sections'),
  dailyTitle: document.querySelector('#daily-title'),
  dailyHeroSummary: document.querySelector('#daily-hero-summary'),
  dailyMetaGrid: document.querySelector('#daily-meta-grid'),
  dailyCommandDeck: document.querySelector('.daily-command-deck'),
  dailyGuessForm: document.querySelector('#daily-guess-form'),
  dailyGuessInput: document.querySelector('#daily-guess-input'),
  dailySuggestionList: document.querySelector('#daily-suggestion-list'),
  dailyFeedback: document.querySelector('#daily-feedback'),
  dailyBriefing: document.querySelector('#daily-briefing'),
  dailyIntel: document.querySelector('#daily-intel'),
  dailyBoardMeta: document.querySelector('#daily-board-meta'),
  dailyBoard: document.querySelector('#daily-board'),
  cardleTitle: document.querySelector('#cardle-title'),
  cardleHeroSummary: document.querySelector('#cardle-hero-summary'),
  cardleMetaGrid: document.querySelector('#cardle-meta-grid'),
  cardleCommandDeck: document.querySelector('.cardle-command-deck'),
  cardleGuessForm: document.querySelector('#cardle-guess-form'),
  cardleGuessInput: document.querySelector('#cardle-guess-input'),
  cardleSuggestionList: document.querySelector('#cardle-suggestion-list'),
  cardleFeedback: document.querySelector('#cardle-feedback'),
  cardleBriefing: document.querySelector('#cardle-briefing'),
  cardleIntelPanel: document.querySelector('#cardle-intel-panel'),
  cardleBoardMeta: document.querySelector('#cardle-board-meta'),
  cardleBoard: document.querySelector('#cardle-board'),
};

const AIRCRAFT_CARD_HEIGHT_MOBILE = 428;
const AIRCRAFT_CARD_HEIGHT_TABLET_PLUS = 416;
const AIRCRAFT_GRID_GAP = 14;
const AIRCRAFT_GRID_PADDING = 14;
const AIRCRAFT_MIN_CARD_WIDTH = 244;
const AIRCRAFT_VIRTUAL_OVERSCAN_ROWS = 2;
const AIRCRAFT_IMAGE_BASE_URL = 'https://cdn.skycards.oldapes.com/assets/models/images/1';
const AIRCRAFT_MODEL_BASE_URL = 'https://cdn.skycards.oldapes.com/assets/models/optimized';
const AIRCRAFT_DETAIL_CAMERA_ORBIT = '0deg 75deg 115%';
const AIRCRAFT_IMAGE_TIERS = ['paper', 'bronze', 'silver', 'gold', 'platinum', 'cyber'];
const AIRCRAFT_XP_TIERS = new Set([...AIRCRAFT_IMAGE_TIERS, 'unknown']);
const AIRCRAFT_IMAGE_SIZE_ORDER = ['md'];
const PERSISTED_UPLOAD_KEY = 'skyviz.persistedUpload.v1';
const PERSIST_PREFERENCE_KEY = 'skyviz.persistUploadPreference.v1';
const MANUAL_REGISTRATION_MAPPINGS_KEY = 'skyviz.manualRegistrationMappings.v1';
const MANUAL_REGISTRATION_MAPPINGS_EXPORT_SCHEMA = 'skyviz.manualRegistrationMappings.v1';
const DAILY_GAME_HISTORY_KEY = 'skyviz.dailyAirportHistory.v1';
const CARDLE_GAME_HISTORY_KEY = 'skyviz.dailyCardleHistory.v1';
const DAILY_GAME_HASH = '#navdle';
const CARDLE_GAME_HASH = CARDLE_HASH;
const LEGACY_DAILY_GAME_HASHES = new Set(['#tab-daily']);
const EXAMPLE_DECK_PATH = './data/example/try_now_user.json';
const COMPLETION_SORT_CATEGORIES = new Set(['percent', 'total', 'captured', 'name']);
const COMPLETION_SORT_DIRECTIONS = new Set(['asc', 'desc']);
const LEAFLET_TILE_URL = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
const LEAFLET_TILE_ATTRIBUTION = '&copy; OpenStreetMap contributors &copy; CARTO';
const MAP_BASE_VIEW = Object.freeze({ center: [16, 0], zoom: 2 });
const CARDLE_MAP_BASE_VIEW = Object.freeze({ center: [18, 0], zoom: 1.75 });
const CARDLE_MAP_MAX_ZOOM = 6;
const CARDLE_MAP_SINGLE_POINT_ZOOM = 4.25;
const MAP_MARKER_SCALE_PER_ZOOM = 0.24;
const MAP_MAX_MARKER_RADIUS = 10.5;
const MAP_HIGHLIGHT_EXTRA_RADIUS = 1.8;
const MAP_CODE_LABEL_MIN_ZOOM = 6;
const MAP_CODE_LABEL_MAX_COUNT = 140;
const MAP_DRILL_LEVELS = Object.freeze(['continent', 'country', 'us-state']);
const REGION_CODE_PREVIEW_LIMIT = 56;
const REGISTRATION_MODAL_PAGE_SIZE = 120;
const MODEL_REGISTRATION_MODAL_PAGE_SIZE = 120;
const COMPASS_LABELS = Object.freeze(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']);
const COMPASS_ARROWS = Object.freeze({
  N: '\u2191',
  NE: '\u2197',
  E: '\u2192',
  SE: '\u2198',
  S: '\u2193',
  SW: '\u2199',
  W: '\u2190',
  NW: '\u2196',
});
const DAILY_TONE_ORDER = Object.freeze({
  miss: 0,
  near: 1,
  hit: 2,
});
const CARDLE_TONE_ORDER = Object.freeze({
  miss: 0,
  near: 1,
  hit: 2,
});
const DAILY_PROFILE_RANKS = Object.freeze({
  small: 0,
  medium: 1,
  large: 2,
});
const CARDLE_ENGINE_TYPE_LABELS = Object.freeze({
  J: 'Jet',
  P: 'Piston',
  T: 'Turboprop',
  E: 'Electric',
  R: 'Rocket',
  _: 'Other',
});
const CARDLE_TYPE_LABELS = Object.freeze({
  L: 'Landplane',
  H: 'Helicopter',
  A: 'Amphibious',
  G: 'Gyro / Rotorcraft',
  T: 'Tiltrotor',
  _: 'Specialty',
  unknown: 'Unknown',
});
const DAILY_TILE_HELP = Object.freeze({
  profile: {
    meaning: 'Airport profile combines the field size and airport type.',
    examples: 'Large airport often means a major scheduled field. Small airport can mean a local or general-aviation field.',
  },
  continent: {
    meaning: 'Continent compares the airport\'s broad world region.',
    examples: 'North America, Europe, and Asia are exact continent matches when they line up.',
  },
  country: {
    meaning: 'Country compares the airport\'s national boundary.',
    examples: 'A near result usually means the guess is on the right continent but in the wrong country.',
  },
  region: {
    meaning: 'Region compares the airport\'s state, province, or equivalent local area.',
    examples: 'For the United States this is usually the state. Other countries may use provinces or similar subdivisions.',
  },
  elevation: {
    meaning: 'Elevation compares field altitude above sea level.',
    examples: 'An up arrow means the target sits higher. A down arrow means it sits lower.',
  },
  runways: {
    meaning: 'Runways compares the number of listed runways at the field.',
    examples: 'A large hub may have many runways. A smaller field may only have one or two.',
  },
  'longest-runway': {
    meaning: 'Longest runway compares the airport\'s longest listed runway length.',
    examples: 'Longer runways usually support heavier or longer-range traffic.',
  },
  navaids: {
    meaning: 'Navaids compares listed radio-navigation aids connected to the airport area.',
    examples: 'Examples include VOR, DME, NDB, TACAN, or VORTAC.',
  },
  layout: {
    meaning: 'Layout compares runway geometry rather than runway count.',
    examples: 'Examples include single, parallel, intersecting, or mixed runway layouts.',
  },
  distance: {
    meaning: 'Distance shows how far your guess is from today\'s airport and the arrow points toward the target.',
    examples: 'If the card says 500 km with a northeast arrow, the target is 500 km to the northeast of your guess.',
  },
});
const DAILY_TRACKER_TILE_SPECS = Object.freeze([
  { key: 'profile', label: 'Profile' },
  { key: 'continent', label: 'Continent' },
  { key: 'country', label: 'Country' },
  { key: 'region', label: 'Region' },
  { key: 'elevation', label: 'Elevation' },
  { key: 'runways', label: 'Runways' },
  { key: 'longest-runway', label: 'Longest runway' },
  { key: 'navaids', label: 'Navaids' },
  { key: 'layout', label: 'Layout' },
  { key: 'distance', label: 'Distance' },
]);
const REGISTRATION_MODAL_FILTERS = new Set(['all', 'manual', 'high', 'medium', 'ambiguous', 'low']);
const REGISTRATION_MODAL_CONFIDENCE_LABELS = {
  manual: 'Manual override',
  high: 'High',
  medium: 'Medium',
  ambiguous: 'Ambiguous',
  low: 'Low',
};
const REGISTRATION_MODAL_STATUS_LABELS = {
  mapped: 'Mapped',
  inferred_high_confidence: 'Inferred high confidence',
  inferred_medium_confidence: 'Inferred medium confidence',
  ambiguous: 'Ambiguous',
  unresolved: 'Unresolved',
  unmapped: 'Unmapped',
};
const MAP_REGION_MAX_ZOOM = Object.freeze({
  continent: 5,
  country: 7,
  'us-state': 7,
});

const state = {
  model: null,
  references: null,
  manualRegistrationMappings: new Map(),
  activeTab: 'map',
  map: {
    instance: null,
    renderer: null,
    capturedLayer: null,
    missingLayer: null,
    highlightLayer: null,
    codeLabelLayer: null,
    markerEntries: [],
    highlightMarkerEntries: [],
    regionPointIndex: null,
    regionPointIndexModel: null,
    selectedRegion: null,
    expandedRegion: null,
    drillLevel: 'continent',
    drillContinentKey: '',
    drillCountryKey: '',
    pendingDrillTransition: 'none',
    continentQuery: '',
    continentSort: 'total_desc',
    countryQuery: '',
    countrySort: 'total_desc',
    usStateQuery: '',
    usStateSort: 'total_desc',
  },
  aircraft: {
    query: '',
    sortBy: 'xp',
    sortDirection: 'desc',
    focusType: null,
    focusCategory: null,
    focusTier: null,
    expandedFocus: null,
    focusDetailIndex: null,
    focusDetailIndexModel: null,
    visibleRows: [],
    renderSignature: '',
    lastRenderedRowsRef: null,
    renderQueued: false,
  },
  upload: {
    fileName: '',
    text: '',
  },
  daily: {
    manifest: null,
    dataset: null,
    dayKey: '',
    challenge: null,
    error: '',
    query: '',
    feedback: '',
    feedbackTone: 'muted',
    suggestions: [],
    selectedSuggestionIndex: -1,
    pendingAnimatedGuessId: '',
    pendingVictoryDayKey: '',
    pendingStatCelebrateKeys: [],
    copyStatus: '',
    history: { days: {} },
    countdownTimer: null,
  },
  cardle: {
    dataset: null,
    dayKey: '',
    challenge: null,
    error: '',
    query: '',
    feedback: '',
    feedbackTone: 'muted',
    suggestions: [],
    selectedSuggestionIndex: -1,
    pendingAnimatedGuessId: '',
    pendingVictoryDayKey: '',
    pendingStatCelebrateKeys: [],
    copyStatus: '',
    history: { days: {} },
    hotspot: {
      modelId: '',
      loading: false,
      error: '',
      data: null,
    },
    modelStage: {
      modelId: '',
      loading: false,
      available: null,
      error: '',
      resolvedUrl: '',
    },
    map: {
      instance: null,
      markerLayer: null,
      modelId: '',
    },
  },
  ui: {
    dataToolsOpen: false,
    bannerDismissTimer: null,
    registrationModalOpen: false,
    registrationModalQuery: '',
    registrationModalConfidence: 'all',
    registrationModalPage: 1,
    registrationManualEditKey: '',
    registrationManualEditModelId: '',
    registrationModelOptionsSignature: '',
    modelRegsModalOpen: false,
    modelRegsModalModelId: null,
    modelRegsModalFocusModelId: null,
    modelRegsModalPage: 1,
    aircraftDetailModalOpen: false,
    aircraftDetailModelId: null,
    aircraftDetailFocusModelId: null,
    aircraftDetailMediaKey: '',
    pendingDailyInputFocus: false,
    pendingCardleInputFocus: false,
  },
};

function toRadians(value) {
  const numericValue = Number.isFinite(Number(value)) ? Number(value) : 0;
  return (numericValue * Math.PI) / 180;
}

function getAirportBearing(from, to) {
  const fromLatitude = toRadians(from?.latitude || 0);
  const toLatitude = toRadians(to?.latitude || 0);
  const deltaLongitude = toRadians((to?.longitude || 0) - (from?.longitude || 0));
  const y = Math.sin(deltaLongitude) * Math.cos(toLatitude);
  const x = Math.cos(fromLatitude) * Math.sin(toLatitude)
    - Math.sin(fromLatitude) * Math.cos(toLatitude) * Math.cos(deltaLongitude);
  return (Math.atan2(y, x) * 180) / Math.PI + 360;
}

function describeAirportDirection(from, to) {
  const normalizedBearing = getAirportBearing(from, to) % 360;
  const sectorIndex = Math.round(normalizedBearing / 45) % COMPASS_LABELS.length;
  const label = COMPASS_LABELS[sectorIndex] || '';
  return {
    label,
    arrow: COMPASS_ARROWS[label] || '',
  };
}

function getCompassSectorDistance(leftLabel, rightLabel) {
  const leftIndex = COMPASS_LABELS.indexOf(leftLabel);
  const rightIndex = COMPASS_LABELS.indexOf(rightLabel);
  if (leftIndex === -1 || rightIndex === -1) {
    return 0;
  }
  const rawDistance = Math.abs(leftIndex - rightIndex);
  return Math.min(rawDistance, COMPASS_LABELS.length - rawDistance);
}

function clearBannerTimer() {
  if (!state.ui.bannerDismissTimer) {
    return;
  }
  window.clearTimeout(state.ui.bannerDismissTimer);
  state.ui.bannerDismissTimer = null;
}

function dismissBanner() {
  clearBannerTimer();
  elements.banner.className = 'message-banner is-hidden';
  elements.banner.textContent = '';
}

function setBanner(message, tone = 'info', options = {}) {
  clearBannerTimer();
  if (!message) {
    dismissBanner();
    return;
  }
  const autoDismissMs = Number(options.autoDismissMs) > 0 ? Number(options.autoDismissMs) : 0;
  elements.banner.className = `message-banner is-${tone}`;
  if (autoDismissMs > 0) {
    elements.banner.classList.add('has-countdown');
    elements.banner.style.setProperty('--dismiss-ms', `${autoDismissMs}ms`);
  } else {
    elements.banner.classList.remove('has-countdown');
    elements.banner.style.removeProperty('--dismiss-ms');
  }
  elements.banner.innerHTML = `
    <div class="message-banner-head">
      <span class="message-banner-copy">${escapeHtml(message)}</span>
      <button class="message-banner-close" type="button" data-dismiss-banner aria-label="Dismiss message">x</button>
    </div>
    <div class="message-banner-progress" aria-hidden="true">
      <span class="message-banner-progress-fill"></span>
    </div>
  `;
  if (autoDismissMs > 0) {
    state.ui.bannerDismissTimer = window.setTimeout(() => {
      dismissBanner();
    }, autoDismissMs);
  }
}

function setUploadStatus(message) {
  if (!elements.uploadStatus) {
    return;
  }
  elements.uploadStatus.textContent = message;
}

function setReferenceStatus(message, tone = 'quiet') {
  if (!elements.referenceStatus) {
    return;
  }
  elements.referenceStatus.className = `status-line is-${tone}`;
  elements.referenceStatus.textContent = message;
}

function setBootState(isVisible, statusMessage = '') {
  elements.bootLoader.hidden = !isVisible;
  document.body.classList.toggle('is-booting', Boolean(isVisible));
  if (statusMessage) {
    elements.bootStatus.textContent = statusMessage;
  }
  if (isVisible) {
    window.scrollTo(0, 0);
  }
}

function readStoredHistory(storageKey) {
  try {
    return parseDailyHistory(window.localStorage.getItem(storageKey));
  } catch {
    return { days: {} };
  }
}

function writeStoredHistory(storageKey, history) {
  try {
    window.localStorage.setItem(storageKey, serializeDailyHistory(history));
    return true;
  } catch {
    return false;
  }
}

function readDailyHistory() {
  return readStoredHistory(DAILY_GAME_HISTORY_KEY);
}

function writeDailyHistory() {
  return writeStoredHistory(DAILY_GAME_HISTORY_KEY, state.daily.history);
}

function readCardleHistory() {
  return readStoredHistory(CARDLE_GAME_HISTORY_KEY);
}

function writeCardleHistory() {
  return writeStoredHistory(CARDLE_GAME_HISTORY_KEY, state.cardle.history);
}

function getDailySession(dayKey = state.daily.dayKey || getUtcDayKey()) {
  const source = state.daily.history?.days?.[dayKey];
  const hintRevealCount = Number.isFinite(Number(source?.hintRevealCount))
    ? Math.max(0, Math.floor(Number(source.hintRevealCount)))
    : source?.hintRevealed
      ? 1
      : 0;
  return {
    guesses: Array.isArray(source?.guesses) ? source.guesses.filter(Boolean) : [],
    status: source?.status === 'won' || source?.status === 'lost' ? source.status : 'in_progress',
    hintRevealCount,
    hintRevealed: hintRevealCount > 0,
    completedAt: typeof source?.completedAt === 'string' ? source.completedAt : '',
  };
}

function updateDailySession(dayKey, nextSession) {
  const hintRevealCount = Number.isFinite(Number(nextSession?.hintRevealCount))
    ? Math.max(0, Math.floor(Number(nextSession.hintRevealCount)))
    : nextSession?.hintRevealed
      ? 1
      : 0;
  state.daily.history.days[dayKey] = {
    guesses: Array.isArray(nextSession?.guesses) ? nextSession.guesses.filter(Boolean) : [],
    status: nextSession?.status === 'won' || nextSession?.status === 'lost' ? nextSession.status : 'in_progress',
    hintRevealCount,
    hintRevealed: hintRevealCount > 0,
    completedAt: typeof nextSession?.completedAt === 'string' ? nextSession.completedAt : '',
  };
  writeDailyHistory();
}

function getCardleSession(dayKey = state.cardle.dayKey || getUtcDayKey()) {
  const source = state.cardle.history?.days?.[dayKey];
  const hintRevealCount = Number.isFinite(Number(source?.hintRevealCount))
    ? Math.max(0, Math.floor(Number(source.hintRevealCount)))
    : source?.hintRevealed
      ? 1
      : 0;
  return {
    guesses: Array.isArray(source?.guesses) ? source.guesses.filter(Boolean) : [],
    status: source?.status === 'won' || source?.status === 'lost' ? source.status : 'in_progress',
    hintRevealCount,
    hintRevealed: hintRevealCount > 0,
    completedAt: typeof source?.completedAt === 'string' ? source.completedAt : '',
  };
}

function updateCardleSession(dayKey, nextSession) {
  const hintRevealCount = Number.isFinite(Number(nextSession?.hintRevealCount))
    ? Math.max(0, Math.floor(Number(nextSession.hintRevealCount)))
    : nextSession?.hintRevealed
      ? 1
      : 0;
  state.cardle.history.days[dayKey] = {
    guesses: Array.isArray(nextSession?.guesses) ? nextSession.guesses.filter(Boolean) : [],
    status: nextSession?.status === 'won' || nextSession?.status === 'lost' ? nextSession.status : 'in_progress',
    hintRevealCount,
    hintRevealed: hintRevealCount > 0,
    completedAt: typeof nextSession?.completedAt === 'string' ? nextSession.completedAt : '',
  };
  writeCardleHistory();
}

function clearDailyCountdownTimer() {
  if (!state.daily.countdownTimer) {
    return;
  }
  window.clearInterval(state.daily.countdownTimer);
  state.daily.countdownTimer = null;
}

function focusDailyGuessInput() {
  if (state.activeTab !== 'navdle' || elements.dashboard.hidden || elements.dailyGuessInput.disabled) {
    state.ui.pendingDailyInputFocus = false;
    return;
  }
  state.ui.pendingDailyInputFocus = false;
  requestAnimationFrame(() => {
    elements.dailyGuessInput.focus();
    elements.dailyGuessInput.select();
  });
}

function focusCardleGuessInput() {
  if (state.activeTab !== 'cardle' || elements.dashboard.hidden || elements.cardleGuessInput.disabled) {
    state.ui.pendingCardleInputFocus = false;
    return;
  }
  state.ui.pendingCardleInputFocus = false;
  requestAnimationFrame(() => {
    elements.cardleGuessInput.focus();
    elements.cardleGuessInput.select();
  });
}

function syncDashboardTabAvailability() {
  const hasCollection = Boolean(state.model);
  [elements.mapTabButton, elements.aircraftTabButton].forEach((button) => {
    button.disabled = !hasCollection;
    button.classList.toggle('is-disabled', !hasCollection);
    button.setAttribute('aria-disabled', String(!hasCollection));
  });
}

function setDailyFeedback(message, tone = 'muted') {
  state.daily.feedback = message;
  state.daily.feedbackTone = tone;
}

function buildDailyLandingChipHtml(label, value, quiet = false) {
  const classes = quiet ? 'landing-daily-chip is-quiet' : 'landing-daily-chip';
  return `<span class="${classes}">${escapeHtml(label)}: ${escapeHtml(value)}</span>`;
}

function renderDailyLandingCta() {
  const todayKey = getUtcDayKey();
  const todaySession = getDailySession(todayKey);
  const stats = buildDailyStats(state.daily.history);
  const countdown = formatCountdown(getNextUtcResetTime().getTime() - Date.now());
  const statsHtml = [
    buildDailyLandingChipHtml('Streak', `${formatNumber(stats.currentStreak)}`),
    buildDailyLandingChipHtml('Reset', countdown),
  ].join('');
  elements.dailyLandingStats.innerHTML = statsHtml;
  elements.dailyLandingSummary.textContent = state.daily.error
    ? 'Daily game data is unavailable right now. Try refreshing after the airport data build completes.'
    : 'Guess today\'s airport using geography, runway, navaid, layout, elevation, and distance clues.';
  if (state.daily.error) {
    elements.dailyLandingTeaser.textContent = state.daily.error;
    elements.dailyLaunchButton.textContent = `Open ${DAILY_GAME_NAME}`;
    return;
  }
  if (todaySession.status === 'won') {
    elements.dailyLandingTeaser.textContent = `You cleared today in ${formatDailyGuessCount(todaySession.guesses.length)}. Win rate: ${formatNumber(stats.winRate)}%.`;
    elements.dailyLaunchButton.textContent = `Review ${DAILY_GAME_NAME}`;
    return;
  }
  if (todaySession.status === 'lost') {
    elements.dailyLandingTeaser.textContent = 'Today\'s board is complete. Review the answer and reset timer from the Navdle tab.';
    elements.dailyLaunchButton.textContent = `Review ${DAILY_GAME_NAME}`;
    return;
  }
  if (todaySession.guesses.length) {
    elements.dailyLandingTeaser.textContent = `${formatDailyGuessCount(todaySession.guesses.length)} logged so far. Pick up the board before the UTC reset.`;
    elements.dailyLaunchButton.textContent = `Continue ${DAILY_GAME_NAME}`;
    return;
  }
  const guessableAirports = Number(state.daily.manifest?.guessableAirports || state.daily.dataset?.manifest?.guessableAirports || 0);
  elements.dailyLandingTeaser.textContent = guessableAirports
    ? `${formatNumber(guessableAirports)} guessable airports are in the rotation. Search by airport, city, or code and watch each clue category update after every guess.`
    : 'A fresh airport rotates in every UTC day. Search by airport, city, or code and watch each clue category update after every guess.';
  elements.dailyLaunchButton.textContent = `Play ${DAILY_GAME_NAME}`;
}

function renderCardleLandingCta() {
  const todayKey = getUtcDayKey();
  const todaySession = getCardleSession(todayKey);
  const stats = buildDailyStats(state.cardle.history);
  const countdown = formatCountdown(getNextUtcResetTime().getTime() - Date.now());
  const statsHtml = [
    buildDailyLandingChipHtml('Streak', `${formatNumber(stats.currentStreak)}`),
    buildDailyLandingChipHtml('Reset', countdown),
  ].join('');
  elements.cardleLandingStats.innerHTML = statsHtml;
  elements.cardleLandingSummary.textContent = state.cardle.error
    ? 'Cardle data is unavailable right now. Try refreshing after the reference snapshot finishes loading.'
    : 'Guess today\'s aircraft using eight stats, a hotspot map, and a delayed 3D reveal.';
  if (state.cardle.error) {
    elements.cardleLandingTeaser.textContent = state.cardle.error;
    elements.cardleLaunchButton.textContent = `Open ${CARDLE_GAME_NAME}`;
    return;
  }
  if (todaySession.status === 'won') {
    elements.cardleLandingTeaser.textContent = `You cleared today in ${formatDailyGuessCount(todaySession.guesses.length)}. Win rate: ${formatNumber(stats.winRate)}%.`;
    elements.cardleLaunchButton.textContent = `Review ${CARDLE_GAME_NAME}`;
    return;
  }
  if (todaySession.status === 'lost') {
    elements.cardleLandingTeaser.textContent = 'Today\'s model is already revealed. Review the answer, hotspot map, and reset timer from the Cardle tab.';
    elements.cardleLaunchButton.textContent = `Review ${CARDLE_GAME_NAME}`;
    return;
  }
  if (todaySession.guesses.length) {
    elements.cardleLandingTeaser.textContent = `${formatDailyGuessCount(todaySession.guesses.length)} logged so far. The hotspot map unlocks on guess ${formatNumber(CARDLE_MAP_REVEAL_GUESS)} and the 3D reveal opens on guess ${formatNumber(CARDLE_MODEL_REVEAL_GUESS)}.`;
    elements.cardleLaunchButton.textContent = `Continue ${CARDLE_GAME_NAME}`;
    return;
  }
  const guessableModels = Number(state.cardle.dataset?.guessableModels || state.references?.manifest?.datasets?.models?.rows || 0);
  elements.cardleLandingTeaser.textContent = guessableModels
    ? `${formatNumber(guessableModels)} playable aircraft models are in the rotation. Search by ICAO, manufacturer, or alias and watch each stat cell flip higher or lower after every guess.`
    : 'A fresh aircraft model rotates in every UTC day. Search by ICAO, manufacturer, or alias and watch each stat cell flip higher or lower after every guess.';
  elements.cardleLaunchButton.textContent = `Play ${CARDLE_GAME_NAME}`;
}

function renderLandingDailyCtas() {
  renderDailyLandingCta();
  renderCardleLandingCta();
}

function isDailyGameReadyForToday() {
  const todayKey = getUtcDayKey();
  return Boolean(state.daily.challenge && state.daily.dataset && state.daily.dayKey === todayKey);
}

function isCardleGameReadyForToday() {
  const todayKey = getUtcDayKey();
  return Boolean(state.cardle.challenge && state.cardle.dataset && state.cardle.dayKey === todayKey);
}

function buildDailyMetaChipHtml(label, value, note, options = {}) {
  const toneClass = options.tone ? ` is-${options.tone}` : '';
  const celebrateClass = options.isCelebrating ? ' is-celebrating' : '';
  const noteText = note ? escapeHtml(note) : '&nbsp;';
  return `
    <article class="daily-meta-chip${toneClass}${celebrateClass}">
      <span class="daily-meta-chip-label">${escapeHtml(label)}</span>
      <strong class="daily-meta-chip-value">${escapeHtml(value)}</strong>
      <span class="daily-meta-chip-note${note ? '' : ' is-empty'}">${noteText}</span>
    </article>
  `;
}

function buildDailyStatusBadgeHtml(label, value, note, options = {}) {
  return buildDailyMetaChipHtml(label, value, note, options);
}

function buildDailyStatCardHtml(label, value, note, options = {}) {
  return buildDailyMetaChipHtml(label, value, note, options);
}

function buildDailyVictoryOverlayHtml() {
  const fireworks = [
    { left: '8%', top: '10%', hue: '35deg', delay: '0ms' },
    { left: '28%', top: '24%', hue: '12deg', delay: '180ms' },
    { left: '54%', top: '8%', hue: '192deg', delay: '320ms' },
    { left: '76%', top: '18%', hue: '326deg', delay: '120ms' },
    { left: '88%', top: '38%', hue: '52deg', delay: '420ms' },
  ];
  const ribbons = [
    { left: '12%', delay: '90ms', rotate: '-14deg' },
    { left: '34%', delay: '260ms', rotate: '8deg' },
    { left: '61%', delay: '140ms', rotate: '-6deg' },
    { left: '82%', delay: '320ms', rotate: '15deg' },
  ];
  return `
    <div class="daily-victory-overlay" aria-hidden="true">
      <span class="daily-victory-flash"></span>
      ${fireworks.map((firework) => `
        <span
          class="daily-firework"
          style="--firework-left:${firework.left};--firework-top:${firework.top};--firework-hue:${firework.hue};--firework-delay:${firework.delay};"
        ></span>
      `).join('')}
      ${ribbons.map((ribbon) => `
        <span
          class="daily-victory-ribbon"
          style="--ribbon-left:${ribbon.left};--ribbon-delay:${ribbon.delay};--ribbon-rotate:${ribbon.rotate};"
        ></span>
      `).join('')}
    </div>
  `;
}

function getDailyCopyButtonConfig(challenge, session, options = {}) {
  if (!challenge || (session.status !== 'won' && session.status !== 'lost')) {
    return null;
  }
  const celebrateSolve = Boolean(options?.celebrateSolve);
  const isVictory = session.status === 'won';
  if (state.daily.copyStatus === 'copied') {
    return isVictory
      ? {
        className: 'region-action-button daily-copy-button is-victory is-copied',
        label: 'Copied',
      }
      : {
        className: 'region-action-button daily-copy-button is-loss is-copied',
        label: 'Copied',
      };
  }
  if (state.daily.copyStatus === 'error') {
    return {
      className: `region-action-button daily-copy-button${isVictory ? ' is-victory' : ' is-loss'} is-error`,
      label: 'Copy results',
      note: 'Try again',
    };
  }
  return isVictory
    ? {
      className: `region-action-button daily-copy-button is-victory${celebrateSolve ? ' is-celebrating' : ''}`,
      label: 'Copy results',
      note: `${formatDailyGuessCount(session.guesses.length)} logged`,
    }
    : {
      className: 'region-action-button daily-copy-button is-loss',
      label: 'Copy results',
      note: 'Share-ready grid',
    };
}

function buildDailyCopyButtonHtml(copyButtonConfig) {
  if (!copyButtonConfig) {
    return '';
  }
  return `
    <button class="${escapeHtml(copyButtonConfig.className)} daily-answer-copy-action" type="button" data-action="copy-daily-results">
      <span class="daily-copy-button-label">${escapeHtml(copyButtonConfig.label)}</span>
      ${copyButtonConfig.note ? `<span class="daily-copy-button-note">${escapeHtml(copyButtonConfig.note)}</span>` : ''}
    </button>
  `;
}

function buildDailyRunwayLightHtml(index, spentCount, status) {
  const isSpent = index < spentCount;
  const isActive = status === 'in_progress' && index === spentCount;
  return `<span class="daily-runway-light${isSpent ? ' is-spent' : ''}${isActive ? ' is-active' : ''}"></span>`;
}

function getDailySourceAttribution() {
  const manifest = state.daily.manifest || state.daily.dataset?.manifest;
  const label = String(manifest?.source || 'OurAirports Open Data').trim() || 'OurAirports Open Data';
  const url = String(manifest?.sourcePage || 'https://ourairports.com/data/').trim() || 'https://ourairports.com/data/';
  return { label, url };
}

function buildDailySourceNoteHtml() {
  const source = getDailySourceAttribution();
  if (!source.url) {
    return `<p class="daily-source-note">Daily airport data provided by ${escapeHtml(source.label)}.</p>`;
  }
  return `
    <p class="daily-source-note">
      Daily airport data provided by
      <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a>.
    </p>
  `;
}

function normalizeHashRoute(hash) {
  return String(hash || '').trim().toLowerCase();
}

function isDailyHashRoute(hash = typeof window !== 'undefined' ? window.location?.hash : '') {
  const normalizedHash = normalizeHashRoute(hash);
  return normalizedHash === DAILY_GAME_HASH || LEGACY_DAILY_GAME_HASHES.has(normalizedHash);
}

function isLegacyDailyHashRoute(hash = typeof window !== 'undefined' ? window.location?.hash : '') {
  return LEGACY_DAILY_GAME_HASHES.has(normalizeHashRoute(hash));
}

function updateUrlHash(hash, options = {}) {
  if (typeof window === 'undefined' || !window.location || !window.history) {
    return;
  }
  const nextHash = String(hash || '').trim();
  const url = new URL(window.location.href);
  url.hash = nextHash ? nextHash.replace(/^#/, '') : '';
  const nextUrl = `${url.pathname}${url.search}${url.hash}`;
  const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
  if (nextUrl === currentUrl) {
    return;
  }
  const method = options.replace ? 'replaceState' : 'pushState';
  window.history[method](window.history.state, '', nextUrl);
}

function getDailyShareUrl() {
  if (typeof window === 'undefined' || !window.location) {
    return DAILY_GAME_HASH;
  }
  const url = new URL(window.location.href);
  url.hash = DAILY_GAME_HASH.slice(1);
  return url.toString();
}

function formatDailyGuessCount(count) {
  return `${formatNumber(count)} ${count === 1 ? 'guess' : 'guesses'}`;
}

function formatDailyCategoryList(labels, limit = 2) {
  const uniqueLabels = Array.from(new Set(labels.filter(Boolean)));
  if (!uniqueLabels.length) {
    return 'No clue change';
  }
  if (uniqueLabels.length <= limit) {
    return uniqueLabels.join(', ');
  }
  return `${uniqueLabels.slice(0, limit).join(', ')} +${formatNumber(uniqueLabels.length - limit)} more`;
}

function isKnownDailyNumber(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function getDailyTileHelp(key) {
  return DAILY_TILE_HELP[key] || {
    meaning: 'This clue compares one part of the guessed airport against today\'s airport.',
    examples: 'Green is exact, amber is near, and gray means the clue is off.',
  };
}

function buildDailyTileHelpHtml(key) {
  const help = getDailyTileHelp(key);
  return `
    <details class="daily-tile-help">
      <summary class="daily-tile-help-toggle" aria-label="Explain this clue">?</summary>
      <div class="daily-tile-help-panel">
        <strong class="daily-tile-help-title">What this means</strong>
        <p class="daily-tile-help-copy">${escapeHtml(help.meaning)}</p>
        <p class="daily-tile-help-copy is-example">${escapeHtml(help.examples)}</p>
      </div>
    </details>
  `;
}

function buildDailyHintValueHtml(hint) {
  const valueParts = Array.isArray(hint?.valueParts) ? hint.valueParts : null;
  if (!valueParts?.length) {
    return escapeHtml(hint?.value || '');
  }
  return valueParts.map((part) => {
    if (typeof part === 'string') {
      return escapeHtml(part);
    }
    if (part?.type === 'redaction') {
      return `<span class="daily-redaction" aria-hidden="true"><span class="daily-redaction-ink">${escapeHtml(part.text || '')}</span></span><span class="sr-only">[airport identifier redacted]</span>`;
    }
    return escapeHtml(part?.text || '');
  }).join('');
}

function formatDailyHintUnlockCopy(unlockGuess, maxGuesses, options = {}) {
  const safeUnlockGuess = Math.floor(Number(unlockGuess));
  const safeMaxGuesses = Math.max(1, Math.floor(Number(maxGuesses) || 8));
  if (!Number.isFinite(safeUnlockGuess) || safeUnlockGuess <= 0) {
    return '';
  }
  if (safeUnlockGuess >= safeMaxGuesses) {
    return options.short ? 'Final guess' : 'Unlocked on the final guess';
  }
  return options.short
    ? `${formatNumber(safeUnlockGuess)} guesses`
    : `Unlocked after ${formatNumber(safeUnlockGuess)} ${safeUnlockGuess === 1 ? 'guess' : 'guesses'}`;
}

function buildDailyHintState(challenge, session, options = {}) {
  if (!challenge?.target) {
    return {
      maxGuesses: Number(challenge?.maxGuesses || 8),
      hints: [],
      thresholds: [],
      revealCount: 0,
      unlockedCount: 0,
      availableCount: 0,
      visibleHints: [],
      nextThreshold: null,
    };
  }
  const maxGuesses = Number(challenge.maxGuesses || 8);
  const thresholds = getDailyHintUnlockThresholds(maxGuesses);
  const hints = buildAirportHints(challenge.target, {
    revealAnswer: Boolean(options?.revealAnswer),
    maxHints: thresholds.length,
  });
  const activeThresholds = thresholds.slice(0, hints.length);
  const storedRevealCount = Math.min(
    Number.isFinite(Number(session?.hintRevealCount))
      ? Math.max(0, Math.floor(Number(session.hintRevealCount)))
      : session?.hintRevealed
        ? 1
        : 0,
    hints.length,
  );
  const unlockedCount = Math.min(
    activeThresholds.filter((threshold) => session.guesses.length >= threshold).length,
    hints.length,
  );
  const revealCount = Math.min(Math.max(storedRevealCount, unlockedCount), hints.length);
  return {
    maxGuesses,
    hints,
    thresholds: activeThresholds,
    revealCount,
    unlockedCount,
    availableCount: hints.length,
    visibleHints: hints.slice(0, Boolean(options?.revealAnswer) ? hints.length : revealCount),
    nextThreshold: activeThresholds[revealCount] ?? null,
  };
}

function buildDailyHintEntryHtml(hint, index, unlockGuess, options = {}) {
  const unlockCopy = formatDailyHintUnlockCopy(unlockGuess, options.maxGuesses, { short: true });
  const entryClass = options.inAnswerCard ? 'daily-hint-entry is-answer' : 'daily-hint-entry';
  return `
    <article class="${entryClass}">
      <div class="daily-hint-entry-head">
        <div>
          <span class="daily-hint-entry-index">Hint ${formatNumber(index + 1)}</span>
          <h5 class="daily-hint-entry-title">${escapeHtml(hint?.label || 'Extra hint')}</h5>
        </div>
        ${unlockCopy ? `<span class="daily-hint-entry-chip">${escapeHtml(unlockCopy)}</span>` : ''}
      </div>
      <p class="daily-hint-copy">${buildDailyHintValueHtml(hint)}</p>
      ${hint?.note ? `
        <p class="daily-hint-note">
          <span class="daily-answer-fact-note-icon" aria-hidden="true">i</span>
          <span>${escapeHtml(hint.note)}</span>
        </p>
      ` : ''}
    </article>
  `;
}

function buildDailyHintListHtml(hints, thresholds, options = {}) {
  if (!hints.length) {
    return '';
  }
  return `
    <div class="daily-hint-list${options.inAnswerCard ? ' is-answer' : ''}">
      ${hints.map((hint, index) => buildDailyHintEntryHtml(hint, index, thresholds[index], options)).join('')}
    </div>
  `;
}

function renderDailyBriefing(challenge, session, countdown) {
  const maxGuesses = Number(challenge?.maxGuesses || 8);
  const remainingGuesses = Math.max(maxGuesses - session.guesses.length, 0);
  const hintState = buildDailyHintState(challenge, session);
  const guessesUntilNextHint = hintState.nextThreshold === null
    ? 0
    : Math.max(hintState.nextThreshold - session.guesses.length, 0);
  const hintCopy = hintState.availableCount === 0
    ? 'No extra clues are available for this field today.'
    : session.status !== 'in_progress'
      ? 'Board complete. Review the revealed airport and full hint recap below.'
      : hintState.revealCount >= hintState.availableCount
        ? 'All available hints are already open below.'
        : hintState.nextThreshold === maxGuesses
          ? 'The final hint auto-reveals on your last guess.'
          : `The next clue auto-reveals after ${formatNumber(guessesUntilNextHint)} more ${guessesUntilNextHint === 1 ? 'guess' : 'guesses'}.`;
  elements.dailyBriefing.innerHTML = `
    <div class="daily-briefing-card">
      <div class="daily-briefing-head">
        <div class="daily-briefing-copy">
          <div class="daily-widget-head">
            <span class="daily-widget-kicker">Guesses left</span>
            <strong class="daily-widget-value">${formatNumber(remainingGuesses)}</strong>
            <span class="daily-widget-note">of ${formatNumber(maxGuesses)} left</span>
          </div>
        </div>
      </div>
      <div class="daily-runway-lights" aria-hidden="true">
        ${Array.from({ length: maxGuesses }, (_, index) => buildDailyRunwayLightHtml(index, session.guesses.length, session.status)).join('')}
      </div>
      <div class="daily-briefing-foot">
        <p class="daily-hint-note">${escapeHtml(hintCopy)}</p>
        ${buildDailySourceNoteHtml()}
      </div>
    </div>
  `;
}

function renderDailyIntel(challenge, session, options = {}) {
  if (!challenge?.target) {
    elements.dailyIntel.hidden = true;
    elements.dailyIntel.innerHTML = '';
    return;
  }
  const target = challenge.target;
  const revealAnswer = session.status === 'won' || session.status === 'lost';
  const celebrateSolve = session.status === 'won' && Boolean(options?.celebrateSolve);
  const hintState = buildDailyHintState(challenge, session, { revealAnswer });
  if (session.status === 'won' || session.status === 'lost') {
    const guessesRemaining = Math.max((challenge.maxGuesses || 8) - session.guesses.length, 0);
    const copyButtonConfig = session.status === 'won'
      ? getDailyCopyButtonConfig(challenge, session, { celebrateSolve })
      : null;
    elements.dailyIntel.hidden = false;
    elements.dailyIntel.innerHTML = `
      <div class="daily-answer-card${session.status === 'won' ? ' is-victory' : ''}${celebrateSolve ? ' is-celebrating' : ''}">
        ${celebrateSolve ? buildDailyVictoryOverlayHtml() : ''}
        <div class="daily-answer-head">
          <div>
            <p class="eyebrow">${session.status === 'won' ? 'Direct hit' : 'Revealed airport'}</p>
            <h4 class="daily-answer-title">${escapeHtml(target.name)}</h4>
            <p class="daily-answer-copy">${escapeHtml(buildAirportOptionLabel(target))}</p>
            ${session.status === 'won' ? `<p class="daily-answer-status">${escapeHtml(`${formatDailyGuessCount(session.guesses.length)} with ${formatNumber(guessesRemaining)} ${guessesRemaining === 1 ? 'try' : 'tries'} to spare.`)}</p>` : ''}
          </div>
          ${buildDailyCopyButtonHtml(copyButtonConfig)}
        </div>
        <div class="daily-answer-facts">
          <div class="daily-answer-fact">
            <span class="daily-answer-fact-label">Location</span>
            <span class="daily-answer-fact-value">${escapeHtml([target.municipality, target.regionName, target.countryName].filter(Boolean).join(', '))}</span>
          </div>
          <div class="daily-answer-fact">
            <span class="daily-answer-fact-label">Infrastructure</span>
            <span class="daily-answer-fact-value">${escapeHtml(`${formatNumber(target.runwayCount)} runways, longest ${formatNumber(target.longestRunwayFt || 0)} ft, ${target.surfaceLabel || 'surface unknown'}`)}</span>
          </div>
          <div class="daily-answer-fact">
            <span class="daily-answer-fact-label">Navigation</span>
            <span class="daily-answer-fact-value">${escapeHtml(`${formatNumber(target.navaidCount)} navaids, ${formatNumber(target.frequencyCount)} radio entries`)}</span>
          </div>
          ${hintState.availableCount ? `
            <div class="daily-answer-fact is-hints">
              <span class="daily-answer-fact-label">Hint recap</span>
              ${buildDailyHintListHtml(hintState.hints, hintState.thresholds, { inAnswerCard: true, maxGuesses: hintState.maxGuesses })}
            </div>
          ` : ''}
        </div>
      </div>
    `;
    return;
  }
  if (!hintState.revealCount) {
    elements.dailyIntel.hidden = true;
    elements.dailyIntel.innerHTML = '';
    return;
  }
  const nextHintCopy = hintState.nextThreshold === null
    ? 'All available hints are already revealed.'
    : hintState.nextThreshold === hintState.maxGuesses
      ? 'The final hint auto-reveals on your last guess.'
      : `Next clue auto-reveals after ${formatNumber(Math.max(hintState.nextThreshold - session.guesses.length, 0))} more ${Math.max(hintState.nextThreshold - session.guesses.length, 0) === 1 ? 'guess' : 'guesses'}.`;
  elements.dailyIntel.hidden = false;
  elements.dailyIntel.innerHTML = `
    <div class="daily-hint-card">
      <div class="daily-hint-head">
        <div>
          <p class="eyebrow">Extra hints</p>
          <h4 class="daily-hint-title">${escapeHtml(`${formatNumber(hintState.revealCount)} unlocked`)}</h4>
        </div>
        <span class="daily-hint-chip">${escapeHtml(`${formatNumber(hintState.revealCount)} / ${formatNumber(hintState.availableCount)}`)}</span>
      </div>
      ${buildDailyHintListHtml(hintState.visibleHints, hintState.thresholds, { maxGuesses: hintState.maxGuesses })}
      <p class="daily-hint-meta">
        <span class="daily-hint-meta-icon" aria-hidden="true">i</span>
        <span>${escapeHtml(nextHintCopy)}</span>
      </p>
    </div>
  `;
}

function buildDailyTransitionChipHtml(label, value, tone = 'flat') {
  return `
    <span class="daily-transition-chip is-${tone}">
      <span class="daily-transition-chip-label">${escapeHtml(label)}</span>
      <span class="daily-transition-chip-value">${escapeHtml(value)}</span>
    </span>
  `;
}

function getDailyTileByKey(entry, key) {
  return entry?.comparison?.tiles?.find((tile) => tile.key === key) || null;
}

function getDailyTrackerNumericDelta(guessValue, targetValue) {
  const safeGuess = Number(guessValue);
  const safeTarget = Number(targetValue);
  if (!Number.isFinite(safeGuess) || !Number.isFinite(safeTarget)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(safeGuess - safeTarget);
}

function getDailyTrackerMetric(entry, key, targetAirport) {
  const tile = getDailyTileByKey(entry, key);
  if (!tile) {
    return Number.POSITIVE_INFINITY;
  }
  switch (key) {
    case 'profile': {
      const guessRank = DAILY_PROFILE_RANKS[String(entry?.airport?.sizeBucket || '').toLowerCase()];
      const targetRank = DAILY_PROFILE_RANKS[String(targetAirport?.sizeBucket || '').toLowerCase()];
      return Number.isFinite(guessRank) && Number.isFinite(targetRank)
        ? Math.abs(guessRank - targetRank)
        : Number.POSITIVE_INFINITY;
    }
    case 'continent':
    case 'country':
    case 'region':
    case 'layout':
      return tile.tone === 'hit' ? 0 : tile.tone === 'near' ? 1 : 2;
    case 'elevation':
      return getDailyTrackerNumericDelta(entry?.airport?.elevationFt, targetAirport?.elevationFt);
    case 'runways':
      return getDailyTrackerNumericDelta(entry?.airport?.runwayCount, targetAirport?.runwayCount);
    case 'longest-runway':
      return getDailyTrackerNumericDelta(entry?.airport?.longestRunwayFt, targetAirport?.longestRunwayFt);
    case 'navaids':
      return getDailyTrackerNumericDelta(entry?.airport?.navaidCount, targetAirport?.navaidCount);
    case 'distance':
      return Number.isFinite(entry?.comparison?.distanceKm) ? entry.comparison.distanceKm : Number.POSITIVE_INFINITY;
    default:
      return Number.POSITIVE_INFINITY;
  }
}

function pickDailyTrackerEntry(entries, key, targetAirport) {
  return entries.reduce((bestEntry, entry) => {
    if (!bestEntry) {
      return entry;
    }
    const bestMetric = getDailyTrackerMetric(bestEntry, key, targetAirport);
    const entryMetric = getDailyTrackerMetric(entry, key, targetAirport);
    if (entryMetric !== bestMetric) {
      return entryMetric < bestMetric ? entry : bestEntry;
    }
    const bestTone = DAILY_TONE_ORDER[getDailyTileByKey(bestEntry, key)?.tone] ?? -1;
    const entryTone = DAILY_TONE_ORDER[getDailyTileByKey(entry, key)?.tone] ?? -1;
    if (entryTone !== bestTone) {
      return entryTone > bestTone ? entry : bestEntry;
    }
    return (entry?.guessNumber || 0) >= (bestEntry?.guessNumber || 0) ? entry : bestEntry;
  }, null);
}

function buildDailyTrackerTiles(entries, targetAirport) {
  return DAILY_TRACKER_TILE_SPECS.map((spec) => {
    const bestEntry = pickDailyTrackerEntry(entries, spec.key, targetAirport);
    if (!bestEntry) {
      return {
        ...spec,
        tone: 'pending',
        value: '--',
        indicator: '',
        meta: '',
      };
    }
    const bestTile = getDailyTileByKey(bestEntry, spec.key);
    return {
      ...bestTile,
      key: spec.key,
      label: bestTile?.label || spec.label,
    };
  });
}

function shouldRenderDailyTileMeta(tile) {
  return tile?.key === 'distance' && Boolean(String(tile?.meta || '').trim());
}

function buildDailyTileHtml(tile, tileIndex, options = {}) {
  const tone = String(tile?.tone || 'pending').trim() || 'pending';
  const value = tile?.value ?? '--';
  const metaHtml = shouldRenderDailyTileMeta(tile)
    ? `<span class="daily-tile-meta">${escapeHtml(tile.meta || '')}</span>`
    : '';
  const trackerClass = options.isTracker ? ' is-tracker-tile' : '';
  return `
    <div class="daily-guess-tile is-${escapeHtml(tone)}${trackerClass}" style="--tile-index:${tileIndex};">
      <div class="daily-tile-head">
        <span class="daily-tile-label">${escapeHtml(tile?.label || '')}</span>
      </div>
      <div class="daily-tile-value-row">
        <strong class="daily-tile-value${tone === 'pending' ? ' is-pending' : ''}">${escapeHtml(String(value))}</strong>
        ${tile?.indicator ? `<span class="daily-tile-indicator" aria-hidden="true">${escapeHtml(tile.indicator)}</span>` : ''}
      </div>
      ${metaHtml}
      ${tile?.key ? buildDailyTileHelpHtml(tile.key) : ''}
    </div>
  `;
}

function buildDailyGuessGridHtml(tiles, options = {}) {
  return `
    <div class="daily-guess-grid">
      ${tiles.map((tile, tileIndex) => buildDailyTileHtml(tile, tileIndex, options)).join('')}
    </div>
  `;
}

function buildDailyTrackerRowHtml(entries, targetAirport) {
  const trackerTiles = buildDailyTrackerTiles(entries, targetAirport);
  const exactCount = trackerTiles.filter((tile) => tile.tone === 'hit').length;
  const hasEntries = entries.length > 0;
  const subtitle = hasEntries
    ? 'The strongest clue you have logged in each category stays pinned here.'
    : 'Your strongest clue in each category will pin here after the first guess.';
  const badge = hasEntries ? `${formatNumber(exactCount)} exact` : 'No guesses';
  return `
    <div class="daily-board-anchor">
      <article class="daily-guess-row is-tracker${exactCount === trackerTiles.length && hasEntries ? ' is-solved' : ''}">
        <div class="daily-guess-head">
          <div>
            <h4 class="daily-guess-title">Best so far</h4>
            <p class="daily-guess-subtitle">${escapeHtml(subtitle)}</p>
          </div>
          <span class="daily-guess-badge is-tracker">${escapeHtml(badge)}</span>
        </div>
        ${buildDailyGuessGridHtml(trackerTiles, { isTracker: true })}
      </article>
    </div>
  `;
}

function buildDailyToneShiftChip(label, previousTone, currentTone, nearCopy = 'closer') {
  if (!previousTone || !currentTone || previousTone === currentTone) {
    return '';
  }
  if (currentTone === 'hit') {
    return '';
  }
  if ((DAILY_TONE_ORDER[currentTone] || 0) > (DAILY_TONE_ORDER[previousTone] || 0)) {
    return buildDailyTransitionChipHtml(label, currentTone === 'hit' ? 'matched' : nearCopy, 'better');
  }
  return buildDailyTransitionChipHtml(label, previousTone === 'hit' ? 'left exact match' : 'farther off', 'worse');
}

function formatDailyCountShift(change, singular, plural = `${singular}s`) {
  const roundedAmount = Math.round(Math.abs(Number(change) || 0));
  if (!roundedAmount) {
    return '';
  }
  const noun = roundedAmount === 1 ? singular : plural;
  return change > 0
    ? `${formatNumber(roundedAmount)} more ${noun}`
    : `${formatNumber(roundedAmount)} fewer ${noun}`;
}

function formatDailyDirectionalShift(change, unit, increaseWord, decreaseWord, pluralUnit = unit) {
  const roundedAmount = Math.round(Math.abs(Number(change) || 0));
  if (!roundedAmount) {
    return '';
  }
  const unitLabel = roundedAmount === 1 ? unit : pluralUnit;
  return `${formatNumber(roundedAmount)} ${unitLabel} ${change > 0 ? increaseWord : decreaseWord}`;
}

function buildDailyNumericTransitionChip(label, previousValue, currentValue, targetValue, formatter) {
  if (!isKnownDailyNumber(previousValue) || !isKnownDailyNumber(currentValue) || !isKnownDailyNumber(targetValue)) {
    return '';
  }
  const previousDelta = Math.abs(Number(previousValue) - Number(targetValue));
  const currentDelta = Math.abs(Number(currentValue) - Number(targetValue));
  if (currentDelta === previousDelta) {
    return '';
  }
  if (currentDelta === 0) {
    return '';
  }
  const shift = previousDelta - currentDelta;
  const valueShift = Number(currentValue) - Number(previousValue);
  const valueCopy = formatter(valueShift);
  if (!valueCopy) {
    return '';
  }
  return buildDailyTransitionChipHtml(
    label,
    valueCopy,
    shift > 0 ? 'better' : 'worse',
  );
}

function buildDailyProfileTransitionChip(previousAirport, currentAirport, targetAirport) {
  const previousRank = DAILY_PROFILE_RANKS[String(previousAirport?.sizeBucket || '').toLowerCase()];
  const currentRank = DAILY_PROFILE_RANKS[String(currentAirport?.sizeBucket || '').toLowerCase()];
  const targetRank = DAILY_PROFILE_RANKS[String(targetAirport?.sizeBucket || '').toLowerCase()];
  if (!Number.isFinite(previousRank) || !Number.isFinite(currentRank) || !Number.isFinite(targetRank)) {
    return '';
  }
  const previousDelta = Math.abs(previousRank - targetRank);
  const currentDelta = Math.abs(currentRank - targetRank);
  if (currentDelta === previousDelta) {
    return '';
  }
  if (currentDelta === 0) {
    return '';
  }
  const shift = previousDelta - currentDelta;
  const steps = Math.abs(shift);
  const sizeShift = currentRank - previousRank;
  return buildDailyTransitionChipHtml(
    'Profile',
    `${formatNumber(steps)} size tier${steps === 1 ? '' : 's'} ${sizeShift > 0 ? 'larger' : 'smaller'}`,
    shift > 0 ? 'better' : 'worse',
  );
}

function buildDailyDirectionTransitionChip(currentEntry, previousEntry) {
  const movementDirection = describeAirportDirection(previousEntry.airport, currentEntry.airport);
  const previousHint = previousEntry.comparison?.bearingLabel;
  if (!movementDirection.label || !previousHint || currentEntry.comparison?.distanceKm < 1) {
    return '';
  }
  const courseDelta = getCompassSectorDistance(previousHint, movementDirection.label);
  if (courseDelta === 0) {
    return buildDailyTransitionChipHtml('Direction', `${movementDirection.arrow} followed ${previousHint}`, 'better');
  }
  if (courseDelta === 1) {
    return buildDailyTransitionChipHtml('Direction', `${movementDirection.arrow} near ${previousHint}`, 'flat');
  }
  return buildDailyTransitionChipHtml('Direction', `${movementDirection.arrow} off ${previousHint}`, 'worse');
}

function buildDailyGuessTransitionHtml(currentEntry, previousEntry, targetAirport) {
  const distanceDeltaKm = previousEntry.comparison.distanceKm - currentEntry.comparison.distanceKm;
  const distanceTone = distanceDeltaKm > 0 ? 'better' : distanceDeltaKm < 0 ? 'worse' : 'flat';
  const distanceCopy = distanceDeltaKm > 0
    ? `${formatNumber(Math.round(distanceDeltaKm))} km closer`
    : distanceDeltaKm < 0
      ? `${formatNumber(Math.round(Math.abs(distanceDeltaKm)))} km farther`
      : 'same distance';
  const chips = [
    currentEntry.comparison.distanceKm < 1 ? '' : buildDailyTransitionChipHtml('Distance', distanceCopy, distanceTone),
    buildDailyDirectionTransitionChip(currentEntry, previousEntry),
    buildDailyProfileTransitionChip(previousEntry.airport, currentEntry.airport, targetAirport),
    buildDailyToneShiftChip('Continent', getDailyTileByKey(previousEntry, 'continent')?.tone, getDailyTileByKey(currentEntry, 'continent')?.tone),
    buildDailyToneShiftChip('Country', getDailyTileByKey(previousEntry, 'country')?.tone, getDailyTileByKey(currentEntry, 'country')?.tone, 'same continent'),
    buildDailyToneShiftChip('Region', getDailyTileByKey(previousEntry, 'region')?.tone, getDailyTileByKey(currentEntry, 'region')?.tone, 'same country'),
    buildDailyNumericTransitionChip(
      'Elevation',
      previousEntry.airport?.elevationFt,
      currentEntry.airport?.elevationFt,
      targetAirport?.elevationFt,
      (valueShift) => formatDailyDirectionalShift(valueShift, 'ft', 'higher', 'lower'),
    ),
    buildDailyNumericTransitionChip(
      'Runways',
      previousEntry.airport?.runwayCount,
      currentEntry.airport?.runwayCount,
      targetAirport?.runwayCount,
      (valueShift) => formatDailyCountShift(valueShift, 'runway', 'runways'),
    ),
    buildDailyNumericTransitionChip(
      'Longest runway',
      previousEntry.airport?.longestRunwayFt,
      currentEntry.airport?.longestRunwayFt,
      targetAirport?.longestRunwayFt,
      (valueShift) => formatDailyDirectionalShift(valueShift, 'ft', 'longer', 'shorter'),
    ),
    buildDailyNumericTransitionChip(
      'Navaids',
      previousEntry.airport?.navaidCount,
      currentEntry.airport?.navaidCount,
      targetAirport?.navaidCount,
      (valueShift) => formatDailyCountShift(valueShift, 'navaid', 'navaids'),
    ),
    buildDailyToneShiftChip('Layout', getDailyTileByKey(previousEntry, 'layout')?.tone, getDailyTileByKey(currentEntry, 'layout')?.tone, 'more similar'),
  ].filter(Boolean);
  if (!chips.length) {
    return '';
  }
  return `
    <div class="daily-guess-transition" aria-label="Change from guess ${previousEntry.guessNumber} to guess ${currentEntry.guessNumber}">
      <span class="daily-transition-label">Guess ${previousEntry.guessNumber} to ${currentEntry.guessNumber}</span>
      <div class="daily-transition-rail">
        ${chips.join('')}
      </div>
    </div>
  `;
}

function renderDailyBoard(challenge, session) {
  const entries = session.guesses
    .map((airportId, index) => {
      const airport = state.daily.dataset?.airportsById?.get(airportId);
      if (!airport) {
        return null;
      }
      return {
        airport,
        guessNumber: index + 1,
        comparison: buildAirportGuessComparison(airport, challenge.target),
      };
    })
    .filter(Boolean);
  elements.dailyBoardMeta.hidden = true;
  elements.dailyBoardMeta.textContent = '';
  const trackerRowHtml = session.status === 'won' ? '' : buildDailyTrackerRowHtml(entries, challenge.target);
  if (!entries.length) {
    elements.dailyBoard.innerHTML = `
      ${trackerRowHtml}
      <div class="daily-board-empty">
        Your guesses will stack below the tracker. Start with a likely airport, then follow the distance and direction clues.
      </div>
    `;
    return [];
  }
  const displayEntries = [...entries].reverse();
  const animatedGuessId = state.daily.pendingAnimatedGuessId;
  elements.dailyBoard.innerHTML = `
    ${trackerRowHtml}
    <div class="daily-board-stack">
      ${displayEntries.map((entry, index) => {
    const { airport, comparison, guessNumber } = entry;
    const currentRowHtml = `
      <article class="daily-guess-row${comparison.solved ? ' is-solved' : ''}">
        <div class="daily-guess-head">
          <div>
            <h4 class="daily-guess-title">${escapeHtml(airport.name)}</h4>
            <p class="daily-guess-subtitle">${escapeHtml(buildAirportOptionLabel(airport))}</p>
          </div>
          <span class="daily-guess-badge${comparison.solved ? ' is-solved' : ''}">${comparison.solved ? 'Solved' : `Guess ${guessNumber}`}</span>
        </div>
        ${buildDailyGuessGridHtml(comparison.tiles)}
      </article>
    `;
        return `
          <div class="daily-board-step${comparison.solved ? ' is-solved' : ''}${animatedGuessId && airport.id === animatedGuessId ? ' is-fresh' : ''}">
            <div class="daily-board-step-rail" aria-hidden="true">
              <span class="daily-board-step-node">${escapeHtml(String(guessNumber))}</span>
              ${index < displayEntries.length - 1 ? '<span class="daily-board-step-line"></span>' : ''}
            </div>
            <div class="daily-board-step-body">
              ${currentRowHtml}
              ${index < displayEntries.length - 1 ? buildDailyGuessTransitionHtml(entry, displayEntries[index + 1], challenge.target) : ''}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
  if (animatedGuessId) {
    state.daily.pendingAnimatedGuessId = '';
  }
  return displayEntries.map((entry) => entry.comparison);
}

function buildDailyMetaGridHtml(challenge, session, stats, countdown, statCelebrateKeys = new Set()) {
  return [
    buildDailyStatusBadgeHtml('Reset', countdown, 'UTC', { tone: 'reset' }),
    buildDailyStatCardHtml('Streak', formatNumber(stats.currentStreak), `${formatNumber(stats.longestStreak)} best`, {
      isCelebrating: statCelebrateKeys.has('streak'),
    }),
    buildDailyStatCardHtml('Win rate', `${formatNumber(stats.winRate)}%`, stats.best ? `${formatDailyGuessCount(stats.best)} best` : 'No clears yet', {
      isCelebrating: statCelebrateKeys.has('win-rate'),
    }),
  ].join('');
}

function renderDailyErrorState(message) {
  elements.dailyCommandDeck?.classList.remove('is-victorious');
  elements.dailyTitle.textContent = DAILY_GAME_NAME;
  elements.dailyHeroSummary.textContent = 'Board offline';
  elements.dailyMetaGrid.innerHTML = [
    buildDailyStatusBadgeHtml('Reset', '--', 'UTC', { tone: 'reset' }),
    buildDailyStatCardHtml('Streak', '--', 'Unavailable'),
    buildDailyStatCardHtml('Win rate', '--', 'Unavailable'),
  ].join('');
  elements.dailyGuessInput.disabled = true;
  elements.dailyGuessInput.value = '';
  elements.dailyGuessInput.setAttribute('aria-expanded', 'false');
  elements.dailySuggestionList.innerHTML = '';
  elements.dailyFeedback.hidden = false;
  elements.dailyFeedback.className = 'daily-feedback is-warning';
  elements.dailyFeedback.textContent = message;
  elements.dailyBriefing.innerHTML = `
    <div class="daily-briefing-card is-warning">
      <div class="daily-briefing-head">
        <div class="daily-briefing-copy">
          <div class="daily-widget-head">
            <span class="daily-widget-kicker">Daily status</span>
            <strong class="daily-widget-value">Unavailable</strong>
          </div>
          <p class="daily-briefing-note">${escapeHtml(message)}</p>
        </div>
      </div>
      <div class="daily-briefing-foot">
        ${buildDailySourceNoteHtml()}
      </div>
    </div>
  `;
  elements.dailyIntel.hidden = true;
  elements.dailyIntel.innerHTML = '';
  elements.dailyBoardMeta.hidden = true;
  elements.dailyBoardMeta.textContent = '';
  elements.dailyBoard.innerHTML = `
    <div class="daily-board-empty">
      Daily data is unavailable right now. The rest of Skyviz still works normally.
    </div>
  `;
}

function renderDailyTab() {
  if (state.daily.error) {
    renderDailyErrorState(state.daily.error);
    return;
  }
  const challenge = state.daily.challenge;
  if (!challenge || !state.daily.dataset) {
    elements.dailyCommandDeck?.classList.remove('is-victorious');
    elements.dailyTitle.textContent = DAILY_GAME_NAME;
    elements.dailyHeroSummary.textContent = 'Signal warming up';
    elements.dailyMetaGrid.innerHTML = [
      buildDailyStatusBadgeHtml('Reset', formatCountdown(getNextUtcResetTime().getTime() - Date.now()), 'UTC', { tone: 'reset' }),
      buildDailyStatCardHtml('Streak', '--', 'Loading'),
      buildDailyStatCardHtml('Win rate', '--', 'Loading'),
    ].join('');
    elements.dailyGuessInput.disabled = true;
    elements.dailyGuessInput.value = '';
    elements.dailySuggestionList.innerHTML = '';
    elements.dailyFeedback.hidden = false;
    elements.dailyFeedback.className = 'daily-feedback is-muted';
    elements.dailyFeedback.textContent = 'Loading airport data...';
    renderDailyBriefing({ profile: getDailyChallengeProfile(getUtcDayKey()) }, getDailySession(getUtcDayKey()), formatCountdown(getNextUtcResetTime().getTime() - Date.now()));
    renderDailyIntel(null, getDailySession(getUtcDayKey()));
    elements.dailyBoardMeta.hidden = true;
    elements.dailyBoardMeta.textContent = '';
    elements.dailyBoard.innerHTML = '<div class="daily-board-empty">Preparing today&apos;s board...</div>';
    return;
  }

  const session = getDailySession(challenge.dayKey);
  const stats = buildDailyStats(state.daily.history);
  const celebrateSolve = session.status === 'won' && state.daily.pendingVictoryDayKey === challenge.dayKey;
  const statCelebrateKeys = new Set(celebrateSolve ? state.daily.pendingStatCelebrateKeys : []);
  const countdown = formatCountdown(getNextUtcResetTime().getTime() - Date.now());
  const canGuess = session.status === 'in_progress' && session.guesses.length < (challenge.maxGuesses || 8);
  elements.dailyTitle.textContent = DAILY_GAME_NAME;
  elements.dailyHeroSummary.textContent = canGuess
    ? 'Type an airport, city, or code. Each guess updates continent, country, region, runway, navaids, layout, elevation, and distance clues.'
    : session.status === 'won'
      ? 'Board cleared. Review the clue trail, the revealed airport, and your share-ready grid.'
      : 'Board complete. Review the clue trail and today\'s revealed airport.';
  elements.dailyMetaGrid.innerHTML = buildDailyMetaGridHtml(challenge, session, stats, countdown, statCelebrateKeys);
  elements.dailyGuessInput.disabled = !canGuess;
  elements.dailyGuessInput.value = state.daily.query;
  elements.dailyGuessInput.setAttribute('aria-expanded', String(canGuess && state.daily.suggestions.length > 0));
  elements.dailySuggestionList.innerHTML = canGuess
    ? state.daily.suggestions.map((airport, index) => `
        <button
          class="daily-suggestion-button${index === state.daily.selectedSuggestionIndex ? ' is-active' : ''}"
          type="button"
          role="option"
          aria-selected="${index === state.daily.selectedSuggestionIndex}"
          data-action="select-daily-suggestion"
          data-airport-id="${escapeHtml(airport.id)}"
        >
          <span class="daily-suggestion-label">${escapeHtml(buildAirportOptionLabel(airport))}</span>
          <span class="daily-suggestion-meta">${escapeHtml([
            `${formatNumber(Number(airport.runwayCount) || 0)} runways`,
            airport.runwayLayoutLabel || 'Layout unknown',
            airport.surfaceLabel || 'Surface unknown',
          ].filter(Boolean).join(' / '))}</span>
        </button>
      `).join('')
    : '';
  const defaultFeedback = canGuess
    ? (session.guesses.length ? '' : 'Pick a result to submit your next guess, or press Enter on an exact match.')
    : session.status === 'won'
      ? 'Board solved.'
      : 'Board complete.';
  const feedbackText = state.daily.feedback || defaultFeedback;
  elements.dailyFeedback.hidden = !feedbackText;
  elements.dailyFeedback.className = `daily-feedback is-${escapeHtml(state.daily.feedbackTone || 'muted')}`;
  elements.dailyFeedback.textContent = feedbackText;
  renderDailyBriefing(challenge, session, countdown);
  renderDailyBoard(challenge, session);
  renderDailyIntel(challenge, session, { celebrateSolve });
  elements.dailyCommandDeck?.classList.toggle('is-victorious', celebrateSolve);
  if (state.ui.pendingDailyInputFocus) {
    focusDailyGuessInput();
  }
  if ((session.status === 'won' || session.status === 'lost') && !state.daily.feedback) {
    setDailyFeedback(
      session.status === 'won'
        ? `Cleared in ${formatDailyGuessCount(session.guesses.length)}. The share grid is ready.`
        : 'No solve today. The answer and clue trail are revealed below.',
      session.status === 'won' ? 'success' : 'warning',
    );
    elements.dailyFeedback.className = `daily-feedback is-${escapeHtml(state.daily.feedbackTone)}`;
    elements.dailyFeedback.textContent = state.daily.feedback;
  }
  if (celebrateSolve) {
    state.daily.pendingVictoryDayKey = '';
    state.daily.pendingStatCelebrateKeys = [];
  }
}

function scheduleDailyCountdownRefresh() {
  clearDailyCountdownTimer();
  renderLandingDailyCtas();
  if (state.activeTab === 'navdle') {
    renderDailyTab();
  } else if (state.activeTab === 'cardle') {
    renderCardleTab();
  }
  state.daily.countdownTimer = window.setInterval(() => {
    const nextDayKey = getUtcDayKey();
    let requiresReload = false;
    if (state.daily.dayKey && state.daily.dayKey !== nextDayKey) {
      state.daily.challenge = null;
      state.daily.dayKey = '';
      state.daily.query = '';
      state.daily.suggestions = [];
      state.daily.selectedSuggestionIndex = -1;
      requiresReload = true;
    }
    if (state.cardle.dayKey && state.cardle.dayKey !== nextDayKey) {
      state.cardle.challenge = null;
      state.cardle.dayKey = '';
      state.cardle.query = '';
      state.cardle.suggestions = [];
      state.cardle.selectedSuggestionIndex = -1;
      resetCardleHotspotState();
      resetCardleModelStageState();
      requiresReload = true;
    }
    if (requiresReload) {
      if (state.activeTab === 'navdle') {
        void ensureDailyGameReady({ focusInput: true });
      } else if (state.activeTab === 'cardle') {
        void ensureCardleGameReady({ focusInput: true });
      } else {
        renderLandingDailyCtas();
      }
      return;
    }
    renderLandingDailyCtas();
    if (state.activeTab === 'navdle' && document.activeElement !== elements.dailyGuessInput) {
      renderDailyTab();
      return;
    }
    if (state.activeTab === 'cardle' && document.activeElement !== elements.cardleGuessInput) {
      renderCardleTab();
    }
  }, 30000);
}

async function ensureDailyGameReady(options = {}) {
  const todayKey = getUtcDayKey();
  if (state.daily.challenge && state.daily.dataset && state.daily.dayKey === todayKey) {
    if (options.focusInput) {
      state.ui.pendingDailyInputFocus = true;
    }
    renderLandingDailyCtas();
    renderDailyTab();
    scheduleDailyCountdownRefresh();
    return true;
  }
  state.daily.error = '';
  if (options.focusInput) {
    state.ui.pendingDailyInputFocus = true;
  }
  try {
    if (!state.daily.manifest) {
      state.daily.manifest = await loadAirportGameManifest();
    }
    if (!state.daily.dataset) {
      state.daily.dataset = await loadAirportGameData();
      state.daily.manifest = state.daily.dataset.manifest;
    }
    const selection = selectDailyAirport(state.daily.dataset.airports, todayKey);
    if (!selection?.airport) {
      throw new Error('No airport could be selected for today.');
    }
    state.daily.dayKey = todayKey;
    state.daily.challenge = {
      dayKey: todayKey,
      profile: selection.profile,
      continent: selection.continent,
      target: selection.airport,
      maxGuesses: Number(state.daily.manifest?.maxGuesses || state.daily.dataset?.payload?.maxGuesses || 8),
    };
    state.daily.query = '';
    state.daily.suggestions = [];
    state.daily.selectedSuggestionIndex = -1;
    state.daily.pendingVictoryDayKey = '';
    state.daily.pendingStatCelebrateKeys = [];
    state.daily.copyStatus = '';
    if (!state.daily.feedback) {
      setDailyFeedback('', 'muted');
    }
    renderLandingDailyCtas();
    renderDailyTab();
    scheduleDailyCountdownRefresh();
    return true;
  } catch (error) {
    state.daily.error = error instanceof Error ? error.message : 'Failed to load the daily airport game data.';
    renderLandingDailyCtas();
    if (state.activeTab === 'navdle') {
      renderDailyErrorState(state.daily.error);
    }
    return false;
  }
}

async function openDailyExperience(options = {}) {
  if (options.syncHash !== false) {
    updateUrlHash(DAILY_GAME_HASH, { replace: Boolean(options.replaceHash) });
  }
  const revealShellBeforeReady = options.revealShellBeforeReady !== false;
  const showBlockingLoader = options.showBlockingLoader !== false && !isDailyGameReadyForToday();
  const previousVisibility = showBlockingLoader
    ? beginDashboardLoadingState(`Loading ${DAILY_GAME_NAME}...`)
    : null;
  if (revealShellBeforeReady && !showBlockingLoader) {
    elements.landingView.hidden = true;
    elements.dashboard.hidden = false;
  }
  syncDashboardTabAvailability();
  setActiveTab('navdle', { skipAutoEnsure: true });
  if (revealShellBeforeReady && !showBlockingLoader) {
    renderDailyTab();
  }
  const ready = await ensureDailyGameReady({ focusInput: options.focusInput !== false });
  if (showBlockingLoader || !revealShellBeforeReady) {
    elements.landingView.hidden = true;
    elements.dashboard.hidden = false;
    syncDashboardTabAvailability();
  }
  if (showBlockingLoader) {
    endDashboardLoadingState(previousVisibility, false);
  }
  if (!ready) {
    setBanner(state.daily.error || 'Daily airport data could not be loaded.', 'warning');
  }
}

async function openDailyExperienceFromHash(options = {}) {
  if (!isDailyHashRoute()) {
    return false;
  }
  if (isLegacyDailyHashRoute()) {
    updateUrlHash(DAILY_GAME_HASH, { replace: true });
  }
  await openDailyExperience({
    focusInput: Boolean(options.focusInput),
    revealShellBeforeReady: options.revealShellBeforeReady,
    showBlockingLoader: options.showBlockingLoader,
    syncHash: false,
  });
  return true;
}

function updateDailySuggestions() {
  if (!state.daily.dataset?.airports || !state.daily.challenge) {
    state.daily.suggestions = [];
    state.daily.selectedSuggestionIndex = -1;
    renderDailyTab();
    return;
  }
  const guessedIds = new Set(getDailySession().guesses);
  state.daily.suggestions = buildAirportSuggestions(
    state.daily.dataset.airports,
    state.daily.query,
    guessedIds,
  );
  state.daily.selectedSuggestionIndex = state.daily.suggestions.length ? 0 : -1;
  renderDailyTab();
}

function submitDailyGuessByAirport(airport) {
  const challenge = state.daily.challenge;
  if (!challenge || !airport) {
    setDailyFeedback('Pick an airport from the suggestion list first.', 'warning');
    renderDailyTab();
    return;
  }
  const session = getDailySession(challenge.dayKey);
  if (session.status !== 'in_progress' || session.guesses.length >= challenge.maxGuesses) {
    setDailyFeedback('Today\'s board is already complete.', 'warning');
    renderDailyTab();
    return;
  }
  if (session.guesses.includes(airport.id)) {
    setDailyFeedback('That airport is already on your board.', 'warning');
    renderDailyTab();
    return;
  }
  const previousStats = buildDailyStats(state.daily.history);
  const nextGuesses = [...session.guesses, airport.id];
  const solved = airport.id === challenge.target.id;
  const status = solved
    ? 'won'
    : nextGuesses.length >= challenge.maxGuesses
      ? 'lost'
      : 'in_progress';
  const nextSession = {
    guesses: nextGuesses,
    status,
    hintRevealCount: session.hintRevealCount,
    completedAt: status === 'in_progress' ? session.completedAt : new Date().toISOString(),
  };
  const nextHintState = buildDailyHintState(challenge, nextSession);
  const nextHintRevealCount = nextHintState.revealCount;
  const newlyRevealedHintCount = Math.max(nextHintRevealCount - session.hintRevealCount, 0);
  updateDailySession(challenge.dayKey, {
    ...nextSession,
    hintRevealCount: nextHintRevealCount,
  });
  const nextStats = buildDailyStats(state.daily.history);
  state.daily.pendingAnimatedGuessId = airport.id;
  state.daily.copyStatus = '';
  state.daily.pendingVictoryDayKey = solved ? challenge.dayKey : '';
  state.daily.pendingStatCelebrateKeys = solved
    ? [
      nextStats.currentStreak !== previousStats.currentStreak ? 'streak' : '',
      nextStats.winRate !== previousStats.winRate ? 'win-rate' : '',
    ].filter(Boolean)
    : [];
  state.daily.query = '';
  state.daily.suggestions = [];
  state.daily.selectedSuggestionIndex = -1;
  setDailyFeedback(
    solved
      ? `Nailed it in ${formatDailyGuessCount(nextGuesses.length)}.`
      : status === 'lost'
        ? 'Out of guesses. Today\'s airport is revealed below.'
        : newlyRevealedHintCount === 1
          ? `Hint ${formatNumber(nextHintRevealCount)} auto-revealed below.`
          : newlyRevealedHintCount > 1
            ? `${formatNumber(newlyRevealedHintCount)} hints auto-revealed below.`
            : '',
    solved ? 'success' : status === 'lost' ? 'warning' : newlyRevealedHintCount ? 'success' : 'muted',
  );
  renderLandingDailyCtas();
  renderDailyTab();
}

async function copyDailyResultToClipboard() {
  const challenge = state.daily.challenge;
  const session = getDailySession();
  if (!challenge || (session.status !== 'won' && session.status !== 'lost')) {
    return;
  }
  const comparisons = session.guesses
    .map((airportId) => state.daily.dataset?.airportsById?.get(airportId))
    .filter(Boolean)
    .map((airport) => buildAirportGuessComparison(airport, challenge.target));
  const text = buildDailyShareText(challenge, session, comparisons, {
    shareUrl: getDailyShareUrl(),
  });
  try {
    await navigator.clipboard.writeText(text);
    state.daily.copyStatus = 'copied';
    setDailyFeedback(
      session.status === 'won'
        ? 'Results copied. Paste them anywhere.'
        : 'Results copied. Paste them anywhere.',
      'success',
    );
  } catch {
    state.daily.copyStatus = 'error';
    setDailyFeedback('Clipboard access failed in this browser. Try Copy results again.', 'warning');
  }
  renderDailyTab();
}

function setCardleFeedback(message, tone = 'muted') {
  state.cardle.feedback = message;
  state.cardle.feedbackTone = tone;
}

function getCardleShareUrl() {
  if (typeof window === 'undefined' || !window.location) {
    return CARDLE_GAME_HASH;
  }
  const url = new URL(window.location.href);
  url.hash = CARDLE_GAME_HASH.slice(1);
  return url.toString();
}

function getCardleHintState(session) {
  const revealAll = session.status === 'won' || session.status === 'lost';
  const mapUnlocked = revealAll || session.guesses.length >= CARDLE_MAP_REVEAL_GUESS;
  const modelUnlocked = revealAll || session.guesses.length >= CARDLE_MODEL_REVEAL_GUESS;
  return {
    revealAll,
    mapUnlocked,
    modelUnlocked,
    revealCount: (mapUnlocked ? 1 : 0) + (modelUnlocked ? 1 : 0),
  };
}

function resetCardleHotspotState() {
  disposeCardleHotspotMap();
  state.cardle.hotspot = {
    modelId: '',
    loading: false,
    error: '',
    data: null,
  };
}

function resetCardleModelStageState() {
  state.cardle.modelStage = {
    modelId: '',
    loading: false,
    available: null,
    error: '',
    resolvedUrl: '',
  };
}

function disposeCardleHotspotMap() {
  if (state.cardle.map.instance) {
    state.cardle.map.instance.remove();
  }
  state.cardle.map.instance = null;
  state.cardle.map.markerLayer = null;
  state.cardle.map.modelId = '';
}

function ensureCardleHotspotMapInstance() {
  if (!window.L) {
    return null;
  }
  const mapCanvas = elements.cardleIntelPanel.querySelector('#cardle-hotspot-map-canvas');
  if (!(mapCanvas instanceof HTMLElement)) {
    disposeCardleHotspotMap();
    return null;
  }
  if (state.cardle.map.instance && state.cardle.map.instance.getContainer() === mapCanvas) {
    return state.cardle.map.instance;
  }
  if (state.cardle.map.instance) {
    disposeCardleHotspotMap();
  }
  const map = window.L.map(mapCanvas, {
    worldCopyJump: true,
    minZoom: 1,
    maxZoom: CARDLE_MAP_MAX_ZOOM,
    zoomControl: true,
    zoomSnap: 0.25,
    zoomDelta: 0.5,
    preferCanvas: true,
  });
  window.L.tileLayer(LEAFLET_TILE_URL, {
    attribution: LEAFLET_TILE_ATTRIBUTION,
  }).addTo(map);
  map.setView(CARDLE_MAP_BASE_VIEW.center, CARDLE_MAP_BASE_VIEW.zoom);
  state.cardle.map.instance = map;
  state.cardle.map.markerLayer = null;
  state.cardle.map.modelId = '';
  return map;
}

function invalidateLeafletMap(map) {
  if (!map || typeof map.invalidateSize !== 'function') {
    return;
  }
  const container = typeof map.getContainer === 'function' ? map.getContainer() : null;
  if (!(container instanceof HTMLElement) || !container.isConnected) {
    return;
  }
  try {
    map.invalidateSize();
  } catch {
    // Leaflet can throw if the container was removed during a rerender.
  }
}

function syncCardleHotspotMap(challenge, session) {
  const target = challenge?.target;
  const hintState = getCardleHintState(session);
  if (!target || !hintState.mapUnlocked || !window.L) {
    disposeCardleHotspotMap();
    return;
  }
  const map = ensureCardleHotspotMapInstance();
  if (!map) {
    return;
  }
  if (state.cardle.map.markerLayer) {
    map.removeLayer(state.cardle.map.markerLayer);
    state.cardle.map.markerLayer = null;
  }
  const coordinates = state.cardle.hotspot.modelId === target.id && Array.isArray(state.cardle.hotspot.data?.coordinates)
    ? state.cardle.hotspot.data.coordinates
    : [];
  const markers = coordinates
    .map((point, index) => {
      const longitude = Number(point?.[0]);
      const latitude = Number(point?.[1]);
      if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) {
        return null;
      }
      const marker = window.L.circleMarker([latitude, longitude], {
        radius: 5.5,
        color: '#ec7f35',
        weight: 1.1,
        fillColor: '#ec7f35',
        fillOpacity: 0.42,
      });
      marker.bindPopup(
        `<strong>Hotspot ${formatNumber(index + 1)}</strong><br>Lat ${latitude.toFixed(2)} / Lon ${longitude.toFixed(2)}`,
        { maxWidth: 220 },
      );
      return marker;
    })
    .filter(Boolean);
  if (markers.length) {
    const markerLayer = window.L.layerGroup(markers);
    markerLayer.addTo(map);
    state.cardle.map.markerLayer = markerLayer;
    if (markers.length === 1) {
      map.setView(markers[0].getLatLng(), CARDLE_MAP_SINGLE_POINT_ZOOM);
    } else {
      const bounds = window.L.latLngBounds(markers.map((marker) => marker.getLatLng()));
      map.fitBounds(bounds.pad(0.3), {
        padding: [18, 18],
        maxZoom: CARDLE_MAP_MAX_ZOOM,
      });
    }
  } else {
    map.setView(CARDLE_MAP_BASE_VIEW.center, CARDLE_MAP_BASE_VIEW.zoom);
  }
  state.cardle.map.modelId = target.id;
  requestAnimationFrame(() => {
    invalidateLeafletMap(map);
  });
}

function getCardleTargetValue(row, key) {
  if (!row) {
    return null;
  }
  if (key === 'firstFlight') {
    return row.firstFlight;
  }
  if (key === 'rarity') {
    return row.rareness;
  }
  if (key === 'wingspan') {
    return row.wingspan;
  }
  if (key === 'speed') {
    return row.maxSpeed;
  }
  if (key === 'range') {
    return row.range;
  }
  if (key === 'ceiling') {
    return row.ceiling;
  }
  if (key === 'seats') {
    return row.seats;
  }
  if (key === 'weight') {
    return row.mtow;
  }
  return null;
}

function formatCardleRange(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `${formatNumber(number)} nm` : 'N/A';
}

function formatCardleCeiling(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `${formatNumber(number)} ft` : 'N/A';
}

function formatCardleLength(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? `${formatNumber(number)} m` : 'N/A';
}

function formatCardleCatchableRegistrations(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? formatNumber(number) : 'N/A';
}

function formatCardleEngineProfile(row) {
  const count = Number(row?.engNum);
  const engineLabel = CARDLE_ENGINE_TYPE_LABELS[String(row?.engType || '').trim().toUpperCase()] || 'Engine';
  if (Number.isFinite(count) && count > 0) {
    return `${formatNumber(count)} x ${engineLabel}`;
  }
  return engineLabel;
}

function formatCardleType(value) {
  const key = String(value || '').trim().toUpperCase() || 'unknown';
  return CARDLE_TYPE_LABELS[key] || CARDLE_TYPE_LABELS.unknown;
}

function formatCardleCategory(value) {
  return value ? formatLabel(value) : 'Unknown';
}

function formatCardleService(row) {
  return row?.military ? 'Military' : 'Civil';
}

function buildCardleSupportItems(row, options = {}) {
  const revealed = options.revealed !== false;
  const hiddenValue = 'Locked';
  return [
    {
      label: 'Type',
      value: row && revealed ? formatCardleType(row.type) : hiddenValue,
    },
    {
      label: 'Category',
      value: row && revealed ? formatCardleCategory(row.category) : hiddenValue,
    },
    {
      label: 'Propulsion',
      value: row && revealed ? formatCardleEngineProfile(row) : hiddenValue,
    },
    {
      label: 'Length',
      value: row && revealed ? formatCardleLength(row.length) : hiddenValue,
    },
    {
      label: 'Catchable regs',
      value: row && revealed ? formatCardleCatchableRegistrations(row.possibleRegistrations) : hiddenValue,
    },
    {
      label: 'Service',
      value: row && revealed ? formatCardleService(row) : hiddenValue,
    },
  ];
}

const CARDLE_SUPPORT_TRACKER_SPECS = Object.freeze([
  {
    key: 'manufacturer',
    label: 'Manufacturer',
    mode: 'exact',
    placeholder: '?',
    getRawValue: (row) => row?.manufacturer,
    formatTargetValue: (row) => row?.manufacturer || '?',
  },
  {
    key: 'name',
    label: 'Name',
    mode: 'reveal-only',
    placeholder: '?',
    formatTargetValue: (row) => row?.name || '?',
  },
  {
    key: 'type',
    label: 'Type',
    mode: 'exact',
    placeholder: '?',
    getRawValue: (row) => row?.type,
    formatTargetValue: (row) => formatCardleType(row?.type),
  },
  {
    key: 'category',
    label: 'Category',
    mode: 'exact',
    placeholder: '?',
    getRawValue: (row) => row?.category,
    formatTargetValue: (row) => formatCardleCategory(row?.category),
  },
  {
    key: 'propulsion',
    label: 'Propulsion',
    mode: 'exact',
    placeholder: '?',
    getRawValue: (row) => `${Number(row?.engNum) || 0}|${String(row?.engType || '').trim().toUpperCase()}`,
    formatTargetValue: (row) => formatCardleEngineProfile(row),
  },
  {
    key: 'length',
    label: 'Length',
    mode: 'numeric',
    placeholder: '--',
    getRawValue: (row) => row?.length,
    formatTargetValue: (row) => formatCardleLength(row?.length),
    formatNumericValue: (value) => formatCardleLength(value),
    getNearThreshold: (targetValue) => Math.max(1.5, Number(targetValue) * 0.08),
  },
  {
    key: 'catchable-registrations',
    label: 'Catchable regs',
    mode: 'numeric',
    placeholder: '--',
    getRawValue: (row) => row?.possibleRegistrations,
    formatTargetValue: (row) => formatCardleCatchableRegistrations(row?.possibleRegistrations),
    formatNumericValue: (value) => formatCardleCatchableRegistrations(value),
    getNearThreshold: (targetValue) => Math.max(25, Number(targetValue) * 0.12),
  },
  {
    key: 'service',
    label: 'Service',
    mode: 'exact',
    placeholder: '?',
    getRawValue: (row) => row?.military ? 'military' : 'civil',
    formatTargetValue: (row) => formatCardleService(row),
  },
]);

function normalizeCardleTrackerToken(value) {
  return sanitizeText(value).trim().toUpperCase();
}

function getCardleTrackerTile(entry, key) {
  return entry?.comparison?.tiles?.find((tile) => tile.key === key) || null;
}

function getCardleTrackerMetric(entry, key, target) {
  const tile = getCardleTrackerTile(entry, key);
  const guessValue = Number(tile?.rawValue);
  const targetValue = Number(getCardleTargetValue(target, key));
  if (!Number.isFinite(guessValue) || !Number.isFinite(targetValue)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(guessValue - targetValue);
}

function pickCardleTrackerEntry(entries, key, target) {
  return entries.reduce((bestEntry, entry) => {
    if (!bestEntry) {
      return entry;
    }
    const bestMetric = getCardleTrackerMetric(bestEntry, key, target);
    const entryMetric = getCardleTrackerMetric(entry, key, target);
    if (entryMetric !== bestMetric) {
      return entryMetric < bestMetric ? entry : bestEntry;
    }
    const bestTone = CARDLE_TONE_ORDER[getCardleTrackerTile(bestEntry, key)?.tone] ?? -1;
    const entryTone = CARDLE_TONE_ORDER[getCardleTrackerTile(entry, key)?.tone] ?? -1;
    if (entryTone !== bestTone) {
      return entryTone > bestTone ? entry : bestEntry;
    }
    return (entry?.guessNumber || 0) >= (bestEntry?.guessNumber || 0) ? entry : bestEntry;
  }, null);
}

function buildCardleTrackerTiles(entries, target) {
  return CARDLE_TILE_SPECS.map((spec) => {
    const bestEntry = pickCardleTrackerEntry(entries, spec.key, target);
    if (!bestEntry) {
      return {
        ...spec,
        tone: 'pending',
        value: '--',
        indicator: '',
        rawValue: null,
      };
    }
    const bestTile = getCardleTrackerTile(bestEntry, spec.key);
    return {
      ...bestTile,
      key: spec.key,
      label: bestTile?.label || spec.label,
    };
  });
}

function buildCardleNumericSupportItem(spec, entries, target) {
  const targetValue = Number(spec.getRawValue(target));
  if (!Number.isFinite(targetValue)) {
    return {
      label: spec.label,
      value: spec.placeholder,
      tone: 'pending',
      indicator: '',
    };
  }
  const bestEntry = entries.reduce((bestMatch, entry) => {
    const entryValue = Number(spec.getRawValue(entry?.model));
    if (!Number.isFinite(entryValue)) {
      return bestMatch;
    }
    if (!bestMatch) {
      return entry;
    }
    const bestValue = Number(spec.getRawValue(bestMatch?.model));
    const bestMetric = Math.abs(bestValue - targetValue);
    const entryMetric = Math.abs(entryValue - targetValue);
    if (entryMetric !== bestMetric) {
      return entryMetric < bestMetric ? entry : bestMatch;
    }
    return (entry?.guessNumber || 0) >= (bestMatch?.guessNumber || 0) ? entry : bestMatch;
  }, null);
  if (!bestEntry) {
    return {
      label: spec.label,
      value: spec.placeholder,
      tone: 'pending',
      indicator: '',
    };
  }
  const guessValue = Number(spec.getRawValue(bestEntry.model));
  const delta = Math.abs(guessValue - targetValue);
  const tone = delta <= 0.05
    ? 'hit'
    : delta <= spec.getNearThreshold(targetValue)
      ? 'near'
      : 'miss';
  return {
    label: spec.label,
    value: spec.formatNumericValue(guessValue),
    tone,
    indicator: tone === 'hit' ? '' : guessValue < targetValue ? '\u2191' : '\u2193',
  };
}

function buildCardleTrackerSupportItems(entries, target, options = {}) {
  const revealed = options.revealed === true;
  return CARDLE_SUPPORT_TRACKER_SPECS.map((spec) => {
    if (revealed) {
      return {
        label: spec.label,
        value: spec.formatTargetValue(target),
        tone: 'hit',
        indicator: '',
      };
    }
    if (spec.mode === 'reveal-only') {
      return {
        label: spec.label,
        value: spec.placeholder,
        tone: 'pending',
        indicator: '',
      };
    }
    if (spec.mode === 'numeric') {
      return buildCardleNumericSupportItem(spec, entries, target);
    }
    const targetValue = normalizeCardleTrackerToken(spec.getRawValue(target));
    const matchedEntry = targetValue
      ? entries.reduce((latestMatch, entry) => (
        normalizeCardleTrackerToken(spec.getRawValue(entry?.model)) === targetValue ? entry : latestMatch
      ), null)
      : null;
    if (!matchedEntry) {
      return {
        label: spec.label,
        value: spec.placeholder,
        tone: 'pending',
        indicator: '',
      };
    }
    return {
      label: spec.label,
      value: spec.formatTargetValue(target),
      tone: 'hit',
      indicator: '',
    };
  });
}

function buildCardleCardStatsHtml(comparison) {
  return `
    <dl class="aircraft-card-stats cardle-card-stats">
      ${comparison.tiles.map((tile) => `
        <div class="aircraft-card-stat is-${escapeHtml(tile.tone)}">
          <dt>${escapeHtml(tile.label)}</dt>
          <dd>
            <span>${escapeHtml(tile.value)}</span>
            ${tile.indicator ? `<span class="cardle-stat-indicator" aria-hidden="true">${escapeHtml(tile.indicator)}</span>` : ''}
          </dd>
        </div>
      `).join('')}
    </dl>
  `;
}

function buildCardleSupportPillHtml(item, options = {}) {
  const compactClass = options.compact ? ' is-compact' : '';
  const toneClass = item?.tone ? ` is-${item.tone}` : '';
  return `
    <span class="cardle-support-pill${compactClass}${toneClass}">
      <span class="cardle-support-pill-label">${escapeHtml(item.label)}</span>
      <span class="cardle-support-pill-main">
        <strong class="cardle-support-pill-value${item?.tone === 'pending' ? ' is-pending' : ''}">${escapeHtml(item.value)}</strong>
        ${item?.indicator ? `<span class="cardle-support-pill-indicator" aria-hidden="true">${escapeHtml(item.indicator)}</span>` : ''}
      </span>
    </span>
  `;
}

function buildCardleGuessCardHtml(entry, options = {}) {
  const row = entry.model;
  const comparison = entry.comparison;
  const imageCandidates = buildAircraftImageCandidates(row);
  const imageUrl = imageCandidates[0] || '';
  const supportItems = buildCardleSupportItems(row).slice(0, 3);
  const summaryText = comparison.solved
    ? `Solved in ${formatDailyGuessCount(entry.guessNumber)}`
    : `${formatNumber(comparison.exactCount)} exact / ${formatNumber(comparison.nearCount)} near`;
  return `
    <article class="aircraft-card cardle-guess-card${comparison.solved ? ' is-solved' : ''}${options.isFresh ? ' is-fresh' : ''}">
      <div class="aircraft-card-media${imageUrl ? '' : ' is-fallback'}">
        ${imageUrl
    ? `<img
            class="aircraft-card-image"
            src="${escapeHtml(imageUrl)}"
            data-image-candidates="${escapeHtml(imageCandidates.join('|'))}"
            data-image-index="0"
            alt="${escapeHtml(row.displayName)}"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
          >`
    : ''}
        <div class="aircraft-card-image-fallback">Image unavailable</div>
      </div>
      <div class="aircraft-card-body">
        <div class="aircraft-card-head">
          <div class="aircraft-card-title-block">
            <p class="aircraft-card-manufacturer">${escapeHtml(row.manufacturer)}</p>
            <h4 class="aircraft-card-name" title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</h4>
            <div class="aircraft-card-inline-metrics cardle-guess-inline-metrics">
              <span class="cardle-inline-pill">${escapeHtml(summaryText)}</span>
            </div>
            <div class="cardle-guess-support">
              ${supportItems.map((item) => buildCardleSupportPillHtml(item, { compact: true })).join('')}
            </div>
          </div>
          <div class="aircraft-card-badges">
            <span class="cardle-guess-badge${comparison.solved ? ' is-solved' : ''}">${escapeHtml(comparison.solved ? 'Solved' : `Guess ${entry.guessNumber}`)}</span>
          </div>
        </div>
        <div class="aircraft-card-stats-block">
          <p class="aircraft-card-model">ICAO ${escapeHtml(row.icao)}</p>
          ${buildCardleCardStatsHtml(comparison)}
        </div>
      </div>
    </article>
  `;
}

function buildCardleEntries(challenge, session) {
  return session.guesses
    .map((modelId, index) => {
      const model = state.cardle.dataset?.modelsById?.get(modelId);
      if (!model) {
        return null;
      }
      return {
        model,
        guessNumber: index + 1,
        comparison: buildCardleGuessComparison(model, challenge.target),
      };
    })
    .filter(Boolean);
}

function renderCardleBoard(challenge, session, entries = buildCardleEntries(challenge, session)) {
  elements.cardleBoardMeta.hidden = false;
  elements.cardleBoardMeta.textContent = `Best-so-far clues stay pinned above while newest guesses stack here. The hotspot map unlocks on guess ${formatNumber(CARDLE_MAP_REVEAL_GUESS)} and the 3D reveal on guess ${formatNumber(CARDLE_MODEL_REVEAL_GUESS)}.`;
  if (!entries.length) {
    elements.cardleBoard.innerHTML = `
      <div class="daily-board-empty">
        Compact guess cards will stack here. The tracker above will keep your strongest clue in each category after the first guess.
      </div>
    `;
    return [];
  }
  const displayEntries = [...entries].reverse();
  const animatedGuessId = state.cardle.pendingAnimatedGuessId;
  elements.cardleBoard.innerHTML = `
    <div class="cardle-board-stack">
      ${displayEntries.map((entry) => buildCardleGuessCardHtml(entry, { isFresh: animatedGuessId && entry.model.id === animatedGuessId })).join('')}
    </div>
  `;
  if (animatedGuessId) {
    state.cardle.pendingAnimatedGuessId = '';
  }
  return displayEntries.map((entry) => entry.comparison);
}

function renderCardleBriefing(challenge, session) {
  const maxGuesses = Number(challenge?.maxGuesses || CARDLE_MAX_GUESSES);
  const remainingGuesses = Math.max(maxGuesses - session.guesses.length, 0);
  const hintState = getCardleHintState(session);
  const mapRemaining = Math.max(CARDLE_MAP_REVEAL_GUESS - session.guesses.length, 0);
  const modelRemaining = Math.max(CARDLE_MODEL_REVEAL_GUESS - session.guesses.length, 0);
  let statusCopy = 'The hotspot map unlocks on guess 3 and the 3D reveal on guess 5.';
  if (session.status === 'won') {
    statusCopy = 'Board cleared. The answer, hotspot map, and 3D reveal are now fully open below.';
  } else if (session.status === 'lost') {
    statusCopy = 'Out of guesses. The answer and both reveals are now fully open below.';
  } else if (!hintState.mapUnlocked) {
    statusCopy = `Hotspot map unlocks after ${formatNumber(mapRemaining)} more ${mapRemaining === 1 ? 'guess' : 'guesses'}.`;
  } else if (!hintState.modelUnlocked) {
    statusCopy = `Hotspot map live. The 3D reveal unlocks after ${formatNumber(modelRemaining)} more ${modelRemaining === 1 ? 'guess' : 'guesses'}.`;
  } else {
    statusCopy = 'Hotspot map and 3D reveal are both live. Keep following the pinned clues below.';
  }
  elements.cardleBriefing.innerHTML = `
    <div class="daily-briefing-card">
      <div class="daily-briefing-head">
        <div class="daily-briefing-copy">
          <div class="daily-widget-head">
            <span class="daily-widget-kicker">Guesses left</span>
            <strong class="daily-widget-value">${formatNumber(remainingGuesses)}</strong>
            <span class="daily-widget-note">of ${formatNumber(maxGuesses)} left</span>
          </div>
        </div>
      </div>
      <div class="daily-runway-lights" aria-hidden="true">
        ${Array.from({ length: maxGuesses }, (_, index) => buildDailyRunwayLightHtml(index, session.guesses.length, session.status)).join('')}
      </div>
      <div class="daily-briefing-foot">
        <p class="daily-hint-note">${escapeHtml(statusCopy)}</p>
      </div>
    </div>
  `;
}

function getCardleCopyButtonConfig(challenge, session, options = {}) {
  if (!challenge || (session.status !== 'won' && session.status !== 'lost')) {
    return null;
  }
  const celebrateSolve = Boolean(options?.celebrateSolve);
  const isVictory = session.status === 'won';
  if (state.cardle.copyStatus === 'copied') {
    return {
      className: `region-action-button daily-copy-button${isVictory ? ' is-victory' : ' is-loss'} is-copied`,
      label: 'Copied',
    };
  }
  if (state.cardle.copyStatus === 'error') {
    return {
      className: `region-action-button daily-copy-button${isVictory ? ' is-victory' : ' is-loss'} is-error`,
      label: 'Copy results',
      note: 'Try again',
    };
  }
  return {
    className: `region-action-button daily-copy-button${isVictory ? ` is-victory${celebrateSolve ? ' is-celebrating' : ''}` : ' is-loss'}`,
    label: 'Copy results',
    note: isVictory ? `${formatDailyGuessCount(session.guesses.length)} logged` : 'Share-ready grid',
  };
}

function buildCardleTargetComparison(target) {
  return buildCardleGuessComparison(target, target);
}

function buildCardleTrackerStatsHtml(entries, target, revealed) {
  return buildCardleCardStatsHtml(
    revealed
      ? buildCardleTargetComparison(target)
      : { tiles: buildCardleTrackerTiles(entries, target) },
  );
}

function buildCardleIntelStatusCopy(session, entries = []) {
  const hintState = getCardleHintState(session);
  if (session.status === 'won') {
    return 'Board cleared. The full target profile, hotspot map, 3D reveal, and share-ready result are all live.';
  }
  if (session.status === 'lost') {
    return 'Board complete. The target profile is fully revealed so you can review it against the guesses below.';
  }
  if (!entries.length) {
    return 'Placeholders stay pinned until the first guess. Exact matches lock in green while closer values replace weaker clues.';
  }
  if (!hintState.mapUnlocked) {
    const remaining = Math.max(CARDLE_MAP_REVEAL_GUESS - session.guesses.length, 0);
    return `Each box keeps your closest clue so far. The hotspot map unlocks after ${formatNumber(remaining)} more ${remaining === 1 ? 'guess' : 'guesses'}.`;
  }
  if (!hintState.modelUnlocked) {
    const remaining = Math.max(CARDLE_MODEL_REVEAL_GUESS - session.guesses.length, 0);
    return `Each box keeps your closest clue so far. The hotspot map is live and the 3D reveal unlocks after ${formatNumber(remaining)} more ${remaining === 1 ? 'guess' : 'guesses'}.`;
  }
  return 'Each box keeps your closest clue so far. The hotspot map and 3D reveal are both live.';
}

function buildCardleStageOverlayHtml({ label = '', badge = '', live = false, footPills = [] } = {}) {
  const pills = (Array.isArray(footPills) ? footPills : [])
    .map((pill) => ({
      text: sanitizeText(pill?.text),
      tone: sanitizeText(pill?.tone),
    }))
    .filter((pill) => pill.text);
  return `
    <div class="cardle-stage-overlay" aria-hidden="true">
      <div class="cardle-stage-overlay-top">
        ${label ? `<span class="cardle-stage-overlay-label">${escapeHtml(label)}</span>` : '<span></span>'}
        ${badge ? `<span class="cardle-stage-chip${live ? ' is-live' : ''}">${escapeHtml(badge)}</span>` : ''}
      </div>
      ${pills.length ? `
        <div class="cardle-stage-overlay-foot">
          ${pills.map((pill) => `<span class="cardle-stage-overlay-pill${pill.tone ? ` is-${pill.tone}` : ''}">${escapeHtml(pill.text)}</span>`).join('')}
        </div>
      ` : ''}
    </div>
  `;
}

function buildCardleModelStageHtml(challenge, session) {
  const target = challenge?.target;
  if (!target) {
    return '';
  }
  const hintState = getCardleHintState(session);
  const revealed = hintState.modelUnlocked;
  if (revealed) {
    void ensureCardleModelStageAsset(challenge, session);
  }
  const modelViewerReady = typeof window.customElements?.get === 'function'
    && Boolean(window.customElements.get('model-viewer'));
  const stageState = state.cardle.modelStage.modelId === target.id
    ? state.cardle.modelStage
    : {
      loading: false,
      available: null,
      error: '',
      resolvedUrl: '',
    };
  const modelUrl = stageState.resolvedUrl || '';
  const fallbackLabel = revealed
    ? stageState.loading
      ? 'Checking 3D asset'
      : !modelUrl
        ? '3D asset unavailable'
        : !modelViewerReady
          ? '3D viewer unavailable'
          : ''
    : '';
  const overlayPills = revealed
    ? stageState.loading
      ? [{ text: 'Checking GLB', tone: 'warning' }]
      : !modelUrl
        ? [{ text: 'GLB unavailable', tone: 'muted' }]
        : !modelViewerReady
          ? [{ text: 'Viewer unavailable', tone: 'muted' }]
          : []
    : [];
  return `
    <section class="cardle-reveal-panel is-model-stage">
      <div class="cardle-model-shell${revealed ? ' is-revealed' : ' is-concealed'}">
        ${buildCardleStageOverlayHtml({
    label: '3D reveal',
    badge: revealed ? 'Live' : `Guess ${CARDLE_MODEL_REVEAL_GUESS}`,
    live: revealed,
    footPills: overlayPills,
  })}
        ${revealed && modelUrl && modelViewerReady ? `
          <model-viewer
            class="cardle-target-model"
            src="${escapeHtml(modelUrl)}"
            camera-controls
            auto-rotate
            disable-pan
          ></model-viewer>
        ` : ''}
        ${fallbackLabel ? `<div class="aircraft-card-image-fallback">${escapeHtml(fallbackLabel)}</div>` : ''}
        ${revealed ? '' : `
          <div class="cardle-stage-redaction" aria-hidden="true">
            <span class="cardle-stage-redaction-label">Unlock on guess ${escapeHtml(formatNumber(CARDLE_MODEL_REVEAL_GUESS))}</span>
          </div>
        `}
      </div>
    </section>
  `;
}

function buildCardleMapStageHtml(challenge, session) {
  const target = challenge?.target;
  if (!target) {
    return '';
  }
  const hintState = getCardleHintState(session);
  if (hintState.mapUnlocked) {
    void ensureCardleHotspotHint(challenge, session);
  }
  const coordinates = Array.isArray(state.cardle.hotspot.data?.coordinates)
    ? state.cardle.hotspot.data.coordinates
    : [];
  const leafletReady = Boolean(window.L);
  const overlayCopy = hintState.mapUnlocked && !leafletReady ? 'Interactive map unavailable' : '';
  const overlayPills = hintState.mapUnlocked
    ? !leafletReady
      ? [{ text: 'Map unavailable', tone: 'muted' }]
      : state.cardle.hotspot.loading
        ? [{ text: 'Syncing live hotspots', tone: 'warning' }]
        : state.cardle.hotspot.error
          ? [{ text: 'Live feed unavailable', tone: 'muted' }]
          : coordinates.length
            ? [{ text: `${formatNumber(coordinates.length)} hotspots`, tone: 'live' }]
            : [{ text: 'No hotspots returned', tone: 'muted' }]
    : [];
  return `
    <section class="cardle-reveal-panel is-map-stage">
      <div class="cardle-hotspot-shell${hintState.mapUnlocked ? ' is-revealed' : ' is-concealed'}">
        ${buildCardleStageOverlayHtml({
    label: 'Registration origins',
    badge: hintState.mapUnlocked ? 'Live' : `Guess ${CARDLE_MAP_REVEAL_GUESS}`,
    live: hintState.mapUnlocked,
    footPills: overlayPills,
  })}
        <div class="cardle-hotspot-map">
          ${hintState.mapUnlocked && leafletReady ? `
            <div
              id="cardle-hotspot-map-canvas"
              class="cardle-hotspot-map-canvas"
              aria-label="Interactive registration-origin hotspot map"
            ></div>
          ` : ''}
          ${overlayCopy ? `<p class="cardle-hotspot-empty">${escapeHtml(overlayCopy)}</p>` : ''}
        </div>
        ${hintState.mapUnlocked ? '' : `
          <div class="cardle-stage-redaction" aria-hidden="true">
            <span class="cardle-stage-redaction-label">Unlock on guess ${escapeHtml(formatNumber(CARDLE_MAP_REVEAL_GUESS))}</span>
          </div>
        `}
      </div>
    </section>
  `;
}

function setCardleIntelPanelVisualState(options = {}) {
  elements.cardleIntelPanel.classList.toggle('is-revealed', Boolean(options.revealed));
  elements.cardleIntelPanel.classList.toggle('is-victory', Boolean(options.victory));
  elements.cardleIntelPanel.classList.toggle('is-celebrating', Boolean(options.celebrating));
}

function renderCardleIntelPanel(challenge, session, entries = buildCardleEntries(challenge, session), options = {}) {
  if (!challenge?.target) {
    disposeCardleHotspotMap();
    setCardleIntelPanelVisualState();
    elements.cardleIntelPanel.innerHTML = '';
    return;
  }
  disposeCardleHotspotMap();
  const target = challenge.target;
  const revealTarget = session.status === 'won' || session.status === 'lost';
  const celebrateSolve = revealTarget && session.status === 'won' && Boolean(options?.celebrateSolve);
  setCardleIntelPanelVisualState({
    revealed: revealTarget,
    victory: session.status === 'won',
    celebrating: celebrateSolve,
  });
  const supportItems = buildCardleTrackerSupportItems(entries, target, {
    revealed: revealTarget,
  });
  const copyButtonConfig = revealTarget ? getCardleCopyButtonConfig(challenge, session, { celebrateSolve }) : null;
  const primaryTitle = revealTarget
    ? target.displayName
    : 'Best so far';
  const primarySubtitle = revealTarget
    ? session.status === 'won'
      ? `Solved in ${formatDailyGuessCount(session.guesses.length)}. ICAO ${target.icao}.`
      : `Board revealed after ${formatDailyGuessCount(session.guesses.length)}. ICAO ${target.icao}.`
    : entries.length
      ? 'Each category keeps the strongest clue you have logged so far.'
      : 'Your strongest clue in each category will pin here after the first guess.';
  const statusCopy = buildCardleIntelStatusCopy(session, entries);
  const statMetaLabel = revealTarget ? `ICAO ${target.icao}` : 'ICAO ?';
  const victoryBannerHtml = session.status === 'won'
    ? `
      <div class="daily-victory-banner${celebrateSolve ? ' is-celebrating' : ''}">
        <span class="daily-victory-banner-kicker">Solved</span>
        <strong class="daily-victory-banner-value">${escapeHtml(formatDailyGuessCount(session.guesses.length))}</strong>
        <span class="daily-victory-banner-note">${escapeHtml(statusCopy)}</span>
      </div>
    `
    : '';
  elements.cardleIntelPanel.innerHTML = `
    ${celebrateSolve ? buildDailyVictoryOverlayHtml() : ''}
    <div class="cardle-intel-head">
      <div class="cardle-intel-title-block">
        <p class="eyebrow">${escapeHtml(
    revealTarget
      ? (session.status === 'won' ? 'Direct hit' : 'Revealed aircraft')
      : 'Live comparison',
  )}</p>
        <h4 class="cardle-intel-title">${escapeHtml(primaryTitle)}</h4>
        <p class="cardle-intel-subtitle">${escapeHtml(primarySubtitle)}</p>
      </div>
      ${copyButtonConfig ? `<div class="cardle-intel-actions">${buildDailyCopyButtonHtml(copyButtonConfig)}</div>` : ''}
    </div>
    <div class="cardle-intel-layout">
      <div class="cardle-intel-primary">
        ${victoryBannerHtml || `<p class="cardle-intel-note">${escapeHtml(statusCopy)}</p>`}
        <div class="cardle-support-grid">
          ${supportItems.map((item) => buildCardleSupportPillHtml(item)).join('')}
        </div>
        <div class="aircraft-card-stats-block">
          <p class="aircraft-card-model">${escapeHtml(statMetaLabel)}</p>
          ${buildCardleTrackerStatsHtml(entries, target, revealTarget)}
        </div>
      </div>
      <div class="cardle-intel-visuals">
        ${buildCardleMapStageHtml(challenge, session)}
        ${buildCardleModelStageHtml(challenge, session)}
      </div>
    </div>
  `;
  syncCardleHotspotMap(challenge, session);
}

function renderCardleErrorState(message) {
  disposeCardleHotspotMap();
  elements.cardleCommandDeck?.classList.remove('is-victorious');
  setCardleIntelPanelVisualState();
  elements.cardleTitle.textContent = CARDLE_GAME_NAME;
  elements.cardleHeroSummary.textContent = 'Board offline';
  elements.cardleMetaGrid.innerHTML = [
    buildDailyStatusBadgeHtml('Reset', '--', 'UTC', { tone: 'reset' }),
    buildDailyStatCardHtml('Streak', '--', 'Unavailable'),
    buildDailyStatCardHtml('Win rate', '--', 'Unavailable'),
  ].join('');
  elements.cardleGuessInput.disabled = true;
  elements.cardleGuessInput.value = '';
  elements.cardleGuessInput.setAttribute('aria-expanded', 'false');
  elements.cardleSuggestionList.innerHTML = '';
  elements.cardleFeedback.hidden = false;
  elements.cardleFeedback.className = 'daily-feedback is-warning';
  elements.cardleFeedback.textContent = message;
  elements.cardleBriefing.innerHTML = '';
  elements.cardleIntelPanel.innerHTML = `
    <div class="daily-briefing-card is-warning">
      <div class="daily-briefing-head">
        <div class="daily-briefing-copy">
          <div class="daily-widget-head">
            <span class="daily-widget-kicker">Daily status</span>
            <strong class="daily-widget-value">Unavailable</strong>
          </div>
          <p class="daily-briefing-note">${escapeHtml(message)}</p>
        </div>
      </div>
    </div>
  `;
  elements.cardleBoardMeta.hidden = true;
  elements.cardleBoard.innerHTML = `
    <div class="daily-board-empty">
      Cardle data is unavailable right now. The rest of Skyviz still works normally.
    </div>
  `;
}

async function ensureCardleModelStageAsset(challenge, session) {
  if (!challenge?.target || !getCardleHintState(session).modelUnlocked) {
    return;
  }
  const modelId = String(challenge.target.id || '').trim().toUpperCase();
  if (!modelId) {
    return;
  }
  if (state.cardle.modelStage.modelId === modelId) {
    if (state.cardle.modelStage.loading) {
      return;
    }
    if (state.cardle.modelStage.available !== null) {
      return;
    }
  }
  const candidates = buildCardleModelCandidates(challenge.target);
  if (!candidates.length) {
    state.cardle.modelStage = {
      modelId,
      loading: false,
      available: false,
      error: 'No optimized GLB is available for this model.',
      resolvedUrl: '',
    };
    if (state.activeTab === 'cardle') {
      renderCardleIntelPanel(challenge, session);
    }
    return;
  }
  state.cardle.modelStage = {
    modelId,
    loading: true,
    available: null,
    error: '',
    resolvedUrl: '',
  };
  if (state.activeTab === 'cardle') {
    renderCardleIntelPanel(challenge, session);
  }
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        method: 'HEAD',
        cache: 'no-store',
      });
      if (response.ok) {
        state.cardle.modelStage = {
          modelId,
          loading: false,
          available: true,
          error: '',
          resolvedUrl: candidate,
        };
        if (state.activeTab === 'cardle') {
          renderCardleIntelPanel(challenge, session);
        }
        return;
      }
    } catch {
      continue;
    }
  }
  state.cardle.modelStage = {
    modelId,
    loading: false,
    available: false,
    error: 'No optimized GLB is available for this model.',
    resolvedUrl: '',
  };
  if (state.activeTab === 'cardle') {
    renderCardleIntelPanel(challenge, session);
  }
}

async function ensureCardleHotspotHint(challenge, session) {
  if (!challenge?.target || !getCardleHintState(session).mapUnlocked) {
    return;
  }
  const modelId = String(challenge.target.id || '').trim().toUpperCase();
  if (!modelId) {
    return;
  }
  if (state.cardle.hotspot.loading && state.cardle.hotspot.modelId === modelId) {
    return;
  }
  if (state.cardle.hotspot.modelId === modelId && (state.cardle.hotspot.data || state.cardle.hotspot.error)) {
    return;
  }
  state.cardle.hotspot = {
    modelId,
    loading: true,
    error: '',
    data: null,
  };
  if (state.activeTab === 'cardle') {
    renderCardleIntelPanel(challenge, session);
  }
  try {
    const response = await fetch(buildCardleHotspotUrl(modelId), {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'x-client-version': state.cardle.dataset?.manifest?.clientVersion || state.references?.manifest?.clientVersion || '2.0.24',
      },
    });
    if (!response.ok) {
      throw new Error(`Hotspot hint failed to load (${response.status}).`);
    }
    const payload = normalizeCardleHotspotPayload(await response.json());
    state.cardle.hotspot = {
      modelId,
      loading: false,
      error: '',
      data: payload,
    };
  } catch (error) {
    state.cardle.hotspot = {
      modelId,
      loading: false,
      error: error instanceof Error ? error.message : 'Hotspot hint failed to load.',
      data: null,
    };
  }
  if (state.cardle.challenge?.target?.id === modelId && state.activeTab === 'cardle') {
    renderCardleTab();
  }
}

function renderCardleTab() {
  if (state.cardle.error) {
    renderCardleErrorState(state.cardle.error);
    return;
  }
  const challenge = state.cardle.challenge;
  if (!challenge || !state.cardle.dataset) {
    elements.cardleCommandDeck?.classList.remove('is-victorious');
    setCardleIntelPanelVisualState();
    elements.cardleTitle.textContent = CARDLE_GAME_NAME;
    elements.cardleHeroSummary.textContent = 'Signal warming up';
    elements.cardleMetaGrid.innerHTML = [
      buildDailyStatusBadgeHtml('Reset', formatCountdown(getNextUtcResetTime().getTime() - Date.now()), 'UTC', { tone: 'reset' }),
      buildDailyStatCardHtml('Streak', '--', 'Loading'),
      buildDailyStatCardHtml('Win rate', '--', 'Loading'),
    ].join('');
    elements.cardleGuessInput.disabled = true;
    elements.cardleGuessInput.value = '';
    elements.cardleSuggestionList.innerHTML = '';
    elements.cardleFeedback.hidden = false;
    elements.cardleFeedback.className = 'daily-feedback is-muted';
    elements.cardleFeedback.textContent = 'Loading model data...';
    elements.cardleBriefing.innerHTML = '';
    disposeCardleHotspotMap();
    elements.cardleIntelPanel.innerHTML = '<div class="daily-board-empty">Preparing today&apos;s best-so-far tracker...</div>';
    elements.cardleBoardMeta.hidden = true;
    elements.cardleBoard.innerHTML = '<div class="daily-board-empty">Preparing today&apos;s model board...</div>';
    return;
  }

  const session = getCardleSession(challenge.dayKey);
  const entries = buildCardleEntries(challenge, session);
  const stats = buildDailyStats(state.cardle.history);
  const celebrateSolve = session.status === 'won' && state.cardle.pendingVictoryDayKey === challenge.dayKey;
  const statCelebrateKeys = new Set(celebrateSolve ? state.cardle.pendingStatCelebrateKeys : []);
  const countdown = formatCountdown(getNextUtcResetTime().getTime() - Date.now());
  const maxGuesses = Number(challenge?.maxGuesses || CARDLE_MAX_GUESSES);
  const canGuess = session.status === 'in_progress' && session.guesses.length < maxGuesses;
  elements.cardleTitle.textContent = CARDLE_GAME_NAME;
  elements.cardleHeroSummary.textContent = canGuess
    ? 'Type an ICAO, manufacturer, or alias. Each guess feeds a pinned best-so-far tracker while the hotspot map and 3D reveal unlock in sequence.'
    : session.status === 'won'
      ? 'Board cleared. Review the revealed aircraft, 3D model, hotspot map, and share-ready grid.'
      : 'Board complete. Review the revealed aircraft, hotspot map, and 3D model.';
  elements.cardleMetaGrid.innerHTML = buildDailyMetaGridHtml(challenge, session, stats, countdown, statCelebrateKeys);
  elements.cardleGuessInput.disabled = !canGuess;
  elements.cardleGuessInput.value = state.cardle.query;
  elements.cardleGuessInput.setAttribute('aria-expanded', String(canGuess && state.cardle.suggestions.length > 0));
  elements.cardleSuggestionList.innerHTML = canGuess
    ? state.cardle.suggestions.map((model, index) => `
        <button
          class="daily-suggestion-button${index === state.cardle.selectedSuggestionIndex ? ' is-active' : ''}"
          type="button"
          role="option"
          aria-selected="${index === state.cardle.selectedSuggestionIndex}"
          data-action="select-cardle-suggestion"
          data-model-id="${escapeHtml(model.id)}"
        >
          <span class="daily-suggestion-label">${escapeHtml(buildCardleOptionLabel(model))}</span>
          <span class="daily-suggestion-meta">${escapeHtml([
      formatAircraftYear(model.firstFlight),
      formatCardleRange(model.range),
      `${formatNumber(model.seats)} seats`,
    ].join(' / '))}</span>
        </button>
      `).join('')
    : '';
  const defaultFeedback = canGuess
    ? (session.guesses.length ? '' : 'Pick a result to submit your next guess, or press Enter on an exact ICAO / model match.')
    : session.status === 'won'
      ? 'Board solved.'
      : 'Board complete.';
  const feedbackText = state.cardle.feedback || defaultFeedback;
  elements.cardleFeedback.hidden = !feedbackText;
  elements.cardleFeedback.className = `daily-feedback is-${escapeHtml(state.cardle.feedbackTone || 'muted')}`;
  elements.cardleFeedback.textContent = feedbackText;
  renderCardleBriefing(challenge, session);
  renderCardleIntelPanel(challenge, session, entries, { celebrateSolve });
  renderCardleBoard(challenge, session, entries);
  elements.cardleCommandDeck?.classList.toggle('is-victorious', celebrateSolve);
  if (state.ui.pendingCardleInputFocus) {
    focusCardleGuessInput();
  }
  if ((session.status === 'won' || session.status === 'lost') && !state.cardle.feedback) {
    setCardleFeedback(
      session.status === 'won'
        ? `Cleared in ${formatDailyGuessCount(session.guesses.length)}. The share grid is ready.`
        : 'No solve today. The answer, hotspot map, and 3D reveal are shown above.',
      session.status === 'won' ? 'success' : 'warning',
    );
    elements.cardleFeedback.className = `daily-feedback is-${escapeHtml(state.cardle.feedbackTone)}`;
    elements.cardleFeedback.textContent = state.cardle.feedback;
  }
  if (celebrateSolve) {
    state.cardle.pendingVictoryDayKey = '';
    state.cardle.pendingStatCelebrateKeys = [];
  }
}

async function ensureCardleGameReady(options = {}) {
  const todayKey = getUtcDayKey();
  if (isCardleGameReadyForToday()) {
    if (options.focusInput) {
      state.ui.pendingCardleInputFocus = true;
    }
    renderLandingDailyCtas();
    renderCardleTab();
    scheduleDailyCountdownRefresh();
    return true;
  }
  state.cardle.error = '';
  if (options.focusInput) {
    state.ui.pendingCardleInputFocus = true;
  }
  try {
    const references = state.references?.referenceModels
      ? state.references
      : await loadCardleReferenceData();
    if (!state.references) {
      state.references = references;
    }
    if (!state.cardle.dataset) {
      state.cardle.dataset = buildCardleDataset(references);
    }
    const selection = selectDailyCardModel(state.cardle.dataset.models, todayKey);
    if (!selection?.model) {
      throw new Error('No aircraft model could be selected for today.');
    }
    const previousTargetId = state.cardle.challenge?.target?.id || '';
    state.cardle.dayKey = todayKey;
    state.cardle.challenge = {
      dayKey: todayKey,
      target: selection.model,
      maxGuesses: CARDLE_MAX_GUESSES,
    };
    state.cardle.query = '';
    state.cardle.suggestions = [];
    state.cardle.selectedSuggestionIndex = -1;
    state.cardle.pendingVictoryDayKey = '';
    state.cardle.pendingStatCelebrateKeys = [];
    state.cardle.copyStatus = '';
    if (previousTargetId !== selection.model.id) {
      resetCardleHotspotState();
      resetCardleModelStageState();
    }
    if (!state.cardle.feedback) {
      setCardleFeedback('', 'muted');
    }
    renderLandingDailyCtas();
    renderCardleTab();
    scheduleDailyCountdownRefresh();
    return true;
  } catch (error) {
    state.cardle.error = error instanceof Error ? error.message : 'Failed to load the daily aircraft game data.';
    renderLandingDailyCtas();
    if (state.activeTab === 'cardle') {
      renderCardleErrorState(state.cardle.error);
    }
    return false;
  }
}

async function openCardleExperience(options = {}) {
  if (options.syncHash !== false) {
    updateUrlHash(CARDLE_GAME_HASH, { replace: Boolean(options.replaceHash) });
  }
  const revealShellBeforeReady = options.revealShellBeforeReady !== false;
  const showBlockingLoader = options.showBlockingLoader !== false && !isCardleGameReadyForToday();
  const previousVisibility = showBlockingLoader
    ? beginDashboardLoadingState(`Loading ${CARDLE_GAME_NAME}...`)
    : null;
  if (revealShellBeforeReady && !showBlockingLoader) {
    elements.landingView.hidden = true;
    elements.dashboard.hidden = false;
  }
  syncDashboardTabAvailability();
  setActiveTab('cardle', { skipAutoEnsure: true });
  if (revealShellBeforeReady && !showBlockingLoader) {
    renderCardleTab();
  }
  const ready = await ensureCardleGameReady({ focusInput: options.focusInput !== false });
  if (showBlockingLoader || !revealShellBeforeReady) {
    elements.landingView.hidden = true;
    elements.dashboard.hidden = false;
    syncDashboardTabAvailability();
  }
  if (showBlockingLoader) {
    endDashboardLoadingState(previousVisibility, false);
  }
  if (!ready) {
    setBanner(state.cardle.error || 'Daily aircraft data could not be loaded.', 'warning');
  }
}

function isCardleHashRoute(hash = typeof window !== 'undefined' ? window.location?.hash : '') {
  return normalizeHashRoute(hash) === CARDLE_GAME_HASH;
}

async function openCardleExperienceFromHash(options = {}) {
  if (!isCardleHashRoute()) {
    return false;
  }
  await openCardleExperience({
    focusInput: Boolean(options.focusInput),
    revealShellBeforeReady: options.revealShellBeforeReady,
    showBlockingLoader: options.showBlockingLoader,
    syncHash: false,
  });
  return true;
}

async function openExperienceFromHash(options = {}) {
  if (await openCardleExperienceFromHash(options)) {
    return true;
  }
  return openDailyExperienceFromHash(options);
}

function updateCardleSuggestions() {
  if (!state.cardle.dataset?.models || !state.cardle.challenge) {
    state.cardle.suggestions = [];
    state.cardle.selectedSuggestionIndex = -1;
    renderCardleTab();
    return;
  }
  const guessedIds = new Set(getCardleSession().guesses);
  state.cardle.suggestions = buildCardleSuggestions(
    state.cardle.dataset.models,
    state.cardle.query,
    guessedIds,
  );
  state.cardle.selectedSuggestionIndex = state.cardle.suggestions.length ? 0 : -1;
  renderCardleTab();
}

function submitCardleGuessByModel(model) {
  const challenge = state.cardle.challenge;
  if (!challenge || !model) {
    setCardleFeedback('Pick an aircraft model from the suggestion list first.', 'warning');
    renderCardleTab();
    return;
  }
  const maxGuesses = Number(challenge?.maxGuesses || CARDLE_MAX_GUESSES);
  const session = getCardleSession(challenge.dayKey);
  if (session.status !== 'in_progress' || session.guesses.length >= maxGuesses) {
    setCardleFeedback('Today\'s board is already complete.', 'warning');
    renderCardleTab();
    return;
  }
  if (session.guesses.includes(model.id)) {
    setCardleFeedback('That model is already on your board.', 'warning');
    renderCardleTab();
    return;
  }
  const previousStats = buildDailyStats(state.cardle.history);
  const previousHintState = getCardleHintState(session);
  const nextGuesses = [...session.guesses, model.id];
  const solved = model.id === challenge.target.id;
  const status = solved
    ? 'won'
    : nextGuesses.length >= maxGuesses
      ? 'lost'
      : 'in_progress';
  const nextSession = {
    guesses: nextGuesses,
    status,
    completedAt: status === 'in_progress' ? session.completedAt : new Date().toISOString(),
  };
  const nextHintState = getCardleHintState(nextSession);
  updateCardleSession(challenge.dayKey, {
    ...nextSession,
    hintRevealCount: nextHintState.revealCount,
  });
  const nextStats = buildDailyStats(state.cardle.history);
  state.cardle.pendingAnimatedGuessId = model.id;
  state.cardle.copyStatus = '';
  state.cardle.pendingVictoryDayKey = solved ? challenge.dayKey : '';
  state.cardle.pendingStatCelebrateKeys = solved
    ? [
      nextStats.currentStreak !== previousStats.currentStreak ? 'streak' : '',
      nextStats.winRate !== previousStats.winRate ? 'win-rate' : '',
    ].filter(Boolean)
    : [];
  state.cardle.query = '';
  state.cardle.suggestions = [];
  state.cardle.selectedSuggestionIndex = -1;
  const unlockedHotspot = !previousHintState.mapUnlocked && nextHintState.mapUnlocked;
  const unlockedModel = !previousHintState.modelUnlocked && nextHintState.modelUnlocked;
  let feedback = '';
  let tone = 'muted';
  if (solved) {
    feedback = `Nailed it in ${formatDailyGuessCount(nextGuesses.length)}.`;
    tone = 'success';
  } else if (status === 'lost') {
    feedback = 'Out of guesses. Today\'s aircraft is revealed above.';
    tone = 'warning';
  } else if (unlockedHotspot && unlockedModel) {
    feedback = 'Hotspot map and 3D reveal are both unlocked.';
    tone = 'success';
  } else if (unlockedHotspot) {
    feedback = 'Hotspot map unlocked above.';
    tone = 'success';
  } else if (unlockedModel) {
    feedback = '3D reveal unlocked above.';
    tone = 'success';
  }
  setCardleFeedback(feedback, tone);
  renderLandingDailyCtas();
  renderCardleTab();
}

async function copyCardleResultToClipboard() {
  const challenge = state.cardle.challenge;
  const session = getCardleSession();
  if (!challenge || (session.status !== 'won' && session.status !== 'lost')) {
    return;
  }
  const comparisons = session.guesses
    .map((modelId) => state.cardle.dataset?.modelsById?.get(modelId))
    .filter(Boolean)
    .map((model) => buildCardleGuessComparison(model, challenge.target));
  const text = buildCardleShareText(challenge, session, comparisons, {
    shareUrl: getCardleShareUrl(),
  });
  try {
    await navigator.clipboard.writeText(text);
    state.cardle.copyStatus = 'copied';
    setCardleFeedback('Results copied. Paste them anywhere.', 'success');
  } catch {
    state.cardle.copyStatus = 'error';
    setCardleFeedback('Clipboard access failed in this browser. Try Copy results again.', 'warning');
  }
  renderCardleTab();
}

function wireBanner() {
  elements.banner.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const dismissButton = target.closest('[data-dismiss-banner]');
    if (!dismissButton) {
      return;
    }
    dismissBanner();
  });
}

function readPersistPreference() {
  try {
    return window.localStorage.getItem(PERSIST_PREFERENCE_KEY) === '1';
  } catch {
    return false;
  }
}

function writePersistPreference(enabled) {
  try {
    window.localStorage.setItem(PERSIST_PREFERENCE_KEY, enabled ? '1' : '0');
  } catch {
    // no-op: storage may be unavailable or blocked
  }
}

function clearPersistedUpload() {
  try {
    window.localStorage.removeItem(PERSISTED_UPLOAD_KEY);
  } catch {
    // no-op: storage may be unavailable or blocked
  }
}

function readPersistedUpload() {
  try {
    const raw = window.localStorage.getItem(PERSISTED_UPLOAD_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (typeof parsed.text !== 'string' || !parsed.text.length) {
      return null;
    }
    return {
      fileName: typeof parsed.fileName === 'string' && parsed.fileName ? parsed.fileName : 'saved-upload.json',
      text: parsed.text,
      savedAt: Number.isFinite(parsed.savedAt) ? parsed.savedAt : null,
    };
  } catch {
    return null;
  }
}

function writePersistedUpload(upload) {
  if (!upload?.text) {
    return false;
  }
  try {
    window.localStorage.setItem(
      PERSISTED_UPLOAD_KEY,
      JSON.stringify({
        fileName: upload.fileName || 'upload.json',
        text: upload.text,
        savedAt: Date.now(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

function normalizeManualRegistration(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function normalizeManualMappingModelId(value) {
  return String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function buildManualRegistrationMappingKey(aircraftHex, registration) {
  const normalizedHex = normalizeManualRegistration(aircraftHex);
  const normalizedRegistration = normalizeManualRegistration(registration);
  if (!normalizedHex && !normalizedRegistration) {
    return '';
  }
  return `${normalizedHex}|${normalizedRegistration}`;
}

function normalizeManualRegistrationMappingEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return null;
  }
  const aircraftHex = normalizeManualRegistration(
    entry.aircraftHex || entry.hex || entry.transponderHex || entry.lookupHex,
  );
  const registration = normalizeManualRegistration(
    entry.registration || entry.registrationRaw || entry.reg,
  );
  const modelId = normalizeManualMappingModelId(
    entry.modelId || entry.mappedModelId || entry.icao || entry.typeCode || entry.resolvedTypeCode,
  );
  const key = buildManualRegistrationMappingKey(aircraftHex, registration);
  if (!key || !modelId) {
    return null;
  }
  const updatedAt = Number(entry.updatedAt);
  return {
    key,
    aircraftHex,
    registration,
    modelId,
    updatedAt: Number.isFinite(updatedAt) ? Math.trunc(updatedAt) : Date.now(),
  };
}

function serializeManualRegistrationMappings(map) {
  if (!(map instanceof Map) || !map.size) {
    return [];
  }
  return Array.from(map.values())
    .map((entry) => normalizeManualRegistrationMappingEntry(entry))
    .filter(Boolean)
    .sort((left, right) => left.key.localeCompare(right.key));
}

function readManualRegistrationMappings() {
  const map = new Map();
  try {
    const raw = window.localStorage.getItem(MANUAL_REGISTRATION_MAPPINGS_KEY);
    if (!raw) {
      return map;
    }
    const parsed = JSON.parse(raw);
    const sourceRows = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.mappings)
        ? parsed.mappings
        : [];
    sourceRows.forEach((entry) => {
      const normalizedEntry = normalizeManualRegistrationMappingEntry(entry);
      if (!normalizedEntry) {
        return;
      }
      map.set(normalizedEntry.key, normalizedEntry);
    });
  } catch {
    return map;
  }
  return map;
}

function writeManualRegistrationMappings(map) {
  try {
    const serialized = serializeManualRegistrationMappings(map);
    if (!serialized.length) {
      window.localStorage.removeItem(MANUAL_REGISTRATION_MAPPINGS_KEY);
      return true;
    }
    window.localStorage.setItem(
      MANUAL_REGISTRATION_MAPPINGS_KEY,
      JSON.stringify({
        schema: MANUAL_REGISTRATION_MAPPINGS_EXPORT_SCHEMA,
        savedAt: Date.now(),
        mappings: serialized,
      }),
    );
    return true;
  } catch {
    return false;
  }
}

function clearManualRegistrationMappings() {
  try {
    window.localStorage.removeItem(MANUAL_REGISTRATION_MAPPINGS_KEY);
  } catch {
    // no-op: storage may be unavailable or blocked
  }
}

function buildDashboardModelWithManualMappings(payload, references) {
  return buildDashboardModel(payload, references, {
    manualRegistrationMappings: state.manualRegistrationMappings,
  });
}

function rebuildDashboardModelFromCurrentUpload() {
  if (!state.upload.text || !state.references) {
    return false;
  }
  const payload = parseUserCollection(state.upload.text, state.upload.fileName || 'local upload');
  state.model = buildDashboardModelWithManualMappings(payload, state.references);
  renderMapTab(state.model);
  renderAircraftTab(state.model);
  return true;
}

function persistCurrentUploadIfEnabled() {
  if (!elements.persistUpload.checked) {
    clearPersistedUpload();
    writePersistPreference(false);
    syncDataToolsPanelState();
    return false;
  }
  const saved = writePersistedUpload(state.upload);
  if (!saved) {
    setPersistPreferenceChecked(false);
    clearPersistedUpload();
    writePersistPreference(false);
    syncDataToolsPanelState();
    setBanner(
      'Could not save to local storage (browser storage unavailable or quota exceeded). Your data is still private and in-memory only for this session.',
      'warning',
    );
    return false;
  }
  writePersistPreference(true);
  syncDataToolsPanelState();
  return true;
}

function setDataToolsOpen(isOpen) {
  state.ui.dataToolsOpen = isOpen;
  elements.dataToolsTrigger.setAttribute('aria-expanded', String(isOpen));
  elements.dataToolsMenu.hidden = !isOpen;
  if (isOpen) {
    syncDataToolsPanelState();
  }
}

function setPersistPreferenceChecked(enabled) {
  const normalizedEnabled = Boolean(enabled);
  elements.persistUpload.checked = normalizedEnabled;
  if (elements.dataToolsPersistUpload) {
    elements.dataToolsPersistUpload.checked = normalizedEnabled;
  }
}

function describePersistPreferenceSummary() {
  const persistEnabled = Boolean(elements.persistUpload.checked);
  const hasCurrentUpload = Boolean(state.upload.text);
  const hasPersistedUpload = Boolean(readPersistedUpload()?.text);
  if (persistEnabled) {
    if (hasCurrentUpload && hasPersistedUpload) {
      return 'Current dashboard is saved in browser local storage on this device.';
    }
    if (hasCurrentUpload) {
      return 'Local save is on. Current dashboard will stay available on this device after refresh.';
    }
    return 'Local save is on. Your next successful upload will be stored only on this device.';
  }
  if (hasCurrentUpload) {
    return 'Current dashboard is in memory only. Turn this on to keep a local copy after refresh.';
  }
  return 'Local save is off. Nothing is stored on this device.';
}

function describeDataToolsCollectionSummary() {
  if (!state.upload.text) {
  return 'Upload a collection export JSON file to start a dashboard in this browser.';
  }
  if (state.upload.fileName === 'skyviz_try_now_user.json') {
    return 'Built-in sample deck is active. Uploading a JSON export replaces the current in-browser view.';
  }
  return `Loaded source: ${state.upload.fileName}. Uploading a new JSON export replaces the current in-browser view.`;
}

function syncDataToolsPanelState() {
  const persistEnabled = Boolean(elements.persistUpload.checked);
  if (elements.dataToolsPersistUpload) {
    elements.dataToolsPersistUpload.checked = persistEnabled;
  }
  if (elements.dataToolsPersistStatus) {
    elements.dataToolsPersistStatus.textContent = persistEnabled ? 'On' : 'Off';
    elements.dataToolsPersistStatus.classList.toggle('is-enabled', persistEnabled);
    elements.dataToolsPersistStatus.classList.toggle('is-disabled', !persistEnabled);
  }
  if (elements.dataToolsPersistSummary) {
    elements.dataToolsPersistSummary.textContent = describePersistPreferenceSummary();
  }
  if (elements.dataToolsCollectionSummary) {
    elements.dataToolsCollectionSummary.textContent = describeDataToolsCollectionSummary();
  }
}

function handlePersistPreferenceChange(enabled) {
  setPersistPreferenceChecked(enabled);
  writePersistPreference(enabled);
  if (!enabled) {
    clearPersistedUpload();
    syncDataToolsPanelState();
    if (state.model) {
      setUploadStatus('Current upload is private in-memory only for this session.');
      setBanner('Local save disabled. Any saved upload has been removed from this device.', 'info');
    }
    return;
  }
  if (!state.upload.text) {
    syncDataToolsPanelState();
    setBanner('Local save enabled. Your next successful upload will be saved only on this device.', 'info');
    return;
  }
  const saved = writePersistedUpload(state.upload);
  if (!saved) {
    setPersistPreferenceChecked(false);
    clearPersistedUpload();
    writePersistPreference(false);
    syncDataToolsPanelState();
    setBanner(
      'Could not save to local storage (browser storage unavailable or quota exceeded). Data remains private in-memory only.',
      'warning',
    );
    return;
  }
  syncDataToolsPanelState();
  setUploadStatus('Current upload saved only on this device (local storage).');
  setBanner('Upload saved locally on this device. Skyviz does not send your collection to a server.', 'info');
}

function resetRegistrationModalState() {
  state.ui.registrationModalOpen = false;
  state.ui.registrationModalQuery = '';
  state.ui.registrationModalConfidence = 'all';
  state.ui.registrationModalPage = 1;
  state.ui.registrationManualEditKey = '';
  state.ui.registrationManualEditModelId = '';
  state.ui.registrationModelOptionsSignature = '';
}

function resetModelRegsModalState() {
  state.ui.modelRegsModalOpen = false;
  state.ui.modelRegsModalModelId = null;
  state.ui.modelRegsModalFocusModelId = null;
  state.ui.modelRegsModalPage = 1;
}

function resetAircraftDetailModalState() {
  state.ui.aircraftDetailModalOpen = false;
  state.ui.aircraftDetailModelId = null;
  state.ui.aircraftDetailFocusModelId = null;
  state.ui.aircraftDetailMediaKey = '';
}

function syncGlobalModalBodyLock() {
  document.body.classList.toggle(
    'has-modal-open',
    Boolean(state.ui.registrationModalOpen || state.ui.modelRegsModalOpen || state.ui.aircraftDetailModalOpen),
  );
}

function getRegistrationTransparencyRows(model = state.model) {
  if (!model?.aircraft?.registrationTransparency?.rows) {
    return [];
  }
  return model.aircraft.registrationTransparency.rows;
}

function getRegistrationRowByRowKey(model, rowKey) {
  const normalizedRowKey = String(rowKey || '');
  if (!normalizedRowKey) {
    return null;
  }
  return getRegistrationTransparencyRows(model).find((row) => row.rowKey === normalizedRowKey) || null;
}

function canManualMapRegistrationRow(row) {
  if (!row?.manualMappingKey) {
    return false;
  }
  if (row.mappingMethod === 'manual_override') {
    return true;
  }
  return row.confidenceCategory !== 'high';
}

function clearManualRegistrationEditState() {
  state.ui.registrationManualEditKey = '';
  state.ui.registrationManualEditModelId = '';
}

function beginManualRegistrationMappingEdit(row) {
  if (!row || !row.rowKey || !canManualMapRegistrationRow(row)) {
    return;
  }
  const suggestedModelId = row.manualOverrideModelId
    || row.mappedModelId
    || row.lookupHexModelId
    || row.lookupRegModelId
    || row.inferenceResolvedTypeCode
    || '';
  state.ui.registrationManualEditKey = row.rowKey;
  state.ui.registrationManualEditModelId = suggestedModelId;
  renderRegistrationTransparencyModal(state.model);
  requestAnimationFrame(() => {
    const input = elements.aircraftRegTransparencyRows?.querySelector('input[data-action="manual-reg-mapping-input"]');
    input?.focus();
    input?.select();
  });
}

function renderRegistrationModelOptions() {
  const optionsTarget = elements.aircraftRegModelOptions;
  if (!optionsTarget) {
    return;
  }
  const models = Array.isArray(state.references?.referenceModels)
    ? state.references.referenceModels
    : [];
  const signature = `${models.length}|${state.references?.manifest?.datasets?.models?.updatedAt || ''}`;
  if (state.ui.registrationModelOptionsSignature === signature) {
    return;
  }
  state.ui.registrationModelOptionsSignature = signature;
  if (!models.length) {
    optionsTarget.innerHTML = '';
    return;
  }
  optionsTarget.innerHTML = models
    .map((row) => {
      const modelId = String(row?.id || '').trim().toUpperCase();
      if (!modelId) {
        return '';
      }
      const manufacturer = String(row?.manufacturer || '').trim();
      const name = String(row?.name || '').trim();
      const label = [manufacturer, name].filter(Boolean).join(' ');
      return `<option value="${escapeHtml(modelId)}" label="${escapeHtml(label || modelId)}"></option>`;
    })
    .filter(Boolean)
    .join('');
}

function updateManualMappingStorageMeta(model = state.model) {
  if (!elements.aircraftRegManualStorageMeta) {
    return;
  }
  const storedCount = state.manualRegistrationMappings.size;
  const appliedCount = Number(model?.aircraft?.registrationTransparency?.summary?.usedManualRows) || 0;
  if (!storedCount) {
    elements.aircraftRegManualStorageMeta.textContent = 'No manual mappings are currently saved in this browser.';
    return;
  }
  const storedLabel = storedCount === 1 ? 'mapping' : 'mappings';
  const appliesLabel = appliedCount === 1 ? 'entry applies' : 'entries apply';
  elements.aircraftRegManualStorageMeta.textContent = `${formatNumber(storedCount)} manual ${storedLabel} saved in browser local storage. ${formatNumber(appliedCount)} ${appliesLabel} to this dashboard.`;
}

function persistManualRegistrationMappingsWithNotice() {
  const saved = writeManualRegistrationMappings(state.manualRegistrationMappings);
  if (saved) {
    return true;
  }
  setBanner(
    'Manual mappings could not be written to local storage. They remain in-memory for this session only, so export now.',
    'warning',
  );
  return false;
}

function applyManualRegistrationMapping(row, modelIdInput = '') {
  if (!row || !row.manualMappingKey || !state.references?.modelsById) {
    return;
  }
  const selectedModelId = normalizeManualMappingModelId(modelIdInput);
  if (!selectedModelId) {
    setBanner('Enter an ICAO model ID before saving a manual mapping.', 'warning');
    return;
  }
  if (!state.references.modelsById.has(selectedModelId)) {
  setBanner(`"${selectedModelId}" was not found in the current aircraft reference snapshot.`, 'warning');
    return;
  }
  state.manualRegistrationMappings.set(row.manualMappingKey, {
    key: row.manualMappingKey,
    aircraftHex: normalizeManualRegistration(row.aircraftHex),
    registration: normalizeManualRegistration(row.registration),
    modelId: selectedModelId,
    updatedAt: Date.now(),
  });
  persistManualRegistrationMappingsWithNotice();
  clearManualRegistrationEditState();
  rebuildDashboardModelFromCurrentUpload();
  state.ui.registrationModalPage = 1;
  if (state.ui.registrationModalOpen) {
    renderRegistrationTransparencyModal(state.model);
  }
  setBanner(`Manual mapping saved for ${row.registrationRaw || row.registration || row.manualMappingKey}: ${selectedModelId}.`, 'success', {
    autoDismissMs: 6000,
  });
}

function clearManualRegistrationMappingForRow(row) {
  if (!row?.manualMappingKey) {
    return;
  }
  if (!state.manualRegistrationMappings.has(row.manualMappingKey)) {
    return;
  }
  state.manualRegistrationMappings.delete(row.manualMappingKey);
  persistManualRegistrationMappingsWithNotice();
  clearManualRegistrationEditState();
  rebuildDashboardModelFromCurrentUpload();
  state.ui.registrationModalPage = 1;
  if (state.ui.registrationModalOpen) {
    renderRegistrationTransparencyModal(state.model);
  }
  setBanner(`Removed manual mapping for ${row.registrationRaw || row.registration || row.manualMappingKey}.`, 'info', {
    autoDismissMs: 6000,
  });
}

function exportManualRegistrationMappings() {
  const mappings = serializeManualRegistrationMappings(state.manualRegistrationMappings);
  if (!mappings.length) {
    setBanner('No manual mappings are saved yet. Add at least one override before exporting.', 'warning');
    return;
  }
  const content = JSON.stringify({
    schema: MANUAL_REGISTRATION_MAPPINGS_EXPORT_SCHEMA,
    exportedAt: Date.now(),
    mappingCount: mappings.length,
    mappings,
  }, null, 2);
  triggerTextDownload('skyviz-manual-registration-mappings.json', content);
  setBanner(`Exported ${formatNumber(mappings.length)} manual registration mapping rows.`, 'success', {
    autoDismissMs: 6000,
  });
}

function importManualRegistrationMappingsFromText(text, fileName = 'manual mappings') {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(`${fileName} is not valid JSON.`);
  }
  const sourceRows = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.mappings)
      ? parsed.mappings
      : [];
  if (!sourceRows.length) {
    throw new Error(`${fileName} does not contain any manual mapping rows.`);
  }
  let importedCount = 0;
  let skippedCount = 0;
  sourceRows.forEach((entry) => {
    const normalizedEntry = normalizeManualRegistrationMappingEntry(entry);
    if (!normalizedEntry) {
      skippedCount += 1;
      return;
    }
    if (state.references?.modelsById && !state.references.modelsById.has(normalizedEntry.modelId)) {
      skippedCount += 1;
      return;
    }
    state.manualRegistrationMappings.set(normalizedEntry.key, normalizedEntry);
    importedCount += 1;
  });
  if (!importedCount) {
    throw new Error(`${fileName} had no valid rows for the current reference dataset.`);
  }
  persistManualRegistrationMappingsWithNotice();
  rebuildDashboardModelFromCurrentUpload();
  state.ui.registrationModalPage = 1;
  if (state.ui.registrationModalOpen) {
    renderRegistrationTransparencyModal(state.model);
  }
  setBanner(
    skippedCount
      ? `Imported ${formatNumber(importedCount)} mapping rows and skipped ${formatNumber(skippedCount)} invalid rows.`
      : `Imported ${formatNumber(importedCount)} manual mapping rows.`,
    'success',
    { autoDismissMs: 7000 },
  );
}

function registrationConfidenceLabel(value) {
  return REGISTRATION_MODAL_CONFIDENCE_LABELS[value] || 'Low';
}

function registrationStatusLabel(value) {
  return REGISTRATION_MODAL_STATUS_LABELS[value] || 'Unmapped';
}

function registrationMethodLabel(value) {
  if (value === 'manual_override') {
    return 'Manual override';
  }
  if (value === 'hex_lookup') {
    return 'Hex lookup';
  }
  if (value === 'hex_lookup_conflict') {
    return 'Hex lookup (conflict)';
  }
  if (value === 'reg_lookup') {
    return 'Registration fallback';
  }
  if (value === 'inferred_high_confidence') {
    return 'High-confidence inference';
  }
  return 'Unmapped';
}

function buildAircraftModelLabelMap(model) {
  const labels = new Map();
  if (!model?.aircraft?.rows?.length) {
    return labels;
  }
  model.aircraft.rows.forEach((row) => {
    const modelId = String(row.modelId || '').toUpperCase();
    if (!modelId || labels.has(modelId)) {
      return;
    }
    labels.set(modelId, `${row.manufacturer || 'Unknown'} ${row.name || modelId}`.trim());
  });
  return labels;
}

function getAircraftModelRowByModelId(model, modelId) {
  const normalizedModelId = String(modelId || '').trim().toUpperCase();
  if (!normalizedModelId || !model?.aircraft?.rows?.length) {
    return null;
  }
  return model.aircraft.rows.find((row) => String(row.modelId || '').toUpperCase() === normalizedModelId) || null;
}

function getRegistrationModalTriggerElement() {
  return document.querySelector('#aircraft-reg-transparency-trigger');
}

function renderRegistrationModalTrigger(model = state.model) {
  const trigger = getRegistrationModalTriggerElement();
  if (!trigger) {
    return;
  }
  const rows = getRegistrationTransparencyRows(model);
  const summary = model?.aircraft?.registrationTransparency?.summary || null;
  const totalRows = rows.length;
  const mappedRows = summary?.mappedRows || 0;
  const lowRows = summary?.confidenceCounts?.low || 0;
  const ambiguousRows = summary?.confidenceCounts?.ambiguous || 0;
  const attentionRows = lowRows + ambiguousRows;

  trigger.disabled = totalRows === 0;
  trigger.classList.toggle('is-attention', attentionRows > 0);
  trigger.setAttribute('aria-expanded', String(state.ui.registrationModalOpen));
  if (!totalRows) {
    trigger.setAttribute('title', 'No unique registration rows available in this export.');
    return;
  }
  trigger.setAttribute(
    'title',
    `${formatNumber(mappedRows)} mapped of ${formatNumber(totalRows)} unique registrations. ${formatNumber(attentionRows)} rows are low-confidence or ambiguous.`,
  );
}

function filterRegistrationModalRows(rows) {
  const confidenceFilter = REGISTRATION_MODAL_FILTERS.has(state.ui.registrationModalConfidence)
    ? state.ui.registrationModalConfidence
    : 'all';
  const normalizedQuery = state.ui.registrationModalQuery.trim().toLowerCase();
  return rows.filter((row) => {
    if (confidenceFilter !== 'all' && row.confidenceCategory !== confidenceFilter) {
      return false;
    }
    if (!normalizedQuery) {
      return true;
    }
    const haystack = [
      row.registrationRaw,
      row.registration,
      row.aircraftHex,
      row.mappedModelId,
      row.autoMappedModelId,
      row.manualOverrideModelId,
      row.lookupHexModelId,
      row.lookupRegModelId,
      row.inferenceResolvedTypeCode,
      row.inferenceStatus,
      row.inferenceMethod,
      row.issueLabel,
      registrationMethodLabel(row.mappingMethod),
      registrationStatusLabel(row.status),
      registrationConfidenceLabel(row.confidenceCategory),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(normalizedQuery);
  });
}

function renderRegistrationTransparencyModal(model = state.model) {
  if (!elements.aircraftRegTransparencyModal) {
    return;
  }
  renderRegistrationModelOptions();
  const rows = getRegistrationTransparencyRows(model);
  const summary = model?.aircraft?.registrationTransparency?.summary || {};
  const confidenceCounts = summary.confidenceCounts || {};
  const inferenceStatusCounts = summary.inferenceStatusCounts || {};
  const modelLabelMap = buildAircraftModelLabelMap(model);
  updateManualMappingStorageMeta(model);
  const activeConfidenceFilter = REGISTRATION_MODAL_FILTERS.has(state.ui.registrationModalConfidence)
    ? state.ui.registrationModalConfidence
    : 'all';
  const confidenceFilterChip = (key, label, count, extraClass = '') => `
    <button
      type="button"
      class="registration-summary-chip is-filter${extraClass ? ` ${extraClass}` : ''}${activeConfidenceFilter === key ? ' is-active' : ''}"
      data-action="set-registration-confidence-filter"
      data-confidence-filter="${escapeHtml(key)}"
      aria-pressed="${String(activeConfidenceFilter === key)}"
    >
      ${escapeHtml(label)} ${formatNumber(count)}
    </button>
  `;

  elements.aircraftRegTransparencySummary.innerHTML = `
    <span class="registration-summary-chip">${formatNumber(summary.mappedRows || 0)} mapped</span>
    <span class="registration-summary-chip">${formatNumber(summary.unmappedRows || 0)} unmapped</span>
    ${confidenceFilterChip('manual', 'Manual', confidenceCounts.manual || 0, 'is-manual')}
    ${confidenceFilterChip('high', 'High', confidenceCounts.high || 0, 'is-high')}
    ${confidenceFilterChip('medium', 'Medium', confidenceCounts.medium || 0, 'is-medium')}
    ${confidenceFilterChip('ambiguous', 'Ambiguous', confidenceCounts.ambiguous || 0, 'is-ambiguous')}
    ${confidenceFilterChip('low', 'Low', confidenceCounts.low || 0, 'is-low')}
    <span class="registration-summary-chip">Manual applied ${formatNumber(summary.usedManualRows || 0)}</span>
    <span class="registration-summary-chip">Inference rows ${formatNumber(summary.linkedInferenceRows || 0)}</span>
    <span class="registration-summary-chip">Inference medium ${formatNumber(inferenceStatusCounts.inferred_medium_confidence || 0)}</span>
    <span class="registration-summary-chip">Inference ambiguous ${formatNumber(inferenceStatusCounts.ambiguous || 0)}</span>
  `;

  const filteredRows = filterRegistrationModalRows(rows);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / REGISTRATION_MODAL_PAGE_SIZE));
  state.ui.registrationModalPage = Math.min(Math.max(state.ui.registrationModalPage, 1), totalPages);
  const pageStart = (state.ui.registrationModalPage - 1) * REGISTRATION_MODAL_PAGE_SIZE;
  const pageRows = filteredRows.slice(pageStart, pageStart + REGISTRATION_MODAL_PAGE_SIZE);

  if (!filteredRows.length) {
    elements.aircraftRegTransparencyMeta.textContent = `No rows match the current filters. ${formatNumber(rows.length)} total unique registration rows are available.`;
    elements.aircraftRegTransparencyRows.innerHTML = `
      <tr>
        <td class="aircraft-reg-empty" colspan="6">No matching rows.</td>
      </tr>
    `;
  } else {
    const shownStart = pageStart + 1;
    const shownEnd = pageStart + pageRows.length;
    elements.aircraftRegTransparencyMeta.textContent = `Showing ${formatNumber(shownStart)}-${formatNumber(shownEnd)} of ${formatNumber(filteredRows.length)} filtered rows (${formatNumber(rows.length)} total unique registrations).`;
    elements.aircraftRegTransparencyRows.innerHTML = pageRows.map((row) => {
      const registrationDisplay = row.registrationRaw || row.registration || 'Unknown';
      const hasNormalizedDiff = row.registration && row.registration !== registrationDisplay;
      const hexDisplay = row.aircraftHex || 'N/A';
      const aircraftIdDisplay = Number.isFinite(row.aircraftId)
        ? `aircraftId ${String(Math.trunc(row.aircraftId))}`
        : 'aircraftId missing';
      const mappedModelId = row.mappedModelId || '';
      const mappedModelLabel = mappedModelId ? modelLabelMap.get(mappedModelId) || '' : '';
      const statusLabel = registrationStatusLabel(row.status);
      const methodLabel = registrationMethodLabel(row.mappingMethod);
      const confidenceLabel = registrationConfidenceLabel(row.confidenceCategory);
      const manualMappingAllowed = canManualMapRegistrationRow(row);
      const hasManualOverride = row.mappingMethod === 'manual_override' && Boolean(row.manualOverrideModelId);
      const isManualEditing = state.ui.registrationManualEditKey === row.rowKey;
      const manualEditModelId = isManualEditing
        ? state.ui.registrationManualEditModelId
        : '';
      const manualCellHtml = manualMappingAllowed
        ? isManualEditing
          ? `
            <div class="aircraft-reg-manual-actions">
              <input
                type="text"
                class="aircraft-reg-manual-input"
                data-action="manual-reg-mapping-input"
                data-row-key="${escapeHtml(row.rowKey)}"
                list="aircraft-reg-model-options"
                placeholder="ICAO model ID"
                value="${escapeHtml(manualEditModelId)}"
              >
              <div class="aircraft-reg-manual-action-row">
                <button
                  type="button"
                  class="region-action-button"
                  data-action="save-manual-reg-mapping"
                  data-row-key="${escapeHtml(row.rowKey)}"
                >
                  Save
                </button>
                <button
                  type="button"
                  class="region-action-button"
                  data-action="cancel-manual-reg-mapping"
                  data-row-key="${escapeHtml(row.rowKey)}"
                >
                  Cancel
                </button>
              </div>
              <span class="aircraft-reg-subtle">Use an ICAO model ID from the reference list.</span>
            </div>
          `
          : `
            <div class="aircraft-reg-manual-actions">
              <button
                type="button"
                class="region-action-button"
                data-action="set-manual-reg-mapping"
                data-row-key="${escapeHtml(row.rowKey)}"
              >
                ${hasManualOverride ? 'Edit' : 'Set'} mapping
              </button>
              <button
                type="button"
                class="region-action-button"
                data-action="clear-manual-reg-mapping"
                data-row-key="${escapeHtml(row.rowKey)}"
                ${hasManualOverride ? '' : 'disabled'}
              >
                Clear
              </button>
              <span class="aircraft-reg-subtle">
                ${hasManualOverride ? `Manual ICAO: ${escapeHtml(row.manualOverrideModelId)}` : 'No manual override set.'}
              </span>
            </div>
          `
        : '<span class="aircraft-reg-manual-static">Locked: high-confidence auto mapping.</span>';
      const safeManualCellHtml = String(manualCellHtml || '').trim()
        || '<span class="aircraft-reg-manual-static">Manual mapping unavailable for this row.</span>';
      const noteParts = [];
      if (row.issueLabel) {
        noteParts.push(row.issueLabel);
      }
      if (hasManualOverride && row.autoMappedModelId && row.autoMappedModelId !== row.manualOverrideModelId) {
        noteParts.push(`Auto candidate: ${row.autoMappedModelId}.`);
      }
      if (row.inferenceStatus && row.inferenceStatus !== 'inferred_high_confidence') {
        noteParts.push(`Inference status: ${registrationStatusLabel(row.inferenceStatus)}.`);
      }
      if (row.inferenceResolvedTypeCode && !mappedModelId) {
        noteParts.push(`Candidate ICAO: ${row.inferenceResolvedTypeCode}.`);
      }
      if (row.inferenceCandidateTypes?.length) {
        noteParts.push(`Candidates: ${row.inferenceCandidateTypes.join(', ')}.`);
      }
      if (row.inferenceReviewNote) {
        noteParts.push(row.inferenceReviewNote);
      }
      const inferenceConfidence = Number.isFinite(row.inferenceConfidence)
        ? `inference ${formatPercent(row.inferenceConfidence * 100, 0)}`
        : '';
      return `
        <tr>
          <td>
            <code>${escapeHtml(registrationDisplay)}</code>
            ${hasNormalizedDiff ? `<span class="aircraft-reg-subtle">normalized: ${escapeHtml(row.registration)}</span>` : ''}
          </td>
          <td>
            <code>${escapeHtml(hexDisplay)}</code>
            <span class="aircraft-reg-subtle">${escapeHtml(aircraftIdDisplay)}</span>
          </td>
          <td>
            ${mappedModelId
    ? `<code>${escapeHtml(mappedModelId)}</code>`
    : '<span class="aircraft-reg-muted">Unmapped</span>'}
            ${mappedModelLabel ? `<span class="aircraft-reg-subtle">${escapeHtml(mappedModelLabel)}</span>` : ''}
          </td>
          <td>
            <span class="aircraft-reg-confidence is-${escapeHtml(row.confidenceCategory || 'low')}">${escapeHtml(confidenceLabel)}</span>
            <span class="aircraft-reg-subtle">${escapeHtml(statusLabel)}${inferenceConfidence ? `, ${escapeHtml(inferenceConfidence)}` : ''}</span>
          </td>
          <td>
            <span class="aircraft-reg-method">${escapeHtml(methodLabel)}</span>
            ${noteParts.length
    ? `<p class="aircraft-reg-note">${escapeHtml(noteParts.join(' '))}</p>`
    : ''}
          </td>
          <td class="aircraft-reg-manual-cell">
            ${safeManualCellHtml}
          </td>
        </tr>
      `;
    }).join('');
  }

  elements.aircraftRegTransparencyPageLabel.textContent = `Page ${formatNumber(state.ui.registrationModalPage)} of ${formatNumber(totalPages)}`;
  elements.aircraftRegTransparencyPrev.disabled = state.ui.registrationModalPage <= 1;
  elements.aircraftRegTransparencyNext.disabled = state.ui.registrationModalPage >= totalPages;
  renderRegistrationModalTrigger(model);
}

function setRegistrationModalOpen(isOpen, options = {}) {
  const restoreFocus = options.restoreFocus !== false;
  const trigger = getRegistrationModalTriggerElement();
  if (!elements.aircraftRegTransparencyModal) {
    return;
  }
  if (isOpen && !state.model) {
    return;
  }
  if (isOpen && state.ui.modelRegsModalOpen) {
    setModelRegsModalOpen(false, { restoreFocus: false });
  }
  if (isOpen && state.ui.aircraftDetailModalOpen) {
    setAircraftDetailModalOpen(false, { restoreFocus: false });
  }
  if (!isOpen) {
    clearManualRegistrationEditState();
  }
  state.ui.registrationModalOpen = Boolean(isOpen);
  elements.aircraftRegTransparencyModal.hidden = !state.ui.registrationModalOpen;
  trigger?.setAttribute('aria-expanded', String(state.ui.registrationModalOpen));
  syncGlobalModalBodyLock();

  if (state.ui.registrationModalOpen) {
    syncRegistrationModalControls();
    renderRegistrationTransparencyModal(state.model);
    requestAnimationFrame(() => {
      elements.aircraftRegTransparencySearch?.focus();
    });
    return;
  }
  if (restoreFocus) {
    trigger?.focus();
  }
}

function getCaughtRegistrationsForModel(model, modelId) {
  const normalizedModelId = String(modelId || '').trim().toUpperCase();
  if (!normalizedModelId) {
    return [];
  }
  return getRegistrationTransparencyRows(model)
    .filter((row) => String(row.mappedModelId || '').toUpperCase() === normalizedModelId)
    .sort((left, right) => {
      return (left.registration || left.registrationRaw || left.rowKey).localeCompare(
        right.registration || right.registrationRaw || right.rowKey,
      )
        || (left.aircraftHex || '').localeCompare(right.aircraftHex || '')
        || left.rowKey.localeCompare(right.rowKey);
    });
}

function focusModelRegsBadge(modelId) {
  const normalizedModelId = String(modelId || '').trim().toUpperCase();
  if (!normalizedModelId || !elements.aircraftList) {
    return false;
  }
  const badges = elements.aircraftList.querySelectorAll('button[data-action="open-registration-list"][data-model-id]');
  for (const badge of badges) {
    const badgeModelId = String(badge.getAttribute('data-model-id') || '').trim().toUpperCase();
    if (badgeModelId === normalizedModelId) {
      badge.focus();
      return true;
    }
  }
  return false;
}

function focusAircraftDetailCard(modelId) {
  const normalizedModelId = String(modelId || '').trim().toUpperCase();
  if (!normalizedModelId || !elements.aircraftList) {
    return false;
  }
  const cards = elements.aircraftList.querySelectorAll('.aircraft-card[data-model-id]');
  for (const card of cards) {
    const cardModelId = String(card.getAttribute('data-model-id') || '').trim().toUpperCase();
    if (cardModelId === normalizedModelId) {
      card.focus();
      return true;
    }
  }
  return false;
}

function openAircraftDetailForModelId(modelId) {
  const normalizedModelId = String(modelId || '').trim().toUpperCase();
  if (!normalizedModelId || !state.model) {
    return;
  }
  state.ui.aircraftDetailModelId = normalizedModelId;
  state.ui.aircraftDetailFocusModelId = normalizedModelId;
  state.ui.aircraftDetailMediaKey = '';
  setAircraftDetailModalOpen(true, { restoreFocus: false, focusModelId: normalizedModelId });
}

function buildAircraftDetailModelOptions(row) {
  const codes = Array.isArray(row?.imageCodes) && row.imageCodes.length
    ? row.imageCodes
    : [String(row?.icao || row?.modelId || '').trim().toUpperCase()];
  return Array.from(new Set(codes.map((code) => String(code || '').trim().toUpperCase()).filter(Boolean)))
    .map((code, index) => ({
      key: `model:${code}`,
      kind: 'model',
      code,
      label: index === 0 ? '3D studio' : `3D alias ${code}`,
      note: index === 0 ? `Optimized GLB for ${code}` : `Optimized GLB alias ${code}`,
      urls: [`${AIRCRAFT_MODEL_BASE_URL}/${encodeURIComponent(code)}.glb`],
    }));
}

function getAircraftDetailMediaState(row) {
  const options = buildAircraftDetailModelOptions(row);
  if (!options.length) {
    state.ui.aircraftDetailMediaKey = '';
    return { options, selected: null };
  }
  let selected = options.find((option) => option.key === state.ui.aircraftDetailMediaKey) || null;
  if (!selected) {
    selected = options[0];
    state.ui.aircraftDetailMediaKey = selected.key;
  }
  return { options, selected };
}

function formatAircraftSeasonSpan(minimum, maximum) {
  const seasonMin = Number(minimum);
  const seasonMax = Number(maximum);
  if (!Number.isFinite(seasonMin) && !Number.isFinite(seasonMax)) {
    return 'N/A';
  }
  if (Number.isFinite(seasonMin) && Number.isFinite(seasonMax)) {
    if (seasonMin === seasonMax) {
      return `Season ${Math.trunc(seasonMin)}`;
    }
    return `Season ${Math.trunc(seasonMin)}-${Math.trunc(seasonMax)}`;
  }
  const number = Number.isFinite(seasonMin) ? seasonMin : seasonMax;
  return `Season ${Math.trunc(number)}`;
}

function formatAircraftTextValue(value, fallback = 'N/A') {
  const text = String(value || '').trim();
  return text || fallback;
}

function formatAircraftEngineSummary(row) {
  const engineCount = Number(row?.engNum);
  const engineType = String(row?.engTypeLabel || '').trim();
  if (Number.isFinite(engineCount) && engineType) {
    return `${Math.trunc(engineCount)} x ${engineType}`;
  }
  if (Number.isFinite(engineCount)) {
    return `${Math.trunc(engineCount)} engines`;
  }
  return engineType || 'N/A';
}

function buildAircraftDetailKpi(label, value, note = '') {
  return `
    <article class="aircraft-detail-kpi">
      <span class="aircraft-detail-kpi-label">${escapeHtml(label)}</span>
      <strong class="aircraft-detail-kpi-value">${escapeHtml(value)}</strong>
      ${note ? `<span class="aircraft-detail-kpi-note">${escapeHtml(note)}</span>` : ''}
    </article>
  `;
}

function renderAircraftDetailSection(title, rows) {
  const visibleRows = rows.filter((row) => row && row.value);
  if (!visibleRows.length) {
    return '';
  }
  return `
    <section class="aircraft-detail-section">
      <div class="aircraft-detail-section-head">
        <p class="eyebrow">${escapeHtml(title)}</p>
      </div>
      <dl class="aircraft-detail-facts">
        ${visibleRows.map((row) => `
          <div class="aircraft-detail-fact">
            <dt>${escapeHtml(row.label)}</dt>
            <dd>${escapeHtml(row.value)}</dd>
          </div>
        `).join('')}
      </dl>
    </section>
  `;
}

function renderModelRegistrationsModal(model = state.model) {
  if (!elements.aircraftModelRegsModal) {
    return;
  }
  const modelId = String(state.ui.modelRegsModalModelId || '').trim().toUpperCase();
  const aircraftRow = getAircraftModelRowByModelId(model, modelId);
  const rows = getCaughtRegistrationsForModel(model, modelId);
  const titleModelId = modelId || 'Unknown';
  const displayName = aircraftRow
    ? `${aircraftRow.manufacturer || ''} ${aircraftRow.name || titleModelId}`.trim()
    : titleModelId;
  const possibleRegs = Number.isFinite(aircraftRow?.possibleRegistrations)
    ? aircraftRow.possibleRegistrations
    : null;
  const caughtCount = rows.length;
  const confidenceCounts = {
    manual: 0,
    high: 0,
    medium: 0,
    ambiguous: 0,
    low: 0,
  };
  rows.forEach((row) => {
    const key = Object.prototype.hasOwnProperty.call(confidenceCounts, row.confidenceCategory)
      ? row.confidenceCategory
      : 'low';
    confidenceCounts[key] += 1;
  });
  const summary = Number.isFinite(possibleRegs)
    ? `${displayName} (${titleModelId}) caught registrations: ${formatNumber(caughtCount)} / ${formatNumber(possibleRegs)} possible.`
    : `${displayName} (${titleModelId}) caught registrations: ${formatNumber(caughtCount)}.`;
  elements.aircraftModelRegsTitle.textContent = `Caught registrations for ${titleModelId}`;
  elements.aircraftModelRegsSummary.textContent = summary;
  elements.aircraftModelRegsBreakdown.innerHTML = `
    <span class="registration-summary-chip is-manual">Manual ${formatNumber(confidenceCounts.manual)}</span>
    <span class="registration-summary-chip is-high">High ${formatNumber(confidenceCounts.high)}</span>
    <span class="registration-summary-chip is-medium">Medium ${formatNumber(confidenceCounts.medium)}</span>
    <span class="registration-summary-chip is-ambiguous">Ambiguous ${formatNumber(confidenceCounts.ambiguous)}</span>
    <span class="registration-summary-chip is-low">Low ${formatNumber(confidenceCounts.low)}</span>
  `;

  const totalPages = Math.max(1, Math.ceil(rows.length / MODEL_REGISTRATION_MODAL_PAGE_SIZE));
  state.ui.modelRegsModalPage = Math.min(Math.max(state.ui.modelRegsModalPage, 1), totalPages);
  const pageStart = (state.ui.modelRegsModalPage - 1) * MODEL_REGISTRATION_MODAL_PAGE_SIZE;
  const pageRows = rows.slice(pageStart, pageStart + MODEL_REGISTRATION_MODAL_PAGE_SIZE);

  if (!rows.length) {
    elements.aircraftModelRegsMeta.textContent = 'No caught registrations were mapped to this ICAO model.';
    elements.aircraftModelRegsRows.innerHTML = `
      <tr>
        <td class="aircraft-reg-empty" colspan="4">No caught registrations found for this model.</td>
      </tr>
    `;
  } else {
    const shownStart = pageStart + 1;
    const shownEnd = pageStart + pageRows.length;
    elements.aircraftModelRegsMeta.textContent = `Showing ${formatNumber(shownStart)}-${formatNumber(shownEnd)} of ${formatNumber(rows.length)} caught registrations for ${titleModelId}.`;
    elements.aircraftModelRegsRows.innerHTML = pageRows.map((row) => {
      const registrationDisplay = row.registrationRaw || row.registration || 'Unknown';
      const hexDisplay = row.aircraftHex || 'N/A';
      const aircraftIdLabel = Number.isFinite(row.aircraftId)
        ? `aircraftId ${String(Math.trunc(row.aircraftId))}`
        : 'aircraftId unavailable';
      const confidenceCategory = row.confidenceCategory || 'low';
      const confidenceLabel = registrationConfidenceLabel(confidenceCategory);
      const methodLabel = registrationMethodLabel(row.mappingMethod);
      return `
        <tr>
          <td><code>${escapeHtml(registrationDisplay)}</code></td>
          <td>
            <code>${escapeHtml(hexDisplay)}</code>
            <span class="aircraft-reg-subtle">${escapeHtml(aircraftIdLabel)}</span>
          </td>
          <td>
            <span class="aircraft-reg-confidence is-${escapeHtml(confidenceCategory)}">${escapeHtml(confidenceLabel)}</span>
          </td>
          <td>
            <span class="aircraft-reg-method">${escapeHtml(methodLabel)}</span>
            ${row.issueLabel ? `<span class="aircraft-reg-subtle">${escapeHtml(row.issueLabel)}</span>` : ''}
          </td>
        </tr>
      `;
    }).join('');
  }

  elements.aircraftModelRegsPageLabel.textContent = `Page ${formatNumber(state.ui.modelRegsModalPage)} of ${formatNumber(totalPages)}`;
  elements.aircraftModelRegsPrev.disabled = state.ui.modelRegsModalPage <= 1;
  elements.aircraftModelRegsNext.disabled = state.ui.modelRegsModalPage >= totalPages;
}

function setModelRegsModalOpen(isOpen, options = {}) {
  const restoreFocus = options.restoreFocus !== false;
  const requestedFocusModelId = String(options.focusModelId || '').trim().toUpperCase();
  if (!elements.aircraftModelRegsModal) {
    return;
  }
  if (isOpen && !state.model) {
    return;
  }
  if (isOpen) {
    const focusModelId = requestedFocusModelId || String(state.ui.modelRegsModalModelId || '').trim().toUpperCase();
    state.ui.modelRegsModalFocusModelId = focusModelId || null;
  }
  if (isOpen && state.ui.registrationModalOpen) {
    setRegistrationModalOpen(false, { restoreFocus: false });
  }
  if (isOpen && state.ui.aircraftDetailModalOpen) {
    setAircraftDetailModalOpen(false, { restoreFocus: false });
  }
  state.ui.modelRegsModalOpen = Boolean(isOpen);
  elements.aircraftModelRegsModal.hidden = !state.ui.modelRegsModalOpen;
  syncGlobalModalBodyLock();

  if (state.ui.modelRegsModalOpen) {
    renderModelRegistrationsModal(state.model);
    requestAnimationFrame(() => {
      elements.aircraftModelRegsClose?.focus();
    });
    return;
  }
  if (restoreFocus) {
    const focusModelId = String(state.ui.modelRegsModalFocusModelId || state.ui.modelRegsModalModelId || '').trim().toUpperCase();
    if (!focusModelRegsBadge(focusModelId)) {
      elements.aircraftSearch?.focus();
    }
  }
}

function renderAircraftDetailModal(model = state.model) {
  if (!elements.aircraftDetailModal) {
    return;
  }
  const modelId = String(state.ui.aircraftDetailModelId || '').trim().toUpperCase();
  const row = getAircraftModelRowByModelId(model, modelId);
  if (!row) {
    setAircraftDetailModalOpen(false, { restoreFocus: true });
    return;
  }

  const title = row.name || row.displayName || modelId || 'Aircraft detail';
  const subtitleParts = [
    row.manufacturer || '',
    row.icao ? `ICAO ${row.icao}` : row.modelId,
    row.typeLabel || '',
    row.dominantCategoryLabel || '',
    row.dominantTierLabel ? `${row.dominantTierLabel} dominant` : '',
  ].filter(Boolean);
  const registrationCoverageLabel = Number.isFinite(row.caughtRegistrations) && Number.isFinite(row.possibleRegistrations)
    ? `${formatNumber(row.caughtRegistrations)} / ${formatNumber(row.possibleRegistrations)}`
    : Number.isFinite(row.caughtRegistrations)
      ? `${formatNumber(row.caughtRegistrations)} mapped`
      : Number.isFinite(row.possibleRegistrations)
        ? `? / ${formatNumber(row.possibleRegistrations)}`
        : 'N/A';
  const registrationCoverageNote = Number.isFinite(row.registrationCoverage)
    ? `${formatPercent(row.registrationCoverage, 1)} coverage`
    : 'Model registration universe incomplete';
  const { options, selected } = getAircraftDetailMediaState(row);
  const mediaHeading = '3D studio';
  const mediaNote = selected?.note || 'Optimized GLB from the model CDN.';
  const modelViewerReady = typeof window.customElements?.get === 'function'
    && Boolean(window.customElements.get('model-viewer'));

  elements.aircraftDetailTitle.textContent = title;
  elements.aircraftDetailSubtitle.textContent = subtitleParts.join(' / ');
  elements.aircraftDetailMediaHeading.textContent = mediaHeading;
  elements.aircraftDetailMediaNote.textContent = mediaNote;
  elements.aircraftDetailOpenRegs.disabled = !row.modelId;
  elements.aircraftDetailOpenRegs.setAttribute('data-model-id', row.modelId || '');

  if (!selected) {
    elements.aircraftDetailMediaStage.innerHTML = `
      <div class="aircraft-detail-media-frame is-empty">
        <div class="aircraft-detail-media-fallback is-visible">No 3D reference model was available for this aircraft.</div>
      </div>
    `;
    elements.aircraftDetailMediaOptions.innerHTML = '';
  } else if (modelViewerReady) {
    elements.aircraftDetailMediaStage.innerHTML = `
      <div class="aircraft-detail-media-frame is-model">
        <model-viewer
          class="aircraft-detail-model-viewer"
          src="${escapeHtml(selected.urls[0] || '')}"
          data-model-candidates="${escapeHtml(selected.urls.join('|'))}"
          data-model-index="0"
          camera-orbit="${AIRCRAFT_DETAIL_CAMERA_ORBIT}"
          camera-controls
          auto-rotate
          interaction-prompt="none"
          touch-action="pan-y"
          shadow-intensity="1"
          exposure="1.1"
          alt="${escapeHtml(title)} 3D model"
        ></model-viewer>
        <div class="aircraft-detail-media-fallback">3D model unavailable for this aircraft source.</div>
      </div>
    `;
  } else if (selected.kind === 'model') {
    elements.aircraftDetailMediaStage.innerHTML = `
      <div class="aircraft-detail-media-frame is-empty">
        <div class="aircraft-detail-media-fallback is-visible">3D viewer unavailable in this browser session.</div>
      </div>
    `;
  }

  const activeMediaKey = selected?.key || '';
  elements.aircraftDetailMediaOptions.innerHTML = options.map((option) => {
    const isActive = option.key === activeMediaKey;
    return `
      <button
        class="aircraft-detail-media-option${isActive ? ' is-active' : ''}"
        type="button"
        role="tab"
        aria-selected="${isActive ? 'true' : 'false'}"
        data-action="set-aircraft-detail-media"
        data-media-key="${escapeHtml(option.key)}"
      >
        <span class="aircraft-detail-media-option-kind">3D</span>
        <span class="aircraft-detail-media-option-label">${escapeHtml(option.label)}</span>
      </button>
    `;
  }).join('');
  elements.aircraftDetailMediaOptions.hidden = options.length <= 1;

  elements.aircraftDetailKpis.innerHTML = [
    buildAircraftDetailKpi('Total XP', formatNumber(Math.round(row.xp)), `${formatNumber(row.cardCount)} cards in deck`),
    buildAircraftDetailKpi('Glows', formatNumber(Math.round(row.glowCount)), `${formatPercent(row.fullCoverageRate, 1)} full-framing rate`),
    buildAircraftDetailKpi('Registrations', registrationCoverageLabel, registrationCoverageNote),
    buildAircraftDetailKpi('Framing', formatAircraftPercent(row.avgCoverage), 'Average across cards'),
    buildAircraftDetailKpi('Cloud', formatAircraftPercent(row.avgCloudiness), 'Average across cards'),
    buildAircraftDetailKpi('Season span', formatAircraftSeasonSpan(row.seasonMin, row.seasonMax), row.military ? 'Military profile' : 'Civil profile'),
  ].join('');

  elements.aircraftDetailMetaSections.innerHTML = [
    renderAircraftDetailSection('Profile', [
      { label: 'Type', value: row.typeLabel || 'N/A' },
      { label: 'Category', value: row.dominantCategoryLabel || 'N/A' },
      { label: 'Tier', value: row.dominantTierLabel || 'N/A' },
      { label: 'Engine setup', value: formatAircraftEngineSummary(row) },
      { label: 'Landing gear', value: formatAircraftTextValue(row.landingGear) },
      { label: 'Service', value: row.military ? 'Military' : 'Civil' },
    ]),
    renderAircraftDetailSection('Performance', [
      { label: 'First flight', value: formatAircraftYear(row.firstFlight) },
      { label: 'Max speed', value: formatAircraftStat(row.maxSpeed, { suffix: ' kt', maxFractionDigits: 0, nullIfNonPositive: true }) },
      { label: 'Range', value: formatAircraftStat(row.range, { suffix: ' km', maxFractionDigits: 0, nullIfNonPositive: true }) },
      { label: 'Ceiling', value: formatAircraftStat(row.ceiling, { suffix: ' ft', maxFractionDigits: 0, nullIfNonPositive: true }) },
      { label: 'Seats', value: formatAircraftStat(row.seats, { maxFractionDigits: 0, nullIfNonPositive: true }) },
      { label: 'Rarity', value: formatAircraftRarity(row.rareness) },
    ]),
    renderAircraftDetailSection('Airframe', [
      { label: 'Wingspan', value: formatAircraftStat(row.wingspan, { suffix: ' m', maxFractionDigits: 1, nullIfNonPositive: true }) },
      { label: 'Length', value: formatAircraftStat(row.length, { suffix: ' m', maxFractionDigits: 1, nullIfNonPositive: true }) },
      { label: 'Height', value: formatAircraftStat(row.height, { suffix: ' m', maxFractionDigits: 1, nullIfNonPositive: true }) },
      { label: 'Weight', value: formatAircraftWeight(row.mtow) },
      { label: 'Wing position', value: formatAircraftTextValue(row.wingPosition) },
      { label: 'Wing shape', value: formatAircraftTextValue(row.wingShape) },
    ]),
  ].join('');
}

function setAircraftDetailModalOpen(isOpen, options = {}) {
  const restoreFocus = options.restoreFocus !== false;
  const requestedFocusModelId = String(options.focusModelId || '').trim().toUpperCase();
  if (!elements.aircraftDetailModal) {
    return;
  }
  if (isOpen && !state.model) {
    return;
  }
  if (isOpen) {
    const focusModelId = requestedFocusModelId || String(state.ui.aircraftDetailModelId || '').trim().toUpperCase();
    const row = getAircraftModelRowByModelId(state.model, focusModelId);
    if (!row) {
      return;
    }
    if (focusModelId !== String(state.ui.aircraftDetailModelId || '').trim().toUpperCase()) {
      state.ui.aircraftDetailMediaKey = '';
    }
    state.ui.aircraftDetailModelId = focusModelId;
    state.ui.aircraftDetailFocusModelId = focusModelId;
  }
  if (isOpen && state.ui.registrationModalOpen) {
    setRegistrationModalOpen(false, { restoreFocus: false });
  }
  if (isOpen && state.ui.modelRegsModalOpen) {
    setModelRegsModalOpen(false, { restoreFocus: false });
  }
  if (!isOpen) {
    state.ui.aircraftDetailMediaKey = '';
  }
  state.ui.aircraftDetailModalOpen = Boolean(isOpen);
  elements.aircraftDetailModal.hidden = !state.ui.aircraftDetailModalOpen;
  syncGlobalModalBodyLock();

  if (state.ui.aircraftDetailModalOpen) {
    renderAircraftDetailModal(state.model);
    requestAnimationFrame(() => {
      elements.aircraftDetailClose?.focus();
    });
    return;
  }
  if (restoreFocus) {
    const focusModelId = String(state.ui.aircraftDetailFocusModelId || state.ui.aircraftDetailModelId || '').trim().toUpperCase();
    if (!focusAircraftDetailCard(focusModelId)) {
      elements.aircraftSearch?.focus();
    }
  }
}

function clearDashboardPanels() {
  elements.mapLegend.innerHTML = '';
  elements.mapAirportKpi.textContent = '';
  elements.mapDrillEyebrow.textContent = 'Drill-down explorer';
  elements.mapDrillTitle.textContent = 'Airport completion explorer';
  elements.mapDrillHelper.textContent = 'Click a continent to drill into countries. Click United States to drill into US states.';
  elements.mapDrillNav.innerHTML = '';
  elements.mapDrillKpi.textContent = '';
  elements.mapDrillProgress.innerHTML = '';
  elements.mapDrillProgressMeta.textContent = '';
  elements.aircraftOverviewPanel.innerHTML = '';
  elements.aircraftTierXpPanel.innerHTML = '';
  elements.aircraftTierGlowPanel.innerHTML = '';
  elements.aircraftTypeProgressPanel.innerHTML = '';
  elements.aircraftCategoryProgressPanel.innerHTML = '';
  elements.aircraftTierCompletionPanel.innerHTML = '';
  elements.aircraftImagePlaceholderPanel.innerHTML = '';
  elements.aircraftRegPlaceholderPanel.innerHTML = '';
  elements.aircraftDeckMetrics.innerHTML = '';
  elements.aircraftListMeta.textContent = '';
  elements.aircraftList.innerHTML = '';
  elements.aircraftRegTransparencySummary.innerHTML = '';
  elements.aircraftRegModelOptions.innerHTML = '';
  elements.aircraftRegManualStorageMeta.textContent = '';
  elements.aircraftRegTransparencyMeta.textContent = '';
  elements.aircraftRegTransparencyRows.innerHTML = '';
  elements.aircraftRegTransparencyPageLabel.textContent = '';
  elements.aircraftModelRegsTitle.textContent = 'Caught registrations';
  elements.aircraftModelRegsSummary.textContent = '';
  elements.aircraftModelRegsBreakdown.innerHTML = '';
  elements.aircraftModelRegsMeta.textContent = '';
  elements.aircraftModelRegsRows.innerHTML = '';
  elements.aircraftModelRegsPageLabel.textContent = '';
  elements.aircraftDetailTitle.textContent = 'Aircraft detail';
  elements.aircraftDetailSubtitle.textContent = '';
  elements.aircraftDetailMediaHeading.textContent = '3D studio';
  elements.aircraftDetailMediaNote.textContent = '';
  elements.aircraftDetailMediaStage.innerHTML = '';
  elements.aircraftDetailMediaOptions.innerHTML = '';
  elements.aircraftDetailKpis.innerHTML = '';
  elements.aircraftDetailMetaSections.innerHTML = '';
}

function parseCompletionSortKey(sortKey) {
  const [category, direction] = String(sortKey || '').split('_');
  const safeCategory = COMPLETION_SORT_CATEGORIES.has(category) ? category : 'percent';
  const safeDirection = COMPLETION_SORT_DIRECTIONS.has(direction) ? direction : 'desc';
  return {
    category: safeCategory,
    direction: safeDirection,
  };
}

function buildCompletionSortKey(category, direction) {
  const safeCategory = COMPLETION_SORT_CATEGORIES.has(category) ? category : 'percent';
  const safeDirection = COMPLETION_SORT_DIRECTIONS.has(direction) ? direction : 'desc';
  return `${safeCategory}_${safeDirection}`;
}

function toggleCompletionDirection(direction) {
  return direction === 'asc' ? 'desc' : 'asc';
}

function applyDirectionButtonState(button, direction) {
  if (!button) {
    return;
  }
  const isAscending = direction === 'asc';
  button.textContent = isAscending ? '\u2191' : '\u2193';
  button.setAttribute('aria-label', isAscending ? 'Sort ascending' : 'Sort descending');
  button.setAttribute('title', isAscending ? 'Sort ascending' : 'Sort descending');
}

function normalizeMapDrillLevel(level) {
  return MAP_DRILL_LEVELS.includes(level) ? level : 'continent';
}

function getMapDrillDepth(level = state.map.drillLevel) {
  const safeLevel = normalizeMapDrillLevel(level);
  return MAP_DRILL_LEVELS.indexOf(safeLevel) + 1;
}

function getMapCompletionState(level = state.map.drillLevel) {
  const safeLevel = normalizeMapDrillLevel(level);
  if (safeLevel === 'country') {
    return {
      query: state.map.countryQuery,
      sort: state.map.countrySort,
    };
  }
  if (safeLevel === 'us-state') {
    return {
      query: state.map.usStateQuery,
      sort: state.map.usStateSort,
    };
  }
  return {
    query: state.map.continentQuery,
    sort: state.map.continentSort,
  };
}

function setMapCompletionQuery(level, value) {
  const safeLevel = normalizeMapDrillLevel(level);
  if (safeLevel === 'country') {
    state.map.countryQuery = value;
    return;
  }
  if (safeLevel === 'us-state') {
    state.map.usStateQuery = value;
    return;
  }
  state.map.continentQuery = value;
}

function setMapCompletionSort(level, sortKey) {
  const safeLevel = normalizeMapDrillLevel(level);
  if (safeLevel === 'country') {
    state.map.countrySort = sortKey;
    return;
  }
  if (safeLevel === 'us-state') {
    state.map.usStateSort = sortKey;
    return;
  }
  state.map.continentSort = sortKey;
}

function getMapSearchPlaceholder(level = state.map.drillLevel) {
  const safeLevel = normalizeMapDrillLevel(level);
  if (safeLevel === 'country') {
    return 'Search countries';
  }
  if (safeLevel === 'us-state') {
    return 'Search US states';
  }
  return 'Search continents';
}

function syncCompletionSortControls() {
  const completionState = getMapCompletionState();
  const sortState = parseCompletionSortKey(completionState.sort);
  elements.mapDrillSearch.value = completionState.query;
  elements.mapDrillSearch.placeholder = getMapSearchPlaceholder();
  elements.mapDrillSort.value = sortState.category;
  applyDirectionButtonState(elements.mapDrillSortDirection, sortState.direction);
}

function syncAircraftSortControls() {
  elements.aircraftSort.value = state.aircraft.sortBy;
  applyDirectionButtonState(elements.aircraftSortDirection, state.aircraft.sortDirection);
}

function syncRegistrationModalControls() {
  elements.aircraftRegTransparencySearch.value = state.ui.registrationModalQuery;
  const safeFilter = REGISTRATION_MODAL_FILTERS.has(state.ui.registrationModalConfidence)
    ? state.ui.registrationModalConfidence
    : 'all';
  state.ui.registrationModalConfidence = safeFilter;
  elements.aircraftRegTransparencyFilter.value = safeFilter;
}

function setMapDrillLevel(level, options = {}) {
  const previousLevel = normalizeMapDrillLevel(state.map.drillLevel);
  const safeLevel = normalizeMapDrillLevel(level);
  const rawContinentKey = String(options.continentKey ?? state.map.drillContinentKey ?? '')
    .trim()
    .toUpperCase();
  const rawCountryKey = String(options.countryKey ?? state.map.drillCountryKey ?? '')
    .trim()
    .toUpperCase();
  const disableTransition = options.disableTransition === true;
  if (disableTransition) {
    state.map.pendingDrillTransition = 'none';
  } else {
    const previousDepth = getMapDrillDepth(previousLevel);
    const nextDepth = getMapDrillDepth(safeLevel);
    if (nextDepth > previousDepth) {
      state.map.pendingDrillTransition = 'forward';
    } else if (nextDepth < previousDepth) {
      state.map.pendingDrillTransition = 'backward';
    } else {
      state.map.pendingDrillTransition = 'none';
    }
  }
  state.map.drillLevel = safeLevel;
  if (safeLevel === 'continent') {
    state.map.drillContinentKey = '';
    state.map.drillCountryKey = '';
  } else if (safeLevel === 'country') {
    state.map.drillContinentKey = rawContinentKey;
    state.map.drillCountryKey = '';
  } else {
    state.map.drillContinentKey = rawContinentKey || 'NA';
    state.map.drillCountryKey = rawCountryKey || 'US';
  }
  syncCompletionSortControls();
}

function resetMapDrillState() {
  setMapDrillLevel('continent', {
    continentKey: '',
    countryKey: '',
    disableTransition: true,
  });
}

function moveMapDrill(model, level, options = {}) {
  if (!model) {
    return;
  }
  const safeLevel = normalizeMapDrillLevel(level);
  const continentKey = String(options.continentKey || '').trim().toUpperCase();
  const countryKey = String(options.countryKey || '').trim().toUpperCase();
  state.map.expandedRegion = null;
  if (safeLevel === 'continent') {
    setMapDrillLevel('continent');
    clearMapRegionSelection(model, { resetView: true });
    return;
  }
  if (safeLevel === 'country') {
    setMapDrillLevel('country', { continentKey });
    if (continentKey) {
      focusMapRegion(model, 'continent', continentKey);
    } else {
      renderMapProgressPanels(model);
    }
    return;
  }
  setMapDrillLevel('us-state', { continentKey, countryKey: countryKey || 'US' });
  focusMapRegion(model, 'country', 'US');
}

function playMapDrillTransition() {
  const direction = state.map.pendingDrillTransition;
  state.map.pendingDrillTransition = 'none';
  if (direction !== 'forward' && direction !== 'backward') {
    return;
  }
  const className = direction === 'forward'
    ? 'is-drill-anim-forward'
    : 'is-drill-anim-backward';
  elements.mapDrillProgress.classList.remove('is-drill-anim-forward', 'is-drill-anim-backward');
  void elements.mapDrillProgress.offsetWidth;
  elements.mapDrillProgress.classList.add(className);
  window.setTimeout(() => {
    elements.mapDrillProgress.classList.remove(className);
  }, 260);
}

function resetToLanding({
  clearPersisted = false,
  clearPersistPreference = false,
  clearManualMappings = false,
} = {}) {
  state.model = null;
  state.references = null;
  state.activeTab = 'map';
  state.map.regionPointIndex = null;
  state.map.regionPointIndexModel = null;
  state.map.selectedRegion = null;
  state.map.expandedRegion = null;
  state.map.continentQuery = '';
  state.map.continentSort = 'total_desc';
  state.map.countryQuery = '';
  state.map.countrySort = 'total_desc';
  state.map.usStateQuery = '';
  state.map.usStateSort = 'total_desc';
  resetMapDrillState();
  state.aircraft.query = '';
  state.aircraft.sortBy = 'xp';
  state.aircraft.sortDirection = 'desc';
  state.aircraft.focusType = null;
  state.aircraft.focusCategory = null;
  state.aircraft.focusTier = null;
  state.aircraft.expandedFocus = null;
  state.aircraft.focusDetailIndex = null;
  state.aircraft.focusDetailIndexModel = null;
  state.aircraft.visibleRows = [];
  state.aircraft.renderSignature = '';
  state.aircraft.lastRenderedRowsRef = null;
  state.aircraft.renderQueued = false;
  state.upload.fileName = '';
  state.upload.text = '';
  state.daily.query = '';
  state.daily.suggestions = [];
  state.daily.selectedSuggestionIndex = -1;
  setDailyFeedback('', 'muted');
  resetRegistrationModalState();
  resetModelRegsModalState();
  setRegistrationModalOpen(false, { restoreFocus: false });
  setModelRegsModalOpen(false, { restoreFocus: false });

  clearMapLayers();
  clearDashboardPanels();

  syncCompletionSortControls();
  elements.aircraftSearch.value = '';
  syncAircraftSortControls();
  syncRegistrationModalControls();
  renderRegistrationModalTrigger(null);
  elements.fileInput.value = '';
  setUploadStatus('Waiting for a collection export.');

  elements.dashboard.hidden = true;
  elements.landingView.hidden = false;
  setDataToolsOpen(false);
  syncDashboardTabAvailability();
  renderLandingDailyCtas();

  if (clearPersisted) {
    clearPersistedUpload();
  }
  if (clearPersistPreference) {
    writePersistPreference(false);
    setPersistPreferenceChecked(false);
  }
  if (clearManualMappings) {
    state.manualRegistrationMappings.clear();
    clearManualRegistrationMappings();
  }
  updateManualMappingStorageMeta(null);
  syncDataToolsPanelState();
}

function wireDataTools() {
  elements.dataToolsTrigger.addEventListener('click', (event) => {
    event.stopPropagation();
    setDataToolsOpen(!state.ui.dataToolsOpen);
  });

  elements.dataToolsUpload.addEventListener('click', () => {
    setDataToolsOpen(false);
    elements.fileInput.click();
  });

  elements.dataToolsPersistUpload.addEventListener('change', () => {
    handlePersistPreferenceChange(elements.dataToolsPersistUpload.checked);
  });

  elements.dataToolsClear.addEventListener('click', () => {
    resetToLanding({
      clearPersisted: true,
      clearPersistPreference: true,
      clearManualMappings: true,
    });
    setBanner('Cleared current dashboard and removed saved local data from this device.', 'info');
  });

  document.addEventListener('click', (event) => {
    if (!state.ui.dataToolsOpen) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Node)) {
      return;
    }
    if (elements.dataToolsMenu.contains(target) || elements.dataToolsTrigger.contains(target)) {
      return;
    }
    setDataToolsOpen(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && state.ui.dataToolsOpen) {
      setDataToolsOpen(false);
      elements.dataToolsTrigger.focus();
    }
  });
}

function setActiveTab(tabId, options = {}) {
  const wantsCollectionTab = tabId === 'map' || tabId === 'aircraft';
  if (wantsCollectionTab && !state.model) {
      setBanner('Upload a collection export to unlock the Map and Deck tabs. Navdle and Cardle work without an upload.', 'info', {
      autoDismissMs: 5000,
    });
    tabId = 'navdle';
  }
  state.activeTab = tabId;
  const isNavdle = tabId === 'navdle';
  const isCardle = tabId === 'cardle';
  const isMap = tabId === 'map';
  const isAircraft = tabId === 'aircraft';
  if (!isAircraft && state.ui.registrationModalOpen) {
    setRegistrationModalOpen(false, { restoreFocus: false });
  }
  if (!isAircraft && state.ui.modelRegsModalOpen) {
    setModelRegsModalOpen(false, { restoreFocus: false });
  }
  elements.dailyTabButton.classList.toggle('is-active', isNavdle);
  elements.cardleTabButton.classList.toggle('is-active', isCardle);
  elements.mapTabButton.classList.toggle('is-active', isMap);
  elements.aircraftTabButton.classList.toggle('is-active', isAircraft);
  elements.dailyTabButton.setAttribute('aria-selected', String(isNavdle));
  elements.cardleTabButton.setAttribute('aria-selected', String(isCardle));
  elements.mapTabButton.setAttribute('aria-selected', String(isMap));
  elements.aircraftTabButton.setAttribute('aria-selected', String(isAircraft));
  elements.dailyTabPanel.hidden = !isNavdle;
  elements.cardleTabPanel.hidden = !isCardle;
  elements.mapTabPanel.hidden = !isMap;
  elements.aircraftTabPanel.hidden = !isAircraft;
  if (options.skipAutoEnsure) {
    return;
  }
  if (isMap) {
    requestAnimationFrame(() => {
      if (state.map.instance) {
        state.map.instance.invalidateSize();
      }
    });
    return;
  }
  if (isAircraft) {
    requestAnimationFrame(() => {
      queueAircraftListRender();
    });
    return;
  }
  if (isCardle) {
    requestAnimationFrame(() => {
      if (state.cardle.challenge || state.cardle.error) {
        renderCardleTab();
      } else {
        void ensureCardleGameReady({ focusInput: true });
      }
    });
    return;
  }
  requestAnimationFrame(() => {
    if (state.daily.challenge || state.daily.error) {
      renderDailyTab();
    } else {
      void ensureDailyGameReady({ focusInput: true });
    }
  });
}

function wireTabs() {
  const buttons = [elements.dailyTabButton, elements.cardleTabButton, elements.mapTabButton, elements.aircraftTabButton];
  const syncTabHash = (target) => {
    if (target === 'navdle') {
      updateUrlHash(DAILY_GAME_HASH);
      return;
    }
    if (target === 'cardle') {
      updateUrlHash(CARDLE_GAME_HASH);
      return;
    }
    if (isDailyHashRoute() || isCardleHashRoute()) {
      updateUrlHash('');
    }
  };
  const activateTabTarget = (target) => {
    if (target === 'navdle') {
      void openDailyExperience({ focusInput: true });
      return;
    }
    if (target === 'cardle') {
      void openCardleExperience({ focusInput: true });
      return;
    }
    syncTabHash(target);
    setActiveTab(target);
  };
  for (const button of buttons) {
    button.addEventListener('click', () => {
      if (button.disabled) {
        setBanner('Upload a collection export to unlock the Map and Deck tabs. Navdle and Cardle work without an upload.', 'info', {
          autoDismissMs: 5000,
        });
        return;
      }
      const target = button.dataset.tab;
      if (target) {
        activateTabTarget(target);
      }
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }
      event.preventDefault();
      let nextIndex = buttons.indexOf(button);
      do {
        nextIndex = event.key === 'ArrowRight'
          ? (nextIndex + 1) % buttons.length
          : (nextIndex - 1 + buttons.length) % buttons.length;
      } while (buttons[nextIndex].disabled && nextIndex !== buttons.indexOf(button));
      const nextButton = buttons[nextIndex];
      nextButton.focus();
      const target = nextButton.dataset.tab;
      if (target) {
        activateTabTarget(target);
      }
    });
  }
}

function sortCompletionRows(rows, sortBy) {
  const sortable = rows.slice();
  switch (sortBy) {
    case 'percent_asc':
      return sortable.sort((left, right) => left.percent - right.percent || right.captured - left.captured || left.label.localeCompare(right.label));
    case 'total_desc':
      return sortable.sort((left, right) => right.total - left.total || right.percent - left.percent || right.captured - left.captured || left.label.localeCompare(right.label));
    case 'total_asc':
      return sortable.sort((left, right) => left.total - right.total || left.percent - right.percent || left.captured - right.captured || left.label.localeCompare(right.label));
    case 'captured_desc':
      return sortable.sort((left, right) => right.captured - left.captured || right.percent - left.percent || left.label.localeCompare(right.label));
    case 'captured_asc':
      return sortable.sort((left, right) => left.captured - right.captured || left.percent - right.percent || left.label.localeCompare(right.label));
    case 'name_desc':
      return sortable.sort((left, right) => right.label.localeCompare(left.label));
    case 'name_asc':
      return sortable.sort((left, right) => left.label.localeCompare(right.label));
    case 'percent_desc':
    default:
      return sortable.sort((left, right) => right.percent - left.percent || right.captured - left.captured || left.label.localeCompare(right.label));
  }
}

function applyCompletionFilters(rows, query, sortBy) {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? rows.filter((row) => row.label.toLowerCase().includes(normalizedQuery))
    : rows.slice();
  return sortCompletionRows(filtered, sortBy);
}

function setCompletionMeta(target, shownCount, totalCount, label) {
  target.textContent = `${formatNumber(shownCount)} shown of ${formatNumber(totalCount)} ${label}.`;
}

function renderMapKpis(model) {
  const airportPercent = formatPercent(model.summary.airportCaptureRate, 1);
  elements.mapAirportKpi.textContent = `Unlocked ${formatNumber(model.map.capturedAirports)} / ${formatNumber(model.map.totalAirports)} airports (${airportPercent} complete).`;
}

function isRegionSelected(regionType, regionKey) {
  return Boolean(
    state.map.selectedRegion
      && state.map.selectedRegion.type === regionType
      && state.map.selectedRegion.key === regionKey,
  );
}

function isRegionExpanded(regionType, regionKey) {
  return Boolean(
    state.map.expandedRegion
      && state.map.expandedRegion.type === regionType
      && state.map.expandedRegion.key === regionKey,
  );
}

function ensureRegionPointIndex(model) {
  if (state.map.regionPointIndexModel === model && state.map.regionPointIndex) {
    return state.map.regionPointIndex;
  }
  const continent = new Map();
  const country = new Map();
  const usState = new Map();
  const countryToContinent = new Map();
  for (const point of model.map.airportPoints) {
    if (point.continentKey) {
      if (!continent.has(point.continentKey)) {
        continent.set(point.continentKey, []);
      }
      continent.get(point.continentKey).push(point);
    }
    if (point.countryCode) {
      if (!country.has(point.countryCode)) {
        country.set(point.countryCode, []);
      }
      country.get(point.countryCode).push(point);
      if (point.continentKey && !countryToContinent.has(point.countryCode)) {
        countryToContinent.set(point.countryCode, point.continentKey);
      }
    }
    if (point.countryCode === 'US' && point.usStateCode) {
      if (!usState.has(point.usStateCode)) {
        usState.set(point.usStateCode, []);
      }
      usState.get(point.usStateCode).push(point);
    }
  }
  state.map.regionPointIndex = { continent, country, usState, countryToContinent };
  state.map.regionPointIndexModel = model;
  return state.map.regionPointIndex;
}

function getRegionAirportPoints(model, regionType, regionKey) {
  if (!model?.map?.airportPoints?.length) {
    return [];
  }
  const index = ensureRegionPointIndex(model);
  if (regionType === 'continent') {
    return index.continent.get(regionKey) || [];
  }
  if (regionType === 'country') {
    return index.country.get(regionKey) || [];
  }
  if (regionType === 'us-state') {
    return index.usState.get(regionKey) || [];
  }
  return [];
}

function getCountryContinentKey(model, countryKey) {
  const index = ensureRegionPointIndex(model);
  return index.countryToContinent.get(countryKey) || '';
}

function buildRegionCodeCollections(model, regionType, regionKey) {
  const points = getRegionAirportPoints(model, regionType, regionKey);
  const capturedCodes = new Set();
  const remainingCodes = new Set();
  for (const point of points) {
    const code = buildAirportExportCode(point);
    if (!code) {
      continue;
    }
    if (point.captured) {
      capturedCodes.add(code);
    } else {
      remainingCodes.add(code);
    }
  }
  const sorter = (left, right) => left.localeCompare(right);
  return {
    capturedCodes: Array.from(capturedCodes).sort(sorter),
    remainingCodes: Array.from(remainingCodes).sort(sorter),
  };
}

function renderRegionCodeList(codes, emptyMessage) {
  if (!codes.length) {
    return `<p class="region-code-empty">${escapeHtml(emptyMessage)}</p>`;
  }
  const preview = codes.slice(0, REGION_CODE_PREVIEW_LIMIT);
  const hiddenCount = codes.length - preview.length;
  return `
    <div class="region-code-list">
      ${preview.map((code) => `<code>${escapeHtml(code)}</code>`).join('')}
    </div>
    ${hiddenCount > 0
      ? `<p class="region-code-overflow">Showing ${formatNumber(preview.length)} of ${formatNumber(codes.length)} codes.</p>`
      : ''}
  `;
}

function renderRegionCodeGroup(row, regionType, scope, codes) {
  const actionLabel = scope === 'remaining' ? 'remaining' : 'captured';
  const emptyMessage = scope === 'remaining' ? 'No missing airports in this region.' : 'No captured airports in this region yet.';
  return `
    <section class="region-code-group">
      <div class="region-code-group-head">
        <p class="region-code-group-title">${scope === 'remaining' ? 'Remaining' : 'Captured'} codes (${formatNumber(codes.length)})</p>
        <div class="region-code-actions">
          <button
            type="button"
            class="region-action-button"
            data-action="copy-region-codes"
            data-region-type="${escapeHtml(regionType)}"
            data-region-key="${escapeHtml(row.key)}"
            data-code-scope="${escapeHtml(scope)}"
            ${codes.length ? '' : 'disabled'}
          >
            Copy ${actionLabel}
          </button>
          <button
            type="button"
            class="region-action-button"
            data-action="export-region-codes"
            data-region-type="${escapeHtml(regionType)}"
            data-region-key="${escapeHtml(row.key)}"
            data-code-scope="${escapeHtml(scope)}"
            ${codes.length ? '' : 'disabled'}
          >
            Export ${actionLabel}
          </button>
        </div>
      </div>
      ${renderRegionCodeList(codes, emptyMessage)}
    </section>
  `;
}

function renderRegionDetail(model, row, regionType) {
  const { capturedCodes, remainingCodes } = buildRegionCodeCollections(model, regionType, row.key);
  return `
    <div class="completion-region-detail">
      <p class="completion-region-summary">
        ${escapeHtml(row.label)}: ${formatNumber(row.captured)} captured, ${formatNumber(row.remaining)} remaining.
      </p>
      ${renderRegionCodeGroup(row, regionType, 'remaining', remainingCodes)}
      ${renderRegionCodeGroup(row, regionType, 'captured', capturedCodes)}
    </div>
  `;
}

function getRegionLabel(model, regionType, regionKey) {
  let rows = model.map.countryProgress;
  if (regionType === 'continent') {
    rows = model.map.continentProgress;
  } else if (regionType === 'us-state') {
    rows = model.map.usStateProgress;
  }
  return rows.find((row) => row.key === regionKey)?.label || regionKey;
}

function toFileSafeToken(value) {
  const normalized = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'region';
}

function buildRegionCodesPayload(model, regionType, regionKey, scope) {
  const { capturedCodes, remainingCodes } = buildRegionCodeCollections(model, regionType, regionKey);
  const codes = scope === 'captured' ? capturedCodes : remainingCodes;
  const regionLabel = getRegionLabel(model, regionType, regionKey);
  const scopeLabel = scope === 'captured' ? 'captured' : 'remaining';
  return {
    regionLabel,
    regionType,
    scopeLabel,
    codes,
  };
}

function triggerTextDownload(fileName, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.style.display = 'none';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

async function copyRegionCodes(model, regionType, regionKey, scope) {
  const payload = buildRegionCodesPayload(model, regionType, regionKey, scope);
  if (!payload.codes.length) {
    setBanner(`No ${payload.scopeLabel} airport codes are available for ${payload.regionLabel}.`, 'warning');
    return;
  }
  const text = payload.codes.join('\n');
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable');
    }
    await navigator.clipboard.writeText(text);
    setBanner(`Copied ${formatNumber(payload.codes.length)} ${payload.scopeLabel} codes for ${payload.regionLabel}.`, 'success', {
      autoDismissMs: 5000,
    });
  } catch {
    setBanner('Clipboard copy failed in this browser context. Use Export to file instead.', 'warning');
  }
}

function exportRegionCodes(model, regionType, regionKey, scope) {
  const payload = buildRegionCodesPayload(model, regionType, regionKey, scope);
  if (!payload.codes.length) {
    setBanner(`No ${payload.scopeLabel} airport codes are available for ${payload.regionLabel}.`, 'warning');
    return;
  }
  const content = [
    `Skyviz ${payload.scopeLabel} airport codes`,
    `Region: ${payload.regionLabel}`,
    `Region type: ${payload.regionType}`,
    `Code count: ${payload.codes.length}`,
    '',
    ...payload.codes,
  ].join('\n');
  const fileName = `skyviz-${payload.scopeLabel}-${payload.regionType}-${toFileSafeToken(payload.regionLabel)}.txt`;
  triggerTextDownload(fileName, content);
  setBanner(`Exported ${formatNumber(payload.codes.length)} ${payload.scopeLabel} codes for ${payload.regionLabel}.`, 'success', {
    autoDismissMs: 5000,
  });
}

function toCompletionDisplayRows(rows) {
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    percent: row.percent,
    captured: row.captured,
    total: row.total,
    remaining: row.remaining,
    color: row.color,
    meta: `${formatNumber(row.captured)} / ${formatNumber(row.total)} (${formatNumber(row.remaining)} remaining)`,
  }));
}

function getContinentProgressRow(model, continentKey) {
  return model.map.continentProgress.find((row) => row.key === continentKey) || null;
}

function getCountryProgressRow(model, countryKey) {
  return model.map.countryProgress.find((row) => row.key === countryKey) || null;
}

function getDrillTargetForRegion(regionType, regionKey) {
  if (regionType === 'continent' && regionKey) {
    return true;
  }
  if (regionType === 'country' && regionKey === 'US') {
    return true;
  }
  return false;
}

function buildMapDrillView(model) {
  const level = normalizeMapDrillLevel(state.map.drillLevel);
  if (level === 'country') {
    const continentKey = state.map.drillContinentKey;
    const continentRow = getContinentProgressRow(model, continentKey);
    if (!continentRow) {
      resetMapDrillState();
      return buildMapDrillView(model);
    }
    const allRows = model.map.countryProgress.filter(
      (row) => getCountryContinentKey(model, row.key) === continentKey,
    );
    const completionState = getMapCompletionState('country');
    const filteredRows = applyCompletionFilters(allRows, completionState.query, completionState.sort);
    const capturedCount = allRows.filter((row) => row.captured > 0).length;
    const percent = formatPercent((capturedCount / Math.max(allRows.length, 1)) * 100, 1);
    return {
      level: 'country',
      regionType: 'country',
      eyebrow: `Viewing ${continentRow.label}`,
      title: 'Airport completion explorer',
      helper: 'Click a country row to focus the map. United States drills into US state completion.',
      kpi: `Unlocked ${formatNumber(capturedCount)} / ${formatNumber(allRows.length)} countries in ${continentRow.label} (${percent}).`,
      rows: toCompletionDisplayRows(filteredRows),
      shownCount: filteredRows.length,
      totalCount: allRows.length,
      itemLabel: 'countries',
      emptyMessage: `No country data available for ${continentRow.label}.`,
      nav: [
        { label: 'Continents', level: 'continent' },
        { label: continentRow.label, level: 'country', continentKey, isCurrent: true },
      ],
    };
  }
  if (level === 'us-state') {
    const continentKey = state.map.drillContinentKey || getCountryContinentKey(model, 'US') || 'NA';
    const countryRow = getCountryProgressRow(model, 'US');
    if (!countryRow) {
      setMapDrillLevel('country', { continentKey });
      return buildMapDrillView(model);
    }
    const completionState = getMapCompletionState('us-state');
    const allRows = model.map.usStateProgress.slice();
    const filteredRows = applyCompletionFilters(allRows, completionState.query, completionState.sort);
    const capturedCount = allRows.filter((row) => row.captured > 0).length;
    const percent = formatPercent((capturedCount / Math.max(allRows.length, 1)) * 100, 1);
    return {
      level: 'us-state',
      regionType: 'us-state',
      eyebrow: 'Viewing United States',
      title: 'Airport completion explorer',
      helper: 'Click a US state row to focus it on the map. Use Back to return to countries.',
      kpi: `Unlocked ${formatNumber(capturedCount)} / ${formatNumber(allRows.length)} US states (${percent}).`,
      rows: toCompletionDisplayRows(filteredRows),
      shownCount: filteredRows.length,
      totalCount: allRows.length,
      itemLabel: 'US states',
      emptyMessage: 'No US state data available.',
      nav: [
        { label: 'Continents', level: 'continent' },
        { label: (getContinentProgressRow(model, continentKey)?.label || 'Continent'), level: 'country', continentKey },
        { label: countryRow.label, level: 'us-state', continentKey, countryKey: 'US', isCurrent: true },
      ],
    };
  }

  const completionState = getMapCompletionState('continent');
  const allRows = model.map.continentProgress.slice();
  const filteredRows = applyCompletionFilters(allRows, completionState.query, completionState.sort);
  const percent = formatPercent(
    (model.summary.uniqueCapturedContinents / Math.max(model.summary.totalContinents, 1)) * 100,
    1,
  );
  return {
    level: 'continent',
    regionType: 'continent',
    eyebrow: 'Drill-down explorer',
    title: 'Airport completion explorer',
    helper: 'Click a continent row to drill into country completion.',
    kpi: `Unlocked ${formatNumber(model.summary.uniqueCapturedContinents)} / ${formatNumber(model.summary.totalContinents)} continents (${percent}).`,
    rows: toCompletionDisplayRows(filteredRows),
    shownCount: filteredRows.length,
    totalCount: allRows.length,
    itemLabel: 'continents',
    emptyMessage: 'No continent data available.',
    nav: [
      { label: 'Continents', level: 'continent', isCurrent: true },
    ],
  };
}

function renderMapDrillNavigation(view) {
  const crumbs = view.nav
    .map((item, index) => {
      const button = `
        <button
          type="button"
          class="map-drill-nav-button${item.isCurrent ? ' is-current' : ''}"
          data-action="set-map-drill-level"
          data-drill-level="${escapeHtml(item.level)}"
          data-drill-continent="${escapeHtml(item.continentKey || '')}"
          data-drill-country="${escapeHtml(item.countryKey || '')}"
          ${item.isCurrent ? 'disabled aria-current="page"' : ''}
        >
          ${escapeHtml(item.label)}
        </button>
      `;
      if (index === 0) {
        return button;
      }
      return `<span class="map-drill-nav-divider" aria-hidden="true">/</span>${button}`;
    })
    .join('');
  const showBackButton = view.level !== 'continent';
  const backButton = showBackButton
    ? `
      <button
        type="button"
        class="map-drill-nav-button is-back"
        data-action="map-drill-back"
        aria-label="Go back one level"
      >
        Back
      </button>
    `
    : '';
  elements.mapDrillNav.innerHTML = `
    ${backButton}
    <div class="map-drill-nav-crumbs">
      ${crumbs}
    </div>
  `;
}

function renderCompletionProgressRows(model, rows, regionType, emptyMessage) {
  if (!rows.length) {
    return `<div class="empty-copy">${escapeHtml(emptyMessage)}</div>`;
  }
  return `
    <div class="bar-list completion-region-list">
      ${rows
    .map((row) => {
      const width = Math.max(0, Math.min(row.percent, 100));
      const isSelected = isRegionSelected(regionType, row.key);
      const isExpanded = isRegionExpanded(regionType, row.key);
      const drillTarget = getDrillTargetForRegion(regionType, row.key);
      const usStateBadge = regionType === 'country' && row.key === 'US'
        ? '<span class="completion-drill-badge">State breakdown available</span>'
        : '';
      return `
          <article class="bar-row completion-region-row${isSelected ? ' is-selected' : ''}${isExpanded ? ' is-expanded' : ''}">
            <div class="completion-region-row-top">
              <button
                type="button"
                class="bar-row-button completion-focus-button${isSelected ? ' is-selected' : ''}"
                data-action="focus-region"
                data-region-type="${escapeHtml(regionType)}"
                data-region-key="${escapeHtml(row.key)}"
                aria-pressed="${String(isSelected)}"
                title="Focus map on ${escapeHtml(row.label)}"
              >
                <div class="bar-row-head">
                  <div class="completion-row-label-stack">
                    <span class="bar-label">${escapeHtml(row.label)}</span>
                    ${usStateBadge}
                    <span class="bar-meta">${escapeHtml(row.meta)}</span>
                  </div>
                  <div class="completion-row-value-stack">
                    <strong>${escapeHtml(formatPercent(row.percent, 1))}</strong>
                    ${drillTarget ? '<span class="completion-drill-arrow" aria-hidden="true">&#8250;</span>' : ''}
                  </div>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${width.toFixed(2)}%;--bar-color:${row.color || '#103f6e'};"></div>
                </div>
              </button>
              <button
                type="button"
                class="region-expand-button"
                data-action="toggle-region-details"
                data-region-type="${escapeHtml(regionType)}"
                data-region-key="${escapeHtml(row.key)}"
                aria-expanded="${String(isExpanded)}"
                aria-label="${isExpanded ? 'Hide details' : 'Show details'} for ${escapeHtml(row.label)}"
              >
                ${isExpanded ? 'Hide' : 'Details'}
              </button>
            </div>
            ${isExpanded ? renderRegionDetail(model, row, regionType) : ''}
          </article>
        `;
    })
    .join('')}
    </div>
  `;
}

function getAirportMarkerBaseRadius(point) {
  return point.captured ? 2.5 : 2.2;
}

function getScaledMarkerRadius(baseRadius, zoomLevel) {
  const zoomDelta = Math.max((Number.isFinite(zoomLevel) ? zoomLevel : MAP_BASE_VIEW.zoom) - MAP_BASE_VIEW.zoom, 0);
  const scaledRadius = baseRadius * (1 + zoomDelta * MAP_MARKER_SCALE_PER_ZOOM);
  return Math.min(scaledRadius, MAP_MAX_MARKER_RADIUS);
}

function buildAirportCodeDisplay(point) {
  const icao = String(point.icao || '').trim().toUpperCase();
  const iata = String(point.iata || '').trim().toUpperCase();
  if (icao && iata && icao !== iata) {
    return `${icao} (${iata})`;
  }
  return icao || iata || String(point.id || '').trim();
}

function buildAirportExportCode(point) {
  const icao = String(point.icao || '').trim().toUpperCase();
  const iata = String(point.iata || '').trim().toUpperCase();
  if (icao && iata && icao !== iata) {
    return `${icao} (${iata})`;
  }
  return icao || iata || '';
}

function buildAirportCodeLabel(point) {
  const icao = String(point.icao || '').trim().toUpperCase();
  const iata = String(point.iata || '').trim().toUpperCase();
  if (icao && iata && icao !== iata) {
    return `${icao}/${iata}`;
  }
  return icao || iata || '';
}

function toFr24AirportSlug(point) {
  const rawCode = String(point.iata || point.icao || '').trim().toLowerCase();
  const safeCode = rawCode.replace(/[^a-z0-9-]/g, '');
  return safeCode || '';
}

function toSkydexAirportCode(point) {
  const rawCode = String(point.iata || point.icao || '').trim().toUpperCase();
  const safeCode = rawCode.replace(/[^A-Z0-9]/g, '');
  return safeCode || '';
}

function clearCodeLabelLayer() {
  if (state.map.instance && state.map.codeLabelLayer) {
    state.map.instance.removeLayer(state.map.codeLabelLayer);
  }
  state.map.codeLabelLayer = null;
}

function syncMapCodeLabels() {
  if (!state.map.instance || !window.L || !state.model) {
    return;
  }
  clearCodeLabelLayer();
  const map = state.map.instance;
  if (map.getZoom() < MAP_CODE_LABEL_MIN_ZOOM) {
    return;
  }
  const bounds = map.getBounds();
  const visiblePoints = state.model.map.airportPoints.filter(
    (point) => Number.isFinite(point.lat) && Number.isFinite(point.lon) && bounds.contains([point.lat, point.lon]),
  );
  if (!visiblePoints.length) {
    return;
  }

  const prioritizedPoints = visiblePoints
    .slice()
    .sort((left, right) => Number(right.captured) - Number(left.captured))
    .slice(0, MAP_CODE_LABEL_MAX_COUNT);

  const labelMarkers = [];
  for (const point of prioritizedPoints) {
    const codeLabel = buildAirportCodeLabel(point);
    if (!codeLabel) {
      continue;
    }
    const marker = window.L.marker([point.lat, point.lon], {
      interactive: false,
      keyboard: false,
      zIndexOffset: 1500,
      icon: window.L.divIcon({
        className: 'map-code-label-marker',
        html: `<span class="map-code-label">${escapeHtml(codeLabel)}</span>`,
        iconSize: [0, 0],
      }),
    });
    labelMarkers.push(marker);
  }
  if (!labelMarkers.length) {
    return;
  }
  state.map.codeLabelLayer = window.L.layerGroup(labelMarkers);
  state.map.codeLabelLayer.addTo(map);
}

function syncMapMarkerRadii() {
  if (!state.map.instance) {
    return;
  }
  const zoom = state.map.instance.getZoom();
  for (const entry of state.map.markerEntries) {
    entry.marker.setRadius(getScaledMarkerRadius(entry.baseRadius, zoom));
  }
  for (const entry of state.map.highlightMarkerEntries) {
    entry.marker.setRadius(getScaledMarkerRadius(entry.baseRadius, zoom));
  }
}

function clearRegionHighlight() {
  if (state.map.instance && state.map.highlightLayer) {
    state.map.instance.removeLayer(state.map.highlightLayer);
  }
  state.map.highlightLayer = null;
  state.map.highlightMarkerEntries = [];
}

function clearMapRegionSelection(model, { resetView = false } = {}) {
  state.map.selectedRegion = null;
  clearRegionHighlight();
  if (resetView && state.map.instance) {
    state.map.instance.setView(MAP_BASE_VIEW.center, MAP_BASE_VIEW.zoom);
    syncMapMarkerRadii();
  }
  if (model) {
    renderMapProgressPanels(model);
  }
}

function toggleRegionDetails(model, regionType, regionKey) {
  if (isRegionExpanded(regionType, regionKey)) {
    state.map.expandedRegion = null;
  } else {
    state.map.expandedRegion = { type: regionType, key: regionKey };
  }
  renderMapProgressPanels(model);
}

function focusMapRegion(model, regionType, regionKey) {
  if (!model) {
    return;
  }
  const map = ensureMapInstance();
  if (!map || !window.L) {
    return;
  }
  const points = getRegionAirportPoints(model, regionType, regionKey);
  if (!points.length) {
    return;
  }

  state.map.selectedRegion = { type: regionType, key: regionKey };
  clearRegionHighlight();

  const highlightMarkers = [];
  const highlightMarkerEntries = [];
  for (const point of points) {
    const baseRadius = getAirportMarkerBaseRadius(point) + MAP_HIGHLIGHT_EXTRA_RADIUS;
    const marker = window.L.circleMarker([point.lat, point.lon], {
      renderer: state.map.renderer,
      radius: baseRadius,
      stroke: true,
      color: '#f9aa59',
      weight: 1.6,
      fillColor: '#f9aa59',
      fillOpacity: 0.18,
      interactive: false,
      bubblingMouseEvents: false,
    });
    highlightMarkers.push(marker);
    highlightMarkerEntries.push({ marker, baseRadius });
  }
  state.map.highlightLayer = window.L.layerGroup(highlightMarkers);
  state.map.highlightLayer.addTo(map);
  state.map.highlightMarkerEntries = highlightMarkerEntries;

  const bounds = window.L.latLngBounds(points.map((point) => [point.lat, point.lon]));
  if (bounds.isValid()) {
    const maxZoom = MAP_REGION_MAX_ZOOM[regionType] || MAP_REGION_MAX_ZOOM.country;
    map.fitBounds(bounds.pad(0.2), {
      maxZoom,
      animate: true,
    });
  }

  syncMapMarkerRadii();
  renderMapProgressPanels(model);
}

function ensureMapInstance() {
  if (state.map.instance) {
    return state.map.instance;
  }
  if (!window.L) {
    elements.mapCanvas.innerHTML = '<div class="empty-copy">Leaflet failed to load. Check your network and refresh.</div>';
    return null;
  }
  const map = window.L.map(elements.mapCanvas, {
    worldCopyJump: true,
    minZoom: 2,
    maxZoom: 8,
    zoomControl: true,
    preferCanvas: true,
  });
  window.L.tileLayer(LEAFLET_TILE_URL, {
    attribution: LEAFLET_TILE_ATTRIBUTION,
  }).addTo(map);
  map.setView(MAP_BASE_VIEW.center, MAP_BASE_VIEW.zoom);
  map.on('zoom', () => {
    syncMapMarkerRadii();
  });
  map.on('zoomend', () => {
    syncMapCodeLabels();
  });
  map.on('moveend', () => {
    syncMapCodeLabels();
  });
  state.map.instance = map;
  state.map.renderer = window.L.canvas({ padding: 0.4 });
  return map;
}

function clearMapLayers() {
  state.map.markerEntries = [];
  clearRegionHighlight();
  clearCodeLabelLayer();
  if (state.map.instance && state.map.capturedLayer) {
    state.map.instance.removeLayer(state.map.capturedLayer);
  }
  if (state.map.instance && state.map.missingLayer) {
    state.map.instance.removeLayer(state.map.missingLayer);
  }
  state.map.capturedLayer = null;
  state.map.missingLayer = null;
}

function buildAirportPopup(point) {
  const code = buildAirportCodeDisplay(point);
  const fr24Slug = toFr24AirportSlug(point);
  const skydexCode = toSkydexAirportCode(point);
  const fr24Link = fr24Slug
    ? `<a href="https://www.flightradar24.com/airport/${fr24Slug}" target="_blank" rel="noopener noreferrer">View on FR24</a>`
    : '';
  const skydexLink = skydexCode
    ? `<a href="https://www.skydex.info/airport/${skydexCode}" target="_blank" rel="noopener noreferrer">View on Skydex</a>`
    : '';
  const links = [fr24Link, skydexLink].filter(Boolean).join(' | ');
  return `
    <strong>${escapeHtml(code)}</strong><br>
    ${escapeHtml(point.name)}<br>
    ${links}
  `;
}

function renderLeafletMap(model) {
  const map = ensureMapInstance();
  if (!map) {
    return;
  }
  clearMapLayers();
  const points = model.map.airportPoints;
  const capturedMarkers = [];
  const missingMarkers = [];
  const markerEntries = [];
  for (const point of points) {
    const baseRadius = getAirportMarkerBaseRadius(point);
    const marker = window.L.circleMarker([point.lat, point.lon], {
      renderer: state.map.renderer,
      radius: baseRadius,
      stroke: false,
      fillColor: point.captured ? '#2f9e61' : '#db5959',
      fillOpacity: point.captured ? 0.82 : 0.44,
    });
    marker.bindPopup(buildAirportPopup(point), { maxWidth: 260 });
    markerEntries.push({ marker, baseRadius });
    if (point.captured) {
      capturedMarkers.push(marker);
    } else {
      missingMarkers.push(marker);
    }
  }
  state.map.capturedLayer = window.L.layerGroup(capturedMarkers);
  state.map.missingLayer = window.L.layerGroup(missingMarkers);
  state.map.missingLayer.addTo(map);
  state.map.capturedLayer.addTo(map);
  state.map.markerEntries = markerEntries;
  map.setView(MAP_BASE_VIEW.center, MAP_BASE_VIEW.zoom);
  syncMapMarkerRadii();
  syncMapCodeLabels();
  elements.mapLegend.innerHTML = `
    <span class="map-legend-chip">
      <span class="map-legend-dot" style="background:#2f9e61;"></span>
      Captured ${formatNumber(model.map.capturedAirports)}
    </span>
    <span class="map-legend-chip">
      <span class="map-legend-dot" style="background:#db5959;"></span>
      Missing ${formatNumber(model.map.missingAirports)}
    </span>
    <span class="map-legend-chip">
      <span class="map-legend-dot" style="background:#7a8d9c;"></span>
      Total ${formatNumber(model.map.totalAirports)}
    </span>
  `;
  requestAnimationFrame(() => {
    map.invalidateSize();
  });
}

function renderMapProgressPanels(model) {
  const view = buildMapDrillView(model);
  elements.mapDrillEyebrow.textContent = view.eyebrow;
  elements.mapDrillTitle.textContent = view.title;
  elements.mapDrillHelper.textContent = view.helper;
  elements.mapDrillKpi.textContent = view.kpi;
  renderMapDrillNavigation(view);
  setCompletionMeta(elements.mapDrillProgressMeta, view.shownCount, view.totalCount, view.itemLabel);
  elements.mapDrillProgress.innerHTML = renderCompletionProgressRows(
    model,
    view.rows,
    view.regionType,
    view.emptyMessage,
  );
  playMapDrillTransition();
  syncCompletionSortControls();
}

function renderMapTab(model) {
  renderMapKpis(model);
  renderMapProgressPanels(model);
  renderLeafletMap(model);
}

function renderAircraftOverviewPanel(model) {
  const topManufacturer = model.aircraft.topManufacturers[0]?.label || 'Unknown';
  return `
    <div class="section-head compact">
      <div>
        <p class="eyebrow">Aircraft overview</p>
        <h3>Aircraft metadata</h3>
      </div>
    </div>
    <div class="kpi-grid">
      <article class="kpi-card">
        <span class="kpi-label">Observed models</span>
        <strong class="kpi-value">${formatNumber(model.aircraft.rows.length)}</strong>
        <span class="kpi-note">${formatNumber(model.summary.totalCards)} cards in collection</span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Total XP</span>
        <strong class="kpi-value">${formatCompact(model.summary.totalXp)}</strong>
        <span class="kpi-note">${formatCompact(model.summary.averageAircraftXp)} average XP per model</span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Total glow count</span>
        <strong class="kpi-value">${formatNumber(model.summary.totalGlowCount)}</strong>
        <span class="kpi-note">${formatPercent(model.summary.fullCoverageRate, 1)} cards at 100% coverage</span>
      </article>
      <article class="kpi-card">
        <span class="kpi-label">Top manufacturer</span>
        <strong class="kpi-value">${escapeHtml(topManufacturer)}</strong>
        <span class="kpi-note">Highest model count in this export</span>
      </article>
    </div>
  `;
}

function renderBarPanel(eyebrow, title, rows, valueFormatter, emptyMessage) {
  return `
    <div class="section-head compact">
      <div>
        <p class="eyebrow">${escapeHtml(eyebrow)}</p>
        <h3>${escapeHtml(title)}</h3>
      </div>
    </div>
    ${renderBarList(rows, {
      valueFormatter,
      emptyMessage,
    })}
  `;
}

function getAircraftFocusValue(dimension) {
  if (dimension === 'type') {
    return state.aircraft.focusType;
  }
  if (dimension === 'category') {
    return state.aircraft.focusCategory;
  }
  if (dimension === 'tier') {
    return state.aircraft.focusTier;
  }
  return null;
}

function setAircraftFocusValue(dimension, value) {
  if (dimension === 'type') {
    state.aircraft.focusType = value;
  } else if (dimension === 'category') {
    state.aircraft.focusCategory = value;
  } else if (dimension === 'tier') {
    state.aircraft.focusTier = value;
  }
}

function toggleAircraftFocus(dimension, value) {
  const currentValue = getAircraftFocusValue(dimension);
  setAircraftFocusValue(dimension, currentValue === value ? null : value);
}

function isAircraftFocusSelected(dimension, key) {
  return Boolean(getAircraftFocusValue(dimension) && getAircraftFocusValue(dimension) === key);
}

function isAircraftFocusExpanded(scope, dimension, key) {
  return Boolean(
    state.aircraft.expandedFocus
      && state.aircraft.expandedFocus.scope === scope
      && state.aircraft.expandedFocus.dimension === dimension
      && state.aircraft.expandedFocus.key === key,
  );
}

function toggleAircraftFocusDetails(model, scope, dimension, key) {
  if (isAircraftFocusExpanded(scope, dimension, key)) {
    state.aircraft.expandedFocus = null;
  } else {
    state.aircraft.expandedFocus = { scope, dimension, key };
  }
  renderAircraftWidgets(model);
}

function normalizeAircraftFocusKey(dimension, value) {
  if (dimension === 'type') {
    return String(value || '').trim().toUpperCase() || 'unknown';
  }
  return String(value || '').trim().toLowerCase() || 'unknown';
}

function normalizeAircraftModelCode(value) {
  return String(value || '').trim().toUpperCase();
}

function buildAircraftModelEntry(code, name) {
  const normalizedCode = normalizeAircraftModelCode(code);
  const normalizedName = String(name || '').trim();
  if (!normalizedCode && !normalizedName) {
    return null;
  }
  return {
    code: normalizedCode,
    name: normalizedName,
  };
}

function addAircraftModelEntry(bucketMap, key, entry) {
  if (!entry) {
    return;
  }
  if (!bucketMap.has(key)) {
    bucketMap.set(key, new Map());
  }
  const bucket = bucketMap.get(key);
  const entryKey = entry.code || entry.name.toUpperCase();
  if (!entryKey) {
    return;
  }
  if (!bucket.has(entryKey)) {
    bucket.set(entryKey, entry);
  }
}

function sortAircraftModelEntries(entries) {
  return entries
    .slice()
    .sort((left, right) => (left.code || left.name).localeCompare(right.code || right.name) || left.name.localeCompare(right.name));
}

function formatAircraftModelEntryLine(entry) {
  if (entry.code && entry.name) {
    return `${entry.code} - ${entry.name}`;
  }
  return entry.code || entry.name || '';
}

function mapAircraftEntriesToLines(entries) {
  return entries.map((entry) => formatAircraftModelEntryLine(entry)).filter(Boolean);
}

function ensureAircraftFocusDetailIndex(model) {
  if (state.aircraft.focusDetailIndexModel === model && state.aircraft.focusDetailIndex) {
    return state.aircraft.focusDetailIndex;
  }

  const observedRows = Array.isArray(model?.aircraft?.rows) ? model.aircraft.rows : [];
  const referenceRows = Array.isArray(state.references?.referenceModels) ? state.references.referenceModels : [];

  const observedByType = new Map();
  const observedByCategory = new Map();
  const observedByTier = new Map();
  const observedUniverse = new Map();
  for (const row of observedRows) {
    const entry = buildAircraftModelEntry(row.icao || row.modelId || row.key, row.name || row.displayName || 'Unknown model');
    if (!entry) {
      continue;
    }
    const universeKey = entry.code || entry.name.toUpperCase();
    if (!observedUniverse.has(universeKey)) {
      observedUniverse.set(universeKey, entry);
    }
    addAircraftModelEntry(observedByType, normalizeAircraftFocusKey('type', row.typeKey), entry);
    addAircraftModelEntry(observedByCategory, normalizeAircraftFocusKey('category', row.dominantCategory), entry);
    addAircraftModelEntry(observedByTier, normalizeAircraftFocusKey('tier', row.dominantTier), entry);
  }

  const referenceByType = new Map();
  const referenceByCategory = new Map();
  for (const row of referenceRows) {
    const entry = buildAircraftModelEntry(row.id, row.name || row.manufacturer || 'Unknown model');
    if (!entry) {
      continue;
    }
    addAircraftModelEntry(referenceByType, normalizeAircraftFocusKey('type', row.type), entry);
    addAircraftModelEntry(referenceByCategory, normalizeAircraftFocusKey('category', row.cardCategory), entry);
  }

  const index = {
    type: new Map(),
    category: new Map(),
    tier: new Map(),
  };

  const typeKeys = new Set([
    ...model.aircraft.typeProgress.map((row) => row.key),
    ...referenceByType.keys(),
    ...observedByType.keys(),
  ]);
  for (const key of typeKeys) {
    const capturedEntries = sortAircraftModelEntries(Array.from((observedByType.get(key) || new Map()).values()));
    const referenceEntries = sortAircraftModelEntries(Array.from((referenceByType.get(key) || new Map()).values()));
    const capturedCodes = new Set(capturedEntries.map((entry) => entry.code || entry.name.toUpperCase()));
    const missingEntries = referenceEntries.filter((entry) => !capturedCodes.has(entry.code || entry.name.toUpperCase()));
    index.type.set(key, {
      context: 'reference',
      capturedEntries,
      missingEntries,
      totalCount: referenceEntries.length,
    });
  }

  const categoryKeys = new Set([
    ...model.aircraft.categoryProgress.map((row) => row.key),
    ...model.aircraft.categoryXp.map((row) => row.key),
    ...referenceByCategory.keys(),
    ...observedByCategory.keys(),
  ]);
  for (const key of categoryKeys) {
    const capturedEntries = sortAircraftModelEntries(Array.from((observedByCategory.get(key) || new Map()).values()));
    const referenceEntries = sortAircraftModelEntries(Array.from((referenceByCategory.get(key) || new Map()).values()));
    const capturedCodes = new Set(capturedEntries.map((entry) => entry.code || entry.name.toUpperCase()));
    const missingEntries = referenceEntries.filter((entry) => !capturedCodes.has(entry.code || entry.name.toUpperCase()));
    index.category.set(key, {
      context: 'reference',
      capturedEntries,
      missingEntries,
      totalCount: referenceEntries.length,
    });
  }

  const universeEntries = sortAircraftModelEntries(Array.from(observedUniverse.values()));
  const tierKeys = new Set([
    ...model.aircraft.tierXp.map((row) => row.key),
    ...((Array.isArray(model.aircraft.tierGlow) ? model.aircraft.tierGlow : []).map((row) => row.key)),
    ...observedByTier.keys(),
  ]);
  for (const key of tierKeys) {
    const capturedEntries = sortAircraftModelEntries(Array.from((observedByTier.get(key) || new Map()).values()));
    const capturedCodes = new Set(capturedEntries.map((entry) => entry.code || entry.name.toUpperCase()));
    const missingEntries = universeEntries.filter((entry) => !capturedCodes.has(entry.code || entry.name.toUpperCase()));
    index.tier.set(key, {
      context: 'deck',
      capturedEntries,
      missingEntries,
      totalCount: universeEntries.length,
    });
  }

  state.aircraft.focusDetailIndex = index;
  state.aircraft.focusDetailIndexModel = model;
  return index;
}

function getAircraftFocusDetail(model, dimension, key) {
  const detailIndex = ensureAircraftFocusDetailIndex(model);
  const byDimension = detailIndex[dimension];
  if (!byDimension) {
    return {
      context: 'reference',
      capturedEntries: [],
      missingEntries: [],
      totalCount: 0,
    };
  }
  return byDimension.get(key) || {
    context: dimension === 'tier' ? 'deck' : 'reference',
    capturedEntries: [],
    missingEntries: [],
    totalCount: 0,
  };
}

function renderAircraftFocusCodeGroup(dimension, key, scope, entries) {
  const actionLabel = scope === 'missing' ? 'missing' : 'completed';
  const emptyMessage = scope === 'missing'
    ? 'No missing models in this group.'
    : 'No completed models in this group yet.';
  const lines = mapAircraftEntriesToLines(entries);
  return `
    <section class="region-code-group">
      <div class="region-code-group-head">
        <p class="region-code-group-title">${scope === 'missing' ? 'Missing' : 'Completed'} models (${formatNumber(lines.length)})</p>
        <div class="region-code-actions">
          <button
            type="button"
            class="region-action-button"
            data-action="copy-aircraft-focus-codes"
            data-focus-dimension="${escapeHtml(dimension)}"
            data-focus-key="${escapeHtml(key)}"
            data-code-scope="${escapeHtml(scope)}"
            ${lines.length ? '' : 'disabled'}
          >
            Copy ${actionLabel}
          </button>
          <button
            type="button"
            class="region-action-button"
            data-action="export-aircraft-focus-codes"
            data-focus-dimension="${escapeHtml(dimension)}"
            data-focus-key="${escapeHtml(key)}"
            data-code-scope="${escapeHtml(scope)}"
            ${lines.length ? '' : 'disabled'}
          >
            Export ${actionLabel}
          </button>
        </div>
      </div>
      ${renderRegionCodeList(lines, emptyMessage)}
    </section>
  `;
}

function renderAircraftFocusDetail(model, dimension, key) {
  const detail = getAircraftFocusDetail(model, dimension, key);
  const label = getAircraftFocusLabel(model, dimension, key);
  const completedCount = detail.capturedEntries.length;
  const missingCount = detail.missingEntries.length;
  const summary = detail.context === 'deck'
    ? `${label}: ${formatNumber(completedCount)} models in this tier, ${formatNumber(missingCount)} models in other tiers from your deck.`
    : `${label}: ${formatNumber(completedCount)} completed of ${formatNumber(detail.totalCount)} reference models (${formatNumber(missingCount)} missing).`;
  return `
    <div class="completion-region-detail">
      <p class="completion-region-summary">${escapeHtml(summary)}</p>
      ${renderAircraftFocusCodeGroup(dimension, key, 'missing', detail.missingEntries)}
      ${renderAircraftFocusCodeGroup(dimension, key, 'completed', detail.capturedEntries)}
    </div>
  `;
}

function buildAircraftFocusCodesPayload(model, dimension, key, scope) {
  const detail = getAircraftFocusDetail(model, dimension, key);
  const entries = scope === 'completed' ? detail.capturedEntries : detail.missingEntries;
  const lines = mapAircraftEntriesToLines(entries);
  const dimensionLabel = dimension === 'type' ? 'type' : dimension === 'category' ? 'category' : 'tier';
  const groupLabel = getAircraftFocusLabel(model, dimension, key);
  const scopeLabel = scope === 'completed' ? 'completed' : 'missing';
  return {
    lines,
    dimensionLabel,
    groupLabel,
    scopeLabel,
  };
}

async function copyAircraftFocusCodes(model, dimension, key, scope) {
  const payload = buildAircraftFocusCodesPayload(model, dimension, key, scope);
  if (!payload.lines.length) {
    setBanner(`No ${payload.scopeLabel} models are available for ${payload.groupLabel}.`, 'warning');
    return;
  }
  const text = payload.lines.join('\n');
  try {
    if (!navigator.clipboard?.writeText) {
      throw new Error('Clipboard API unavailable');
    }
    await navigator.clipboard.writeText(text);
    setBanner(`Copied ${formatNumber(payload.lines.length)} ${payload.scopeLabel} models for ${payload.groupLabel}.`, 'success', {
      autoDismissMs: 5000,
    });
  } catch {
    setBanner('Clipboard copy failed in this browser context. Use Export to file instead.', 'warning');
  }
}

function exportAircraftFocusCodes(model, dimension, key, scope) {
  const payload = buildAircraftFocusCodesPayload(model, dimension, key, scope);
  if (!payload.lines.length) {
    setBanner(`No ${payload.scopeLabel} models are available for ${payload.groupLabel}.`, 'warning');
    return;
  }
  const content = [
    `Skyviz ${payload.scopeLabel} aircraft models`,
    `Dimension: ${payload.dimensionLabel}`,
    `Group: ${payload.groupLabel}`,
    `Model count: ${payload.lines.length}`,
    '',
    ...payload.lines,
  ].join('\n');
  const fileName = `skyviz-aircraft-${payload.scopeLabel}-${payload.dimensionLabel}-${toFileSafeToken(payload.groupLabel)}.txt`;
  triggerTextDownload(fileName, content);
  setBanner(`Exported ${formatNumber(payload.lines.length)} ${payload.scopeLabel} models for ${payload.groupLabel}.`, 'success', {
    autoDismissMs: 5000,
  });
}

function renderAircraftFocusList(model, rows, options = {}) {
  const includeZero = Boolean(options.includeZero);
  const visibleRows = rows.filter((row) => includeZero ? row.value >= 0 : row.value > 0);
  if (!visibleRows.length) {
    return `<div class="empty-copy">${escapeHtml(options.emptyMessage || 'No values available.')}</div>`;
  }
  const maxValue = Math.max(Number.isFinite(options.maxValue) ? options.maxValue : Math.max(...visibleRows.map((row) => row.value), 1), 1);
  const valueFormatter = options.valueFormatter || formatNumber;
  return `
    <div class="bar-list completion-region-list aircraft-focus-list">
      ${visibleRows.map((row) => {
    const width = Math.max(0, Math.min((row.value / maxValue) * 100, 100));
    const isSelected = isAircraftFocusSelected(options.focusDimension, row.key);
    const isExpanded = isAircraftFocusExpanded(options.focusScope || '', options.focusDimension, row.key);
    return `
          <article class="bar-row completion-region-row aircraft-focus-row${isSelected ? ' is-selected' : ''}${isExpanded ? ' is-expanded' : ''}">
            <div class="completion-region-row-top">
              <button
                type="button"
                class="bar-row-button completion-focus-button aircraft-focus-button${isSelected ? ' is-selected' : ''}"
                data-action="toggle-aircraft-focus"
                data-focus-scope="${escapeHtml(options.focusScope || '')}"
                data-focus-dimension="${escapeHtml(options.focusDimension)}"
                data-focus-key="${escapeHtml(row.key)}"
                aria-pressed="${String(isSelected)}"
                title="Filter aircraft list by ${escapeHtml(row.label)}"
              >
                <div class="bar-row-head">
                  <div class="completion-row-label-stack">
                    <span class="bar-label">${escapeHtml(row.label)}</span>
                    ${row.meta ? `<span class="bar-meta">${escapeHtml(row.meta)}</span>` : ''}
                  </div>
                  <div class="completion-row-value-stack">
                    <strong>${escapeHtml(valueFormatter(row.value))}</strong>
                  </div>
                </div>
                <div class="bar-track">
                  <div class="bar-fill" style="width:${width.toFixed(2)}%;--bar-color:${row.color || '#103f6e'};"></div>
                </div>
              </button>
              <button
                type="button"
                class="region-expand-button"
                data-action="toggle-aircraft-focus-details"
                data-focus-scope="${escapeHtml(options.focusScope || '')}"
                data-focus-dimension="${escapeHtml(options.focusDimension)}"
                data-focus-key="${escapeHtml(row.key)}"
                aria-expanded="${String(isExpanded)}"
                aria-label="${isExpanded ? 'Hide details' : 'Show details'} for ${escapeHtml(row.label)}"
              >
                ${isExpanded ? 'Hide' : 'Details'}
              </button>
            </div>
            ${isExpanded ? renderAircraftFocusDetail(model, options.focusDimension, row.key) : ''}
          </article>
        `;
  }).join('')}
    </div>
  `;
}

function renderAircraftFocusPanel(model, options) {
  return `
    <div class="section-head compact">
      <div>
        <p class="eyebrow">${escapeHtml(options.eyebrow)}</p>
        <h3>${escapeHtml(options.title)}</h3>
      </div>
    </div>
    ${renderAircraftFocusList(model, options.rows, {
      includeZero: options.includeZero,
      maxValue: options.maxValue,
      valueFormatter: options.valueFormatter,
      emptyMessage: options.emptyMessage,
      focusDimension: options.focusDimension,
      focusScope: options.focusScope,
    })}
  `;
}

function getAircraftFocusLabel(model, dimension, key) {
  if (!key) {
    return '';
  }
  let rows = [];
  if (dimension === 'type') {
    rows = model.aircraft.typeProgress;
  } else if (dimension === 'category') {
    rows = model.aircraft.categoryProgress;
  } else if (dimension === 'tier') {
    rows = model.aircraft.tierXp;
  }
  return rows.find((row) => row.key === key)?.label || key;
}

function renderAircraftWidgets(model) {
  elements.aircraftOverviewPanel.innerHTML = '';

  const totalModels = model.aircraft.rows.length;
  const modelsByTier = new Map();
  model.aircraft.rows.forEach((row) => {
    const tierKey = String(row.dominantTier || 'unknown').toLowerCase();
    modelsByTier.set(tierKey, (modelsByTier.get(tierKey) || 0) + 1);
  });
  const totalXp = Math.max(model.summary.totalXp, 1);
  const tierXpRows = model.aircraft.tierXp.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    color: row.color,
    meta: `${formatNumber(modelsByTier.get(row.key) || 0)} / ${formatNumber(totalModels)} models | ${formatPercent((row.value / totalXp) * 100, 1)} XP share`,
  }));
  elements.aircraftTierXpPanel.innerHTML = renderAircraftFocusPanel(model, {
    eyebrow: 'XP',
    title: 'XP by tier',
    rows: tierXpRows,
    valueFormatter: (value) => `${formatCompact(value)} XP`,
    emptyMessage: 'No tier XP data available.',
    focusDimension: 'tier',
    focusScope: 'tier-xp',
  });

  const totalGlows = Math.max(model.summary.totalGlowCount, 1);
  const tierGlowRows = (Array.isArray(model.aircraft.tierGlow) ? model.aircraft.tierGlow : []).map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    color: row.color,
    meta: `${formatNumber(modelsByTier.get(row.key) || 0)} / ${formatNumber(totalModels)} models | ${formatPercent((row.value / totalGlows) * 100, 1)} glow share`,
  }));
  elements.aircraftTierGlowPanel.innerHTML = renderAircraftFocusPanel(model, {
    eyebrow: 'Glow distribution',
    title: 'Glows by tier',
    rows: tierGlowRows,
    valueFormatter: (value) => `${formatNumber(Math.round(value))} glows`,
    emptyMessage: 'No glow data available.',
    focusDimension: 'tier',
    focusScope: 'tier-glow',
  });

  const typeProgressRows = model.aircraft.typeProgress.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.percent,
    color: row.color,
    meta: `${formatNumber(row.captured)} / ${formatNumber(row.total)} models`,
  }));
  elements.aircraftTypeProgressPanel.innerHTML = renderAircraftFocusPanel(model, {
    eyebrow: 'Type progress',
    title: 'Progress by type',
    rows: typeProgressRows,
    valueFormatter: (value) => formatPercent(value, 1),
    emptyMessage: 'No type progress data available.',
    maxValue: 100,
    includeZero: true,
    focusDimension: 'type',
    focusScope: 'type-progress',
  });

  const categoryProgressRows = model.aircraft.categoryProgress.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.percent,
    color: row.color,
    meta: `${formatNumber(row.captured)} / ${formatNumber(row.total)} models`,
  }));
  elements.aircraftCategoryProgressPanel.innerHTML = renderAircraftFocusPanel(model, {
    eyebrow: 'Category progress',
    title: 'Progress by category',
    rows: categoryProgressRows,
    valueFormatter: (value) => formatPercent(value, 1),
    emptyMessage: 'No category progress data available.',
    maxValue: 100,
    includeZero: true,
    focusDimension: 'category',
    focusScope: 'category-progress',
  });

  elements.aircraftTierCompletionPanel.innerHTML = '';
  elements.aircraftImagePlaceholderPanel.innerHTML = '';
  elements.aircraftRegPlaceholderPanel.innerHTML = '';
}

function formatAircraftStat(value, options = {}) {
  const number = Number(value);
  const treatNonPositiveAsMissing = options.nullIfNonPositive === true;
  if (!Number.isFinite(number) || (treatNonPositiveAsMissing && number <= 0)) {
    return 'N/A';
  }
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isFinite(options.minFractionDigits) ? options.minFractionDigits : 0,
    maximumFractionDigits: Number.isFinite(options.maxFractionDigits) ? options.maxFractionDigits : 1,
  });
  return `${formatter.format(number)}${options.suffix || ''}`;
}

function formatAircraftYear(value) {
  const year = Number(value);
  if (!Number.isFinite(year) || year <= 0) {
    return 'N/A';
  }
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    useGrouping: false,
  });
  return formatter.format(year);
}

function formatAircraftWeight(value) {
  const kilograms = Number(value);
  if (!Number.isFinite(kilograms) || kilograms <= 0) {
    return 'N/A';
  }
  const tonnes = kilograms / 1000;
  return formatAircraftStat(tonnes, {
    suffix: ' tonnes',
    minFractionDigits: 0,
    maxFractionDigits: Number.isInteger(tonnes) ? 0 : 1,
    nullIfNonPositive: true,
  });
}

function formatAircraftRarity(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return 'N/A';
  }
  return formatAircraftStat(number / 100, {
    nullIfNonPositive: true,
    minFractionDigits: 2,
    maxFractionDigits: 2,
  });
}

function formatAircraftPercent(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 'N/A';
  }
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  return `${formatter.format(number)}%`;
}

function renderAircraftMetricIcon(iconType) {
  if (iconType === 'framing') {
    return `
      <svg class="aircraft-card-inline-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
        <circle cx="8" cy="8" r="2.2"></circle>
        <path d="M8 1.5v2.2M8 12.3v2.2M1.5 8h2.2M12.3 8h2.2"></path>
        <circle cx="8" cy="8" r="5.1"></circle>
      </svg>
    `;
  }
  return `
    <svg class="aircraft-card-inline-icon" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path d="M5.6 12.4h5.8a2.6 2.6 0 0 0 .2-5.2 3.5 3.5 0 0 0-6.9-.8 2.3 2.3 0 0 0 .9 6z"></path>
    </svg>
  `;
}

function renderAircraftInlineMetric(iconType, value) {
  const normalizedValue = value || 'N/A';
  return `
    <span class="aircraft-card-inline-metric is-${escapeHtml(iconType)}">
      ${renderAircraftMetricIcon(iconType)}
      <span class="aircraft-card-inline-metric-value">${escapeHtml(normalizedValue)}</span>
    </span>
  `;
}

function normalizeAircraftTierKey(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return AIRCRAFT_XP_TIERS.has(normalized) ? normalized : 'unknown';
}

function normalizeAircraftImageTier(value) {
  const normalized = String(value || '').trim().toLowerCase();
  return AIRCRAFT_IMAGE_TIERS.includes(normalized) ? normalized : 'cyber';
}

function buildAircraftImageCandidates(row) {
  const preferredTier = normalizeAircraftImageTier(row.dominantTier);
  const orderedTiers = Array.from(new Set([preferredTier, 'cyber']));
  const codes = Array.isArray(row.imageCodes) && row.imageCodes.length
    ? row.imageCodes
    : [String(row.icao || row.modelId || '').trim().toUpperCase()];
  const normalizedCodes = Array.from(new Set(codes.map((code) => String(code || '').trim().toUpperCase()).filter(Boolean)));
  if (!normalizedCodes.length) {
    return [];
  }
  const primaryCode = normalizedCodes[0];
  const aliasCodes = normalizedCodes.slice(1);
  const candidates = [];

  const pushCandidatesForCode = (code, tiers) => {
    for (const tier of tiers) {
      for (const size of AIRCRAFT_IMAGE_SIZE_ORDER) {
        candidates.push(`${AIRCRAFT_IMAGE_BASE_URL}/${tier}/${encodeURIComponent(code)}_${size}.png`);
      }
    }
  };

  pushCandidatesForCode(primaryCode, orderedTiers);
  const aliasTierOrder = orderedTiers;
  for (const aliasCode of aliasCodes) {
    pushCandidatesForCode(aliasCode, aliasTierOrder);
  }
  return candidates;
}

function queueAircraftListRender() {
  if (state.aircraft.renderQueued) {
    return;
  }
  state.aircraft.renderQueued = true;
  requestAnimationFrame(() => {
    state.aircraft.renderQueued = false;
    if (!state.model) {
      return;
    }
    renderAircraftList();
  });
}

function getAircraftCardHeight() {
  return window.matchMedia('(min-width: 761px)').matches
    ? AIRCRAFT_CARD_HEIGHT_TABLET_PLUS
    : AIRCRAFT_CARD_HEIGHT_MOBILE;
}

function getAircraftGridLayout(container) {
  const containerWidth = container.clientWidth || 0;
  const horizontalPadding = AIRCRAFT_GRID_PADDING * 2;
  const usableWidth = Math.max(containerWidth - horizontalPadding, 0);
  const isMobileViewport = window.matchMedia('(max-width: 760px)').matches;
  let columns = 1;
  if (!isMobileViewport) {
    columns = Math.max(
      1,
      Math.floor((usableWidth + AIRCRAFT_GRID_GAP) / (AIRCRAFT_MIN_CARD_WIDTH + AIRCRAFT_GRID_GAP)),
    );
  }
  const totalGapWidth = Math.max(columns - 1, 0) * AIRCRAFT_GRID_GAP;
  const cardWidth = Math.max((usableWidth - totalGapWidth) / columns, 1);
  const cardHeight = getAircraftCardHeight();
  return {
    columns,
    cardWidth,
    cardHeight,
    rowHeight: cardHeight + AIRCRAFT_GRID_GAP,
  };
}

function renderAircraftCard(row, index, left, top, width, cardHeight) {
  const imageCandidates = buildAircraftImageCandidates(row);
  const imageUrl = imageCandidates[0] || '';
  const hasGlow = Number(row.glowCount) > 0;
  const name = row.name || row.displayName || row.modelId || 'Unknown aircraft';
  const manufacturer = row.manufacturer || 'Unknown manufacturer';
  const icao = row.icao || row.modelId || 'Unknown';
  const tierKey = normalizeAircraftTierKey(row.dominantTier);
  const tierLabel = row.dominantTierLabel || 'Unknown';
  const framingPercent = formatAircraftPercent(row.avgCoverage);
  const cloudPercent = formatAircraftPercent(row.avgCloudiness);
  const caughtRegistrations = Number.isFinite(row.caughtRegistrations) ? row.caughtRegistrations : null;
  const possibleRegistrations = Number.isFinite(row.possibleRegistrations) ? row.possibleRegistrations : null;
  const registrationBadgeText = Number.isFinite(caughtRegistrations) && Number.isFinite(possibleRegistrations)
    ? `${formatNumber(caughtRegistrations)} / ${formatNumber(possibleRegistrations)} regs`
    : Number.isFinite(caughtRegistrations)
      ? `${formatNumber(caughtRegistrations)} regs`
      : Number.isFinite(possibleRegistrations)
        ? `? / ${formatNumber(possibleRegistrations)} regs`
        : 'Regs unavailable';
  const registrationBadgeTitle = Number.isFinite(caughtRegistrations) && Number.isFinite(possibleRegistrations)
    ? 'Caught registrations / total possible registrations for this ICAO model.'
    : Number.isFinite(caughtRegistrations)
      ? 'Caught registrations. Total possible registrations unavailable for this model.'
      : 'Caught registrations unavailable (aircraft lookup data is missing or incomplete).';
  const registrationBadgeActionTitle = `${registrationBadgeTitle} Click to view caught registrations for this model.`;
  return `
    <article
      class="aircraft-card${hasGlow ? ' has-glow' : ''}"
      role="listitem"
      data-index="${index}"
      data-model-id="${escapeHtml(row.modelId)}"
      tabindex="0"
      aria-haspopup="dialog"
      aria-controls="aircraft-detail-modal"
      aria-label="${escapeHtml(`Open aircraft detail for ${manufacturer} ${name}`.trim())}"
      title="${escapeHtml(`Open aircraft detail for ${manufacturer} ${name}`.trim())}"
      style="transform:translate(${left.toFixed(2)}px,${top.toFixed(2)}px);width:${width.toFixed(2)}px;height:${cardHeight}px;"
    >
      <div class="aircraft-card-media${imageUrl ? '' : ' is-fallback'}">
        ${imageUrl
    ? `<img
            class="aircraft-card-image"
            src="${escapeHtml(imageUrl)}"
            data-image-candidates="${escapeHtml(imageCandidates.join('|'))}"
            data-image-index="0"
            alt="${escapeHtml(name)}"
            loading="lazy"
            decoding="async"
            referrerpolicy="no-referrer"
          >`
    : ''}
        <div class="aircraft-card-image-fallback">Image unavailable</div>
        ${hasGlow ? `<span class="aircraft-card-glow-count">x${formatNumber(row.glowCount)} glows</span>` : ''}
      </div>
      <div class="aircraft-card-body">
        <div class="aircraft-card-head">
          <div class="aircraft-card-title-block">
            <p class="aircraft-card-manufacturer">${escapeHtml(manufacturer)}</p>
            <h4 class="aircraft-card-name" title="${escapeHtml(name)}">${escapeHtml(name)}</h4>
            <div class="aircraft-card-inline-metrics">
              ${renderAircraftInlineMetric('framing', framingPercent)}
              <span class="aircraft-card-inline-separator" aria-hidden="true">|</span>
              ${renderAircraftInlineMetric('cloud', cloudPercent)}
            </div>
          </div>
          <div class="aircraft-card-badges">
            <span class="aircraft-card-tier-badge is-${escapeHtml(tierKey)}">${escapeHtml(tierLabel)}</span>
            <span class="aircraft-card-xp">${formatNumber(row.xp)} XP</span>
            <button
              class="aircraft-card-regs aircraft-card-regs-button"
              type="button"
              data-action="open-registration-list"
              data-model-id="${escapeHtml(row.modelId)}"
              title="${escapeHtml(registrationBadgeActionTitle)}"
              aria-label="${escapeHtml(registrationBadgeActionTitle)}"
            >
              ${escapeHtml(registrationBadgeText)}
            </button>
          </div>
        </div>
        <div class="aircraft-card-stats-block">
          <p class="aircraft-card-model">ICAO ${escapeHtml(icao)}</p>
          <dl class="aircraft-card-stats">
            <div class="aircraft-card-stat">
              <dt>First flight</dt>
              <dd>${formatAircraftYear(row.firstFlight)}</dd>
            </div>
            <div class="aircraft-card-stat">
              <dt>Rarity</dt>
              <dd>${formatAircraftRarity(row.rareness)}</dd>
            </div>
            <div class="aircraft-card-stat">
              <dt>Wingspan</dt>
              <dd>${formatAircraftStat(row.wingspan, { suffix: ' m', maxFractionDigits: 1, nullIfNonPositive: true })}</dd>
            </div>
            <div class="aircraft-card-stat">
              <dt>Speed</dt>
              <dd>${formatAircraftStat(row.maxSpeed, { suffix: ' kt', maxFractionDigits: 0, nullIfNonPositive: true })}</dd>
            </div>
            <div class="aircraft-card-stat">
              <dt>Seats</dt>
              <dd>${formatAircraftStat(row.seats, { maxFractionDigits: 0, nullIfNonPositive: true })}</dd>
            </div>
            <div class="aircraft-card-stat">
              <dt>Weight</dt>
              <dd>${formatAircraftWeight(row.mtow)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </article>
  `;
}

function getAircraftSortableMetric(value, options = {}) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return Number.NEGATIVE_INFINITY;
  }
  if (options.nullIfNonPositive && number <= 0) {
    return Number.NEGATIVE_INFINITY;
  }
  return number;
}

function resolveAircraftSortMetric(row, sortBy) {
  if (sortBy === 'xp') {
    return getAircraftSortableMetric(row.xp);
  }
  if (sortBy === 'glow') {
    return getAircraftSortableMetric(row.glowCount);
  }
  if (sortBy === 'registrations') {
    return getAircraftSortableMetric(row.caughtRegistrations);
  }
  if (sortBy === 'coverage') {
    return getAircraftSortableMetric(row.avgCoverage);
  }
  if (sortBy === 'cloud') {
    return getAircraftSortableMetric(row.avgCloudiness);
  }
  if (sortBy === 'firstFlight') {
    return getAircraftSortableMetric(row.firstFlight, { nullIfNonPositive: true });
  }
  if (sortBy === 'speed') {
    return getAircraftSortableMetric(row.maxSpeed, { nullIfNonPositive: true });
  }
  if (sortBy === 'rarity') {
    return getAircraftSortableMetric(row.rareness, { nullIfNonPositive: true });
  }
  if (sortBy === 'seats') {
    return getAircraftSortableMetric(row.seats, { nullIfNonPositive: true });
  }
  if (sortBy === 'wingspan') {
    return getAircraftSortableMetric(row.wingspan, { nullIfNonPositive: true });
  }
  if (sortBy === 'weight') {
    return getAircraftSortableMetric(row.mtow, { nullIfNonPositive: true });
  }
  return getAircraftSortableMetric(row.xp);
}

function sortAircraftRows(rows, sortBy, direction = 'desc') {
  const sortable = rows.slice();
  const factor = direction === 'asc' ? 1 : -1;
  return sortable.sort((left, right) => {
    let comparison = 0;
    if (sortBy === 'name') {
      comparison = left.displayName.localeCompare(right.displayName);
    } else {
      comparison = resolveAircraftSortMetric(left, sortBy) - resolveAircraftSortMetric(right, sortBy)
        || left.xp - right.xp
        || left.glowCount - right.glowCount
        || left.displayName.localeCompare(right.displayName);
    }
    return comparison * factor;
  });
}

function matchesAircraftFocus(row) {
  if (state.aircraft.focusType && row.typeKey !== state.aircraft.focusType) {
    return false;
  }
  if (state.aircraft.focusCategory && row.dominantCategory !== state.aircraft.focusCategory) {
    return false;
  }
  if (state.aircraft.focusTier && row.dominantTier !== state.aircraft.focusTier) {
    return false;
  }
  return true;
}

function applyAircraftFilters(model) {
  const query = state.aircraft.query.trim().toLowerCase();
  const filteredByFocus = model.aircraft.rows.filter((row) => matchesAircraftFocus(row));
  const filtered = query
    ? filteredByFocus.filter((row) => {
      const haystack = `${row.displayName} ${row.name} ${row.manufacturer} ${row.modelId} ${row.icao}`.toLowerCase();
      return haystack.includes(query);
    })
    : filteredByFocus.slice();
  state.aircraft.visibleRows = sortAircraftRows(filtered, state.aircraft.sortBy, state.aircraft.sortDirection);
}

function renderAircraftDeckMetrics(rows) {
  if (!elements.aircraftDeckMetrics) {
    return;
  }
  const totals = rows.reduce((accumulator, row) => {
    accumulator.xp += Number.isFinite(row.xp) ? row.xp : 0;
    accumulator.glows += Number.isFinite(row.glowCount) ? row.glowCount : 0;
    accumulator.registrations += Number.isFinite(row.caughtRegistrations) ? row.caughtRegistrations : 0;
    return accumulator;
  }, {
    xp: 0,
    glows: 0,
    registrations: 0,
  });
  const isModalOpen = state.ui.registrationModalOpen;
  elements.aircraftDeckMetrics.innerHTML = `
    <div class="aircraft-deck-metric">
      <span class="aircraft-deck-metric-label">Total XP</span>
      <strong class="aircraft-deck-metric-value">${formatNumber(Math.round(totals.xp))}</strong>
    </div>
    <div class="aircraft-deck-metric">
      <span class="aircraft-deck-metric-label">Total glows</span>
      <strong class="aircraft-deck-metric-value">${formatNumber(Math.round(totals.glows))}</strong>
    </div>
    <div class="aircraft-deck-metric">
      <span class="aircraft-deck-metric-label">Total regs</span>
      <div class="aircraft-deck-metric-value-row">
        <strong class="aircraft-deck-metric-value">${formatNumber(Math.round(totals.registrations))}</strong>
        <button
          id="aircraft-reg-transparency-trigger"
          class="aircraft-caution-button is-inline"
          type="button"
          data-action="open-registration-transparency"
          aria-haspopup="dialog"
          aria-expanded="${isModalOpen ? 'true' : 'false'}"
          aria-controls="aircraft-reg-transparency-modal"
          title="Registration mapping transparency"
        >
          <span class="aircraft-caution-icon" aria-hidden="true">&#9888;</span>
          <span class="sr-only">Open registration mapping transparency details</span>
        </button>
      </div>
    </div>
  `;
}

function renderAircraftList() {
  const rows = state.aircraft.visibleRows;
  const totalRows = state.model?.aircraft.rows.length || 0;
  renderAircraftDeckMetrics(rows);
  const focusBits = [];
  if (state.model) {
    const typeLabel = getAircraftFocusLabel(state.model, 'type', state.aircraft.focusType);
    const categoryLabel = getAircraftFocusLabel(state.model, 'category', state.aircraft.focusCategory);
    const tierLabel = getAircraftFocusLabel(state.model, 'tier', state.aircraft.focusTier);
    if (typeLabel) {
      focusBits.push(`type ${typeLabel}`);
    }
    if (categoryLabel) {
      focusBits.push(`category ${categoryLabel}`);
    }
    if (tierLabel) {
      focusBits.push(`tier ${tierLabel}`);
    }
  }
  const focusText = focusBits.length ? ` Focus: ${focusBits.join(', ')}.` : '';
  elements.aircraftListMeta.textContent = `${formatNumber(rows.length)} visible models (of ${formatNumber(totalRows)}).${focusText}`;

  if (!rows.length) {
    state.aircraft.renderSignature = 'empty';
    state.aircraft.lastRenderedRowsRef = rows;
    elements.aircraftList.innerHTML = '<div class="empty-copy">No aircraft models match the current filters.</div>';
    return;
  }

  const layout = getAircraftGridLayout(elements.aircraftList);
  const totalGridRows = Math.ceil(rows.length / layout.columns);
  const totalHeight = AIRCRAFT_GRID_PADDING * 2
    + totalGridRows * layout.cardHeight
    + Math.max(totalGridRows - 1, 0) * AIRCRAFT_GRID_GAP;
  const viewportHeight = Math.max(elements.aircraftList.clientHeight || 0, 560);
  const scrollTop = elements.aircraftList.scrollTop;
  const renderMin = Math.max(scrollTop - layout.rowHeight * AIRCRAFT_VIRTUAL_OVERSCAN_ROWS, 0);
  const visibleRowCount = Math.max(1, Math.ceil(viewportHeight / layout.rowHeight));
  const rowsToRender = visibleRowCount + AIRCRAFT_VIRTUAL_OVERSCAN_ROWS * 2;
  const startRow = Math.max(Math.floor((renderMin - AIRCRAFT_GRID_PADDING) / layout.rowHeight), 0);
  const endRow = Math.min(totalGridRows - 1, startRow + rowsToRender - 1);

  const startIndex = Math.min(rows.length - 1, startRow * layout.columns);
  const endIndex = Math.min(rows.length - 1, ((endRow + 1) * layout.columns) - 1);
  const renderSignature = [
    rows.length,
    layout.columns,
    layout.cardWidth.toFixed(2),
    layout.cardHeight,
    startRow,
    endRow,
    rows[startIndex]?.key || '',
    rows[endIndex]?.key || '',
  ].join('|');
  if (state.aircraft.lastRenderedRowsRef === rows && state.aircraft.renderSignature === renderSignature) {
    return;
  }
  state.aircraft.lastRenderedRowsRef = rows;
  state.aircraft.renderSignature = renderSignature;

  let html = '';
  for (let rowIndex = startRow; rowIndex <= endRow; rowIndex += 1) {
    const top = AIRCRAFT_GRID_PADDING + rowIndex * layout.rowHeight;
    for (let columnIndex = 0; columnIndex < layout.columns; columnIndex += 1) {
      const index = rowIndex * layout.columns + columnIndex;
      if (index >= rows.length) {
        break;
      }
      const left = AIRCRAFT_GRID_PADDING + columnIndex * (layout.cardWidth + AIRCRAFT_GRID_GAP);
      html += renderAircraftCard(rows[index], index, left, top, layout.cardWidth, layout.cardHeight);
    }
  }

  elements.aircraftList.innerHTML = `
    <div class="virtualized-list-spacer" style="height:${Math.max(totalHeight, viewportHeight)}px;">
      ${html}
    </div>
  `;
}

function renderAircraftTab(model) {
  renderAircraftWidgets(model);
  applyAircraftFilters(model);
  renderAircraftList();
  renderRegistrationModalTrigger(model);
  if (state.ui.aircraftDetailModalOpen) {
    renderAircraftDetailModal(model);
  }
  if (state.ui.registrationModalOpen) {
    renderRegistrationTransparencyModal(model);
  }
  if (state.ui.modelRegsModalOpen) {
    renderModelRegistrationsModal(model);
  }
}

function renderDashboard(model, references = null) {
  state.model = model;
  if (references) {
    state.references = references;
  }
  state.map.regionPointIndex = null;
  state.map.regionPointIndexModel = null;
  state.map.selectedRegion = null;
  state.map.expandedRegion = null;
  state.map.continentQuery = '';
  state.map.continentSort = 'total_desc';
  state.map.countryQuery = '';
  state.map.countrySort = 'total_desc';
  state.map.usStateQuery = '';
  state.map.usStateSort = 'total_desc';
  resetMapDrillState();
  state.aircraft.query = '';
  state.aircraft.sortBy = 'xp';
  state.aircraft.sortDirection = 'desc';
  state.aircraft.focusType = null;
  state.aircraft.focusCategory = null;
  state.aircraft.focusTier = null;
  state.aircraft.expandedFocus = null;
  state.aircraft.focusDetailIndex = null;
  state.aircraft.focusDetailIndexModel = null;
  state.aircraft.renderSignature = '';
  state.aircraft.lastRenderedRowsRef = null;
  state.aircraft.renderQueued = false;
  resetRegistrationModalState();
  resetModelRegsModalState();
  resetAircraftDetailModalState();
  setRegistrationModalOpen(false, { restoreFocus: false });
  setModelRegsModalOpen(false, { restoreFocus: false });
  setAircraftDetailModalOpen(false, { restoreFocus: false });
  syncCompletionSortControls();
  elements.aircraftSearch.value = '';
  syncAircraftSortControls();
  syncRegistrationModalControls();
  elements.landingView.hidden = true;
  elements.dashboard.hidden = false;
  setDataToolsOpen(false);
  syncDashboardTabAvailability();
  renderMapTab(model);
  renderAircraftTab(model);
  setActiveTab('map');
  syncDataToolsPanelState();
}

async function tryLoadPersistedUpload(persistedUpload = null) {
  if (!elements.persistUpload.checked) {
    return;
  }
  const persisted = persistedUpload || readPersistedUpload();
  if (!persisted) {
    return;
  }
  setBanner('');
  setUploadStatus(`Loading saved upload from this device (${persisted.fileName})...`);
  try {
    const payload = parseUserCollection(persisted.text, persisted.fileName);
    const references = await loadReferenceData();
    const model = buildDashboardModelWithManualMappings(payload, references);
    state.upload.fileName = persisted.fileName;
    state.upload.text = persisted.text;
    renderDashboard(model, references);
    setUploadStatus(`Loaded saved upload ${persisted.fileName} for ${model.user.name}. Stored only on this device.`);
    setBanner('Loaded from your browser local storage. Skyviz never sent your collection to a server.', 'info', {
      autoDismissMs: 10000,
    });
  } catch (error) {
    clearPersistedUpload();
    setPersistPreferenceChecked(false);
    writePersistPreference(false);
    syncDataToolsPanelState();
    elements.dashboard.hidden = true;
    elements.landingView.hidden = false;
    setUploadStatus('Waiting for a collection export.');
    setBanner(
      error instanceof Error
        ? `Saved local upload was invalid and removed: ${error.message}`
        : 'Saved local upload was invalid and has been removed.',
      'warning',
    );
  }
}

function beginDashboardLoadingState(statusMessage) {
  const previousVisibility = {
    landingHidden: elements.landingView.hidden,
    dashboardHidden: elements.dashboard.hidden,
  };
  setBootState(true, statusMessage);
  elements.landingView.hidden = true;
  elements.dashboard.hidden = true;
  return previousVisibility;
}

function endDashboardLoadingState(previousVisibility, restorePreviousView = false) {
  setBootState(false);
  if (!restorePreviousView || !previousVisibility) {
    return;
  }
  elements.landingView.hidden = previousVisibility.landingHidden;
  elements.dashboard.hidden = previousVisibility.dashboardHidden;
}

async function handleFile(file) {
  if (!file) {
    return;
  }
  setBanner('');
  const previousVisibility = beginDashboardLoadingState(`Reading ${file.name}...`);
  let loaded = false;
  setUploadStatus(`Reading ${file.name}...`);
  try {
    const text = await file.text();
    setBootState(true, `Validating ${file.name}...`);
    const payload = parseUserCollection(text, file.name);
    setBootState(true, `Enriching ${file.name} with reference data...`);
    setUploadStatus(`Enriching ${file.name} with reference data...`);
    const references = await loadReferenceData();
    setBootState(true, `Building dashboard for ${file.name}...`);
    const model = buildDashboardModelWithManualMappings(payload, references);
    state.upload.fileName = file.name;
    state.upload.text = text;
    renderDashboard(model, references);
    loaded = true;
    const persisted = persistCurrentUploadIfEnabled();
    setUploadStatus(
      persisted
        ? `Loaded ${file.name} for ${model.user.name}. Saved only on this device (local storage).`
        : `Loaded ${file.name} for ${model.user.name}. Not saved on this device.`,
    );
    setBanner('');
  } catch (error) {
    setUploadStatus('Waiting for a valid collection export.');
    setBanner(error instanceof Error ? error.message : 'Failed to load the collection export.', 'warning');
  } finally {
    endDashboardLoadingState(previousVisibility, !loaded);
    elements.fileInput.value = '';
  }
}

async function handleExampleView() {
  setBanner('');
  const previousVisibility = beginDashboardLoadingState('Loading example dashboard...');
  let loaded = false;
  setUploadStatus('Loading example dashboard...');
  try {
    const response = await fetch(EXAMPLE_DECK_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load built-in example data (${response.status}).`);
    }
    const text = await response.text();
    setBootState(true, 'Validating example data...');
    const payload = parseUserCollection(text, 'built-in example');
    setBootState(true, 'Enriching example data with reference data...');
    setUploadStatus('Enriching example data with reference data...');
    const references = await loadReferenceData();
    setBootState(true, 'Building example dashboard...');
    const model = buildDashboardModelWithManualMappings(payload, references);
    state.upload.fileName = 'skyviz_try_now_user.json';
    state.upload.text = text;
    renderDashboard(model, references);
    loaded = true;
    const persisted = persistCurrentUploadIfEnabled();
    setUploadStatus(
      persisted
        ? 'Loaded example dashboard. Saved only on this device (local storage).'
        : 'Loaded example dashboard. Not saved on this device.',
    );
    setBanner('Loaded sample deck: 20 airports + 20 popular aircraft models.', 'info', {
      autoDismissMs: 10000,
    });
  } catch (error) {
    setUploadStatus('Waiting for a collection export.');
    setBanner(error instanceof Error ? error.message : 'Failed to load built-in example dashboard.', 'warning');
  } finally {
    endDashboardLoadingState(previousVisibility, !loaded);
  }
}

function wireUpload() {
  elements.fileInput.addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    void handleFile(file);
  });

  ['dragenter', 'dragover'].forEach((eventName) => {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.add('is-dragging');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    elements.dropzone.addEventListener(eventName, (event) => {
      event.preventDefault();
      elements.dropzone.classList.remove('is-dragging');
    });
  });

  elements.dropzone.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    void handleFile(file);
  });

  elements.viewExampleButton.addEventListener('click', () => {
    void handleExampleView();
  });

  elements.persistUpload.addEventListener('change', () => {
    handlePersistPreferenceChange(elements.persistUpload.checked);
  });
}

function wireMapCompletionControls() {
  elements.mapDrillSearch.addEventListener('input', () => {
    const level = normalizeMapDrillLevel(state.map.drillLevel);
    setMapCompletionQuery(level, elements.mapDrillSearch.value);
    if (state.model) {
      renderMapProgressPanels(state.model);
    }
  });

  elements.mapDrillSort.addEventListener('change', () => {
    const level = normalizeMapDrillLevel(state.map.drillLevel);
    const current = parseCompletionSortKey(getMapCompletionState(level).sort);
    setMapCompletionSort(level, buildCompletionSortKey(elements.mapDrillSort.value, current.direction));
    syncCompletionSortControls();
    if (state.model) {
      renderMapProgressPanels(state.model);
    }
  });

  elements.mapDrillSortDirection.addEventListener('click', () => {
    const level = normalizeMapDrillLevel(state.map.drillLevel);
    const current = parseCompletionSortKey(getMapCompletionState(level).sort);
    setMapCompletionSort(level, buildCompletionSortKey(current.category, toggleCompletionDirection(current.direction)));
    syncCompletionSortControls();
    if (state.model) {
      renderMapProgressPanels(state.model);
    }
  });

  elements.mapDrillNav.addEventListener('click', (event) => {
    if (!state.model) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest('button[data-action]');
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    if (action === 'map-drill-back') {
      if (state.map.drillLevel === 'us-state') {
        const continentKey = state.map.drillContinentKey || getCountryContinentKey(state.model, 'US') || '';
        moveMapDrill(state.model, 'country', { continentKey });
        return;
      }
      if (state.map.drillLevel === 'country') {
        moveMapDrill(state.model, 'continent');
      }
      return;
    }
    if (action !== 'set-map-drill-level') {
      return;
    }
    const level = normalizeMapDrillLevel(button.dataset.drillLevel);
    const continentKey = String(button.dataset.drillContinent || '').trim().toUpperCase();
    const countryKey = String(button.dataset.drillCountry || '').trim().toUpperCase();
    if (level === 'country') {
      moveMapDrill(state.model, 'country', { continentKey });
      return;
    }
    if (level === 'us-state') {
      moveMapDrill(state.model, 'us-state', { continentKey, countryKey: countryKey || 'US' });
      return;
    }
    moveMapDrill(state.model, 'continent');
  });

  const onCompletionRowClick = (event) => {
    if (!state.model) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest('button[data-action][data-region-type][data-region-key]');
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    const regionType = button.dataset.regionType;
    const regionKey = button.dataset.regionKey;
    if ((regionType !== 'continent' && regionType !== 'country' && regionType !== 'us-state') || !regionKey) {
      return;
    }
    if (action === 'focus-region') {
      if (regionType === 'continent') {
        moveMapDrill(state.model, 'country', { continentKey: regionKey });
        return;
      }
      if (regionType === 'country' && regionKey === 'US') {
        const continentKey = getCountryContinentKey(state.model, 'US') || state.map.drillContinentKey || 'NA';
        moveMapDrill(state.model, 'us-state', { continentKey, countryKey: 'US' });
        return;
      }
      if (isRegionSelected(regionType, regionKey)) {
        clearMapRegionSelection(state.model, { resetView: true });
        return;
      }
      focusMapRegion(state.model, regionType, regionKey);
      return;
    }
    if (action === 'toggle-region-details') {
      toggleRegionDetails(state.model, regionType, regionKey);
      return;
    }
    if (action === 'copy-region-codes') {
      const scope = button.dataset.codeScope === 'captured' ? 'captured' : 'remaining';
      void copyRegionCodes(state.model, regionType, regionKey, scope);
      return;
    }
    if (action === 'export-region-codes') {
      const scope = button.dataset.codeScope === 'captured' ? 'captured' : 'remaining';
      exportRegionCodes(state.model, regionType, regionKey, scope);
    }
  };

  elements.mapDrillProgress.addEventListener('click', onCompletionRowClick);
}

function wireDailyGame() {
  const syncDailyHelpOpenState = () => {
    elements.dailyBoard.querySelectorAll('.daily-guess-tile').forEach((tile) => {
      tile.classList.toggle('is-help-open', Boolean(tile.querySelector('.daily-tile-help[open]')));
    });
    elements.dailyBoard.querySelectorAll('.daily-board-step').forEach((step) => {
      step.classList.toggle('is-help-open', Boolean(step.querySelector('.daily-tile-help[open]')));
    });
  };

  elements.dailyLaunchButton?.addEventListener('click', (event) => {
    event.preventDefault();
    void openDailyExperience({ focusInput: true });
  });

  elements.dailyGuessInput.addEventListener('input', () => {
    state.daily.query = elements.dailyGuessInput.value;
    state.daily.selectedSuggestionIndex = -1;
    if (!state.daily.query.trim()) {
      state.daily.suggestions = [];
      setDailyFeedback('', 'muted');
      renderDailyTab();
      return;
    }
    setDailyFeedback('', 'muted');
    updateDailySuggestions();
  });

  elements.dailyGuessInput.addEventListener('keydown', (event) => {
    if (!state.daily.suggestions.length) {
      if (event.key === 'Escape') {
        state.daily.query = '';
        state.daily.suggestions = [];
        elements.dailyGuessInput.value = '';
        renderDailyTab();
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const maxIndex = state.daily.suggestions.length - 1;
      if (event.key === 'ArrowDown') {
        state.daily.selectedSuggestionIndex = state.daily.selectedSuggestionIndex >= maxIndex
          ? 0
          : state.daily.selectedSuggestionIndex + 1;
      } else {
        state.daily.selectedSuggestionIndex = state.daily.selectedSuggestionIndex <= 0
          ? maxIndex
          : state.daily.selectedSuggestionIndex - 1;
      }
      renderDailyTab();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      state.daily.suggestions = [];
      state.daily.selectedSuggestionIndex = -1;
      renderDailyTab();
    }
  });

  elements.dailyGuessForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.daily.challenge || !state.daily.dataset) {
      return;
    }
    const guessedIds = new Set(getDailySession().guesses);
    const selectedAirport = state.daily.selectedSuggestionIndex >= 0
      ? state.daily.suggestions[state.daily.selectedSuggestionIndex]
      : null;
    const resolvedAirport = selectedAirport
      || resolveAirportGuess(state.daily.dataset.airports, state.daily.query, guessedIds)
      || (state.daily.suggestions.length === 1 ? state.daily.suggestions[0] : null);
    if (!resolvedAirport) {
      setDailyFeedback('Choose an airport from the suggestion list or type an exact code.', 'warning');
      renderDailyTab();
      return;
    }
    submitDailyGuessByAirport(resolvedAirport);
  });

  elements.dailySuggestionList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest('button[data-action="select-daily-suggestion"][data-airport-id]');
    if (!(button instanceof HTMLButtonElement) || !state.daily.dataset) {
      return;
    }
    const airportId = String(button.getAttribute('data-airport-id') || '');
    const airport = state.daily.dataset.airportsById.get(airportId);
    if (!airport) {
      return;
    }
    submitDailyGuessByAirport(airport);
  });

  elements.dailyBoard.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const toggle = target.closest('.daily-tile-help-toggle');
    const openPanels = elements.dailyBoard.querySelectorAll('.daily-tile-help[open]');
    if (toggle) {
      event.preventDefault();
      const details = toggle.closest('.daily-tile-help');
      if (!(details instanceof HTMLDetailsElement)) {
        return;
      }
      const nextOpen = !details.open;
      openPanels.forEach((panel) => {
        if (panel !== details) {
          panel.open = false;
        }
      });
      details.open = nextOpen;
      syncDailyHelpOpenState();
      return;
    }
    if (target.closest('.daily-tile-help')) {
      return;
    }
    openPanels.forEach((panel) => {
      panel.open = false;
    });
    syncDailyHelpOpenState();
  });

  elements.dailyIntel.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const copyButton = target.closest('button[data-action="copy-daily-results"]');
    if (!copyButton) {
      return;
    }
    void copyDailyResultToClipboard();
  });
}

function wireCardleGame() {
  elements.cardleLaunchButton?.addEventListener('click', (event) => {
    event.preventDefault();
    void openCardleExperience({ focusInput: true });
  });

  elements.cardleGuessInput.addEventListener('input', () => {
    state.cardle.query = elements.cardleGuessInput.value;
    state.cardle.selectedSuggestionIndex = -1;
    if (!state.cardle.query.trim()) {
      state.cardle.suggestions = [];
      setCardleFeedback('', 'muted');
      renderCardleTab();
      return;
    }
    setCardleFeedback('', 'muted');
    updateCardleSuggestions();
  });

  elements.cardleGuessInput.addEventListener('keydown', (event) => {
    if (!state.cardle.suggestions.length) {
      if (event.key === 'Escape') {
        state.cardle.query = '';
        state.cardle.suggestions = [];
        elements.cardleGuessInput.value = '';
        renderCardleTab();
      }
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const maxIndex = state.cardle.suggestions.length - 1;
      if (event.key === 'ArrowDown') {
        state.cardle.selectedSuggestionIndex = state.cardle.selectedSuggestionIndex >= maxIndex
          ? 0
          : state.cardle.selectedSuggestionIndex + 1;
      } else {
        state.cardle.selectedSuggestionIndex = state.cardle.selectedSuggestionIndex <= 0
          ? maxIndex
          : state.cardle.selectedSuggestionIndex - 1;
      }
      renderCardleTab();
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      state.cardle.suggestions = [];
      state.cardle.selectedSuggestionIndex = -1;
      renderCardleTab();
    }
  });

  elements.cardleGuessForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!state.cardle.challenge || !state.cardle.dataset) {
      return;
    }
    const guessedIds = new Set(getCardleSession().guesses);
    const selectedModel = state.cardle.selectedSuggestionIndex >= 0
      ? state.cardle.suggestions[state.cardle.selectedSuggestionIndex]
      : null;
    const resolvedModel = selectedModel
      || resolveCardleGuess(state.cardle.dataset.models, state.cardle.query, guessedIds)
      || (state.cardle.suggestions.length === 1 ? state.cardle.suggestions[0] : null);
    if (!resolvedModel) {
      setCardleFeedback('Choose an aircraft model from the suggestion list or type an exact ICAO code.', 'warning');
      renderCardleTab();
      return;
    }
    submitCardleGuessByModel(resolvedModel);
  });

  elements.cardleSuggestionList.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest('button[data-action="select-cardle-suggestion"][data-model-id]');
    if (!(button instanceof HTMLButtonElement) || !state.cardle.dataset) {
      return;
    }
    const modelId = String(button.getAttribute('data-model-id') || '');
    const model = state.cardle.dataset.modelsById.get(modelId);
    if (!model) {
      return;
    }
    submitCardleGuessByModel(model);
  });

  elements.cardleIntelPanel.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const copyButton = target.closest('button[data-action="copy-daily-results"]');
    if (!copyButton) {
      return;
    }
    void copyCardleResultToClipboard();
  });

  elements.cardleBoard.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.classList.contains('aircraft-card-image')) {
      return;
    }
    const encodedCandidates = target.dataset.imageCandidates || '';
    const candidates = encodedCandidates ? encodedCandidates.split('|').filter(Boolean) : [];
    const currentIndex = Number.parseInt(target.dataset.imageIndex || '0', 10);
    const nextIndex = Number.isFinite(currentIndex) ? currentIndex + 1 : 1;
    if (nextIndex < candidates.length) {
      target.dataset.imageIndex = String(nextIndex);
      target.src = candidates[nextIndex];
      return;
    }
    const media = target.closest('.aircraft-card-media');
    if (media) {
      media.classList.add('is-fallback');
    }
    target.remove();
  }, true);

  elements.cardleIntelPanel.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement) || target.tagName.toLowerCase() !== 'model-viewer') {
      return;
    }
    const modelId = String(state.cardle.challenge?.target?.id || '').trim().toUpperCase();
    if (modelId) {
      state.cardle.modelStage = {
        modelId,
        loading: false,
        available: false,
        error: '3D asset unavailable for this model.',
        resolvedUrl: '',
      };
    }
    target.remove();
    if (state.activeTab === 'cardle' && state.cardle.challenge) {
      renderCardleTab();
    }
  }, true);
}

function wireAircraftControls() {
  elements.aircraftDeckMetrics?.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const trigger = target.closest('button[data-action="open-registration-transparency"]');
    if (!(trigger instanceof HTMLButtonElement)) {
      return;
    }
    if (!state.model || trigger.disabled) {
      return;
    }
    setModelRegsModalOpen(false, { restoreFocus: false });
    state.ui.registrationModalQuery = '';
    state.ui.registrationModalConfidence = 'all';
    state.ui.registrationModalPage = 1;
    clearManualRegistrationEditState();
    syncRegistrationModalControls();
    setRegistrationModalOpen(true);
  });

  elements.aircraftRegTransparencyClose.addEventListener('click', () => {
    setRegistrationModalOpen(false);
  });

  elements.aircraftRegTransparencyBackdrop.addEventListener('click', () => {
    setRegistrationModalOpen(false);
  });

  elements.aircraftRegTransparencySearch.addEventListener('input', () => {
    state.ui.registrationModalQuery = elements.aircraftRegTransparencySearch.value;
    state.ui.registrationModalPage = 1;
    clearManualRegistrationEditState();
    if (state.ui.registrationModalOpen) {
      renderRegistrationTransparencyModal(state.model);
    }
  });

  elements.aircraftRegTransparencyFilter.addEventListener('change', () => {
    const selected = elements.aircraftRegTransparencyFilter.value;
    state.ui.registrationModalConfidence = REGISTRATION_MODAL_FILTERS.has(selected) ? selected : 'all';
    state.ui.registrationModalPage = 1;
    clearManualRegistrationEditState();
    if (state.ui.registrationModalOpen) {
      renderRegistrationTransparencyModal(state.model);
    }
  });

  elements.aircraftRegTransparencySummary.addEventListener('click', (event) => {
    if (!state.model) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const filterButton = target.closest('button[data-action="set-registration-confidence-filter"][data-confidence-filter]');
    if (!filterButton) {
      return;
    }
    const selected = String(filterButton.getAttribute('data-confidence-filter') || '').trim().toLowerCase();
    state.ui.registrationModalConfidence = REGISTRATION_MODAL_FILTERS.has(selected) ? selected : 'all';
    state.ui.registrationModalPage = 1;
    clearManualRegistrationEditState();
    syncRegistrationModalControls();
    renderRegistrationTransparencyModal(state.model);
  });

  elements.aircraftRegTransparencyRows.addEventListener('click', (event) => {
    if (!state.model) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest('button[data-action][data-row-key]');
    if (!button) {
      return;
    }
    const rowKey = String(button.getAttribute('data-row-key') || '');
    const row = getRegistrationRowByRowKey(state.model, rowKey);
    if (!row) {
      return;
    }
    const action = button.getAttribute('data-action');
    if (action === 'set-manual-reg-mapping') {
      beginManualRegistrationMappingEdit(row);
      return;
    }
    if (action === 'clear-manual-reg-mapping') {
      clearManualRegistrationMappingForRow(row);
      return;
    }
    if (action === 'cancel-manual-reg-mapping') {
      clearManualRegistrationEditState();
      renderRegistrationTransparencyModal(state.model);
      return;
    }
    if (action === 'save-manual-reg-mapping') {
      applyManualRegistrationMapping(row, state.ui.registrationManualEditModelId);
      return;
    }
  });

  elements.aircraftRegTransparencyRows.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }
    if (target.getAttribute('data-action') !== 'manual-reg-mapping-input') {
      return;
    }
    const rowKey = String(target.getAttribute('data-row-key') || '');
    if (rowKey && state.ui.registrationManualEditKey === rowKey) {
      state.ui.registrationManualEditModelId = target.value;
    }
  });

  elements.aircraftRegManualExport.addEventListener('click', () => {
    exportManualRegistrationMappings();
  });

  elements.aircraftRegManualImportTrigger.addEventListener('click', () => {
    elements.aircraftRegManualImportInput.click();
  });

  elements.aircraftRegManualImportInput.addEventListener('change', () => {
    const file = elements.aircraftRegManualImportInput.files?.[0];
    if (!file) {
      return;
    }
    void (async () => {
      try {
        const text = await file.text();
        importManualRegistrationMappingsFromText(text, file.name);
      } catch (error) {
        setBanner(error instanceof Error ? error.message : 'Failed to import manual mapping file.', 'warning');
      } finally {
        elements.aircraftRegManualImportInput.value = '';
      }
    })();
  });

  elements.aircraftRegManualClear.addEventListener('click', () => {
    if (!state.manualRegistrationMappings.size) {
      setBanner('No manual mappings are currently saved.', 'info', {
        autoDismissMs: 4000,
      });
      return;
    }
    const shouldClear = window.confirm(
      `Clear ${formatNumber(state.manualRegistrationMappings.size)} manual registration mappings from this browser?`,
    );
    if (!shouldClear) {
      return;
    }
    state.manualRegistrationMappings.clear();
    persistManualRegistrationMappingsWithNotice();
    rebuildDashboardModelFromCurrentUpload();
    state.ui.registrationModalPage = 1;
    if (state.ui.registrationModalOpen) {
      renderRegistrationTransparencyModal(state.model);
    }
    setBanner('Cleared all manual registration mappings from browser storage.', 'info', {
      autoDismissMs: 6000,
    });
  });

  elements.aircraftModelRegsClose.addEventListener('click', () => {
    setModelRegsModalOpen(false);
  });

  elements.aircraftModelRegsBackdrop.addEventListener('click', () => {
    setModelRegsModalOpen(false);
  });

  elements.aircraftModelRegsPrev.addEventListener('click', () => {
    if (!state.ui.modelRegsModalOpen || state.ui.modelRegsModalPage <= 1) {
      return;
    }
    state.ui.modelRegsModalPage -= 1;
    renderModelRegistrationsModal(state.model);
  });

  elements.aircraftModelRegsNext.addEventListener('click', () => {
    if (!state.ui.modelRegsModalOpen) {
      return;
    }
    state.ui.modelRegsModalPage += 1;
    renderModelRegistrationsModal(state.model);
  });

  elements.aircraftRegTransparencyPrev.addEventListener('click', () => {
    if (!state.ui.registrationModalOpen || state.ui.registrationModalPage <= 1) {
      return;
    }
    state.ui.registrationModalPage -= 1;
    clearManualRegistrationEditState();
    renderRegistrationTransparencyModal(state.model);
  });

  elements.aircraftRegTransparencyNext.addEventListener('click', () => {
    if (!state.ui.registrationModalOpen) {
      return;
    }
    state.ui.registrationModalPage += 1;
    clearManualRegistrationEditState();
    renderRegistrationTransparencyModal(state.model);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
      return;
    }
    if (state.ui.aircraftDetailModalOpen) {
      event.preventDefault();
      setAircraftDetailModalOpen(false);
      return;
    }
    if (state.ui.modelRegsModalOpen) {
      event.preventDefault();
      setModelRegsModalOpen(false);
      return;
    }
    if (!state.ui.registrationModalOpen) {
      return;
    }
    event.preventDefault();
    setRegistrationModalOpen(false);
  });

  elements.aircraftSearch.addEventListener('input', () => {
    if (!state.model) {
      return;
    }
    state.aircraft.query = elements.aircraftSearch.value;
    elements.aircraftList.scrollTop = 0;
    applyAircraftFilters(state.model);
    renderAircraftList();
  });

  elements.aircraftSort.addEventListener('change', () => {
    if (!state.model) {
      return;
    }
    state.aircraft.sortBy = elements.aircraftSort.value;
    syncAircraftSortControls();
    elements.aircraftList.scrollTop = 0;
    applyAircraftFilters(state.model);
    renderAircraftList();
  });

  elements.aircraftSortDirection.addEventListener('click', () => {
    if (!state.model) {
      return;
    }
    state.aircraft.sortDirection = state.aircraft.sortDirection === 'asc' ? 'desc' : 'asc';
    syncAircraftSortControls();
    elements.aircraftList.scrollTop = 0;
    applyAircraftFilters(state.model);
    renderAircraftList();
  });

  elements.aircraftSide.addEventListener('click', (event) => {
    if (!state.model) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest('button[data-action][data-focus-dimension][data-focus-key]');
    if (!button) {
      return;
    }
    const action = button.dataset.action;
    const scope = button.dataset.focusScope || '';
    const dimension = button.dataset.focusDimension;
    const key = button.dataset.focusKey;
    if ((dimension !== 'type' && dimension !== 'category' && dimension !== 'tier') || !key) {
      return;
    }
    if (action === 'toggle-aircraft-focus') {
      toggleAircraftFocus(dimension, key);
      elements.aircraftList.scrollTop = 0;
      renderAircraftWidgets(state.model);
      applyAircraftFilters(state.model);
      renderAircraftList();
      return;
    }
    if (action === 'toggle-aircraft-focus-details') {
      toggleAircraftFocusDetails(state.model, scope, dimension, key);
      return;
    }
    if (action === 'copy-aircraft-focus-codes') {
      const scope = button.dataset.codeScope === 'completed' ? 'completed' : 'missing';
      void copyAircraftFocusCodes(state.model, dimension, key, scope);
      return;
    }
    if (action === 'export-aircraft-focus-codes') {
      const scope = button.dataset.codeScope === 'completed' ? 'completed' : 'missing';
      exportAircraftFocusCodes(state.model, dimension, key, scope);
    }
  });

  elements.aircraftList.addEventListener('scroll', () => {
    if (!state.model) {
      return;
    }
    queueAircraftListRender();
  });

  elements.aircraftList.addEventListener('click', (event) => {
    if (!state.model) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const badgeButton = target.closest('button[data-action="open-registration-list"][data-model-id]');
    if (!badgeButton) {
      return;
    }
    const modelId = String(badgeButton.getAttribute('data-model-id') || '').trim().toUpperCase();
    if (!modelId) {
      return;
    }
    setRegistrationModalOpen(false, { restoreFocus: false });
    state.ui.modelRegsModalModelId = modelId;
    state.ui.modelRegsModalFocusModelId = modelId;
    state.ui.modelRegsModalPage = 1;
    setModelRegsModalOpen(true, { restoreFocus: false, focusModelId: modelId });
    return;
  });

  elements.aircraftList.addEventListener('click', (event) => {
    if (!state.model) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (target.closest('button')) {
      return;
    }
    const card = target.closest('.aircraft-card[data-model-id]');
    if (!(card instanceof HTMLElement)) {
      return;
    }
    const modelId = String(card.getAttribute('data-model-id') || '').trim().toUpperCase();
    if (!modelId) {
      return;
    }
    openAircraftDetailForModelId(modelId);
  });

  elements.aircraftList.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const target = event.target;
    if (!(target instanceof HTMLElement) || !target.classList.contains('aircraft-card')) {
      return;
    }
    event.preventDefault();
    const modelId = String(target.getAttribute('data-model-id') || '').trim().toUpperCase();
    if (!modelId) {
      return;
    }
    openAircraftDetailForModelId(modelId);
  });

  elements.aircraftList.addEventListener('error', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.classList.contains('aircraft-card-image')) {
      return;
    }
    const encodedCandidates = target.dataset.imageCandidates || '';
    const candidates = encodedCandidates ? encodedCandidates.split('|').filter(Boolean) : [];
    const currentIndex = Number.parseInt(target.dataset.imageIndex || '0', 10);
    const nextIndex = Number.isFinite(currentIndex) ? currentIndex + 1 : 1;
    if (nextIndex < candidates.length) {
      target.dataset.imageIndex = String(nextIndex);
      target.src = candidates[nextIndex];
      return;
    }
    const media = target.closest('.aircraft-card-media');
    if (media) {
      media.classList.add('is-fallback');
    }
    target.remove();
  }, true);

  elements.aircraftDetailClose.addEventListener('click', () => {
    setAircraftDetailModalOpen(false);
  });

  elements.aircraftDetailBackdrop.addEventListener('click', () => {
    setAircraftDetailModalOpen(false);
  });

  elements.aircraftDetailMediaOptions.addEventListener('click', (event) => {
    if (!state.ui.aircraftDetailModalOpen || !state.model) {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const button = target.closest('button[data-action="set-aircraft-detail-media"][data-media-key]');
    if (!(button instanceof HTMLButtonElement)) {
      return;
    }
    const mediaKey = String(button.getAttribute('data-media-key') || '').trim();
    if (!mediaKey || mediaKey === state.ui.aircraftDetailMediaKey) {
      return;
    }
    state.ui.aircraftDetailMediaKey = mediaKey;
    renderAircraftDetailModal(state.model);
  });

  elements.aircraftDetailOpenRegs.addEventListener('click', () => {
    if (!state.model) {
      return;
    }
    const modelId = String(elements.aircraftDetailOpenRegs.getAttribute('data-model-id') || '').trim().toUpperCase();
    if (!modelId) {
      return;
    }
    state.ui.modelRegsModalModelId = modelId;
    state.ui.modelRegsModalFocusModelId = modelId;
    state.ui.modelRegsModalPage = 1;
    setAircraftDetailModalOpen(false, { restoreFocus: false });
    setModelRegsModalOpen(true, { restoreFocus: false, focusModelId: modelId });
  });

  elements.aircraftDetailModal.addEventListener('error', (event) => {
    const target = event.target;
    if (target instanceof HTMLImageElement && target.classList.contains('aircraft-detail-media-image')) {
      const encodedCandidates = target.dataset.imageCandidates || '';
      const candidates = encodedCandidates ? encodedCandidates.split('|').filter(Boolean) : [];
      const currentIndex = Number.parseInt(target.dataset.imageIndex || '0', 10);
      const nextIndex = Number.isFinite(currentIndex) ? currentIndex + 1 : 1;
      if (nextIndex < candidates.length) {
        target.dataset.imageIndex = String(nextIndex);
        target.src = candidates[nextIndex];
        return;
      }
      const frame = target.closest('.aircraft-detail-media-frame');
      if (frame) {
        frame.classList.add('is-fallback');
      }
      target.remove();
      return;
    }
    if (!(target instanceof HTMLElement) || target.tagName.toLowerCase() !== 'model-viewer') {
      return;
    }
    const encodedCandidates = target.dataset.modelCandidates || '';
    const candidates = encodedCandidates ? encodedCandidates.split('|').filter(Boolean) : [];
    const currentIndex = Number.parseInt(target.dataset.modelIndex || '0', 10);
    const nextIndex = Number.isFinite(currentIndex) ? currentIndex + 1 : 1;
    if (nextIndex < candidates.length) {
      target.dataset.modelIndex = String(nextIndex);
      target.setAttribute('src', candidates[nextIndex]);
      return;
    }
    const frame = target.closest('.aircraft-detail-media-frame');
    if (frame) {
      frame.classList.add('is-fallback');
    }
    target.removeAttribute('src');
  }, true);

  window.addEventListener('resize', () => {
    if (!state.model) {
      if (state.activeTab === 'cardle' && state.cardle.map.instance) {
        invalidateLeafletMap(state.cardle.map.instance);
      }
      return;
    }
    if (state.activeTab === 'map' && state.map.instance) {
      state.map.instance.invalidateSize();
    }
    if (state.activeTab === 'cardle' && state.cardle.map.instance) {
      invalidateLeafletMap(state.cardle.map.instance);
    }
    queueAircraftListRender();
  });
}

async function bootstrap() {
  wireUpload();
  wireBanner();
  wireTabs();
  wireDataTools();
  wireMapCompletionControls();
  wireDailyGame();
  wireCardleGame();
  wireAircraftControls();
  window.addEventListener('hashchange', () => {
    void openExperienceFromHash({ focusInput: false });
  });
  syncCompletionSortControls();
  syncAircraftSortControls();
  resetRegistrationModalState();
  resetModelRegsModalState();
  resetAircraftDetailModalState();
  setModelRegsModalOpen(false, { restoreFocus: false });
  setAircraftDetailModalOpen(false, { restoreFocus: false });
  syncRegistrationModalControls();
  renderRegistrationModalTrigger(null);
  state.manualRegistrationMappings = readManualRegistrationMappings();
  state.daily.history = readDailyHistory();
  state.cardle.history = readCardleHistory();
  renderLandingDailyCtas();
  updateManualMappingStorageMeta(null);
  setPersistPreferenceChecked(readPersistPreference());
  syncDashboardTabAvailability();
  syncDataToolsPanelState();
  const persistedUpload = readPersistedUpload();
  const shouldRestorePersistedUpload = elements.persistUpload.checked && Boolean(persistedUpload);
  setDataToolsOpen(false);
  setBootState(
    true,
    shouldRestorePersistedUpload
      ? 'Checking for saved local data on this device...'
      : 'Preparing your private local workspace...',
  );
  elements.landingView.hidden = true;
  elements.dashboard.hidden = true;

  if (window.location.protocol === 'file:') {
    setBanner('Serve the site over HTTP to load reference data. Example: python -m http.server 4173 --directory site', 'warning');
    setReferenceStatus('Reference manifest unavailable over file://', 'warning');
    setBootState(false);
    elements.landingView.hidden = false;
    return;
  }

  try {
    const manifest = await loadReferenceManifest();
    try {
      state.daily.manifest = await loadAirportGameManifest();
    } catch {
      state.daily.manifest = null;
    }
    renderLandingDailyCtas();
    const modelDate = formatDateFromMillis(manifest?.datasets?.models?.updatedAt);
    const airportDate = formatDateFromMillis(manifest?.datasets?.airports?.updatedAt);
    setReferenceStatus(`Reference snapshot: models ${modelDate}, airports ${airportDate}, client ${manifest?.clientVersion || 'unknown'}.`, 'ok');
    if (shouldRestorePersistedUpload) {
      setBootState(true, 'Loading saved local data from this device...');
      await tryLoadPersistedUpload(persistedUpload);
    }
    const openedFromHash = await openExperienceFromHash({
      focusInput: false,
      revealShellBeforeReady: false,
      showBlockingLoader: false,
    });
    if (!state.model && !openedFromHash) {
      elements.landingView.hidden = false;
      elements.dashboard.hidden = true;
    }
  } catch (error) {
    setReferenceStatus('Reference manifest failed to load. Uploads will not work until committed data files are served.', 'warning');
    setBanner(error instanceof Error ? error.message : 'Reference manifest failed to load.', 'warning');
    const openedFromHash = await openExperienceFromHash({
      focusInput: false,
      revealShellBeforeReady: false,
      showBlockingLoader: false,
    });
    if (!state.model && !openedFromHash) {
      elements.landingView.hidden = false;
      elements.dashboard.hidden = true;
    }
  }
  setBootState(false);
  scheduleDailyCountdownRefresh();

  if (!window.L) {
    setBanner('Leaflet did not load. The map tab will stay unavailable until the Leaflet script is reachable.', 'warning');
  }
}

void bootstrap();
