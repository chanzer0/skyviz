import { renderBarList } from './charts.js';
import { buildDashboardModel, loadReferenceData, loadReferenceManifest, parseUserCollection } from './data.js';
import { escapeHtml, formatCompact, formatDateFromMillis, formatNumber, formatPercent } from './format.js';

const elements = {
  bootLoader: document.querySelector('#boot-loader'),
  bootStatus: document.querySelector('#boot-status'),
  landingView: document.querySelector('#landing-view'),
  fileInput: document.querySelector('#file-input'),
  dropzone: document.querySelector('#dropzone'),
  viewExampleButton: document.querySelector('#view-example'),
  persistUpload: document.querySelector('#persist-upload'),
  uploadStatus: document.querySelector('#upload-status'),
  referenceStatus: document.querySelector('#reference-status'),
  banner: document.querySelector('#message-banner'),
  dashboard: document.querySelector('#dashboard'),
  mapTabButton: document.querySelector('#tab-map-button'),
  aircraftTabButton: document.querySelector('#tab-aircraft-button'),
  dataToolsTrigger: document.querySelector('#data-tools-trigger'),
  dataToolsMenu: document.querySelector('#data-tools-menu'),
  dataToolsUpload: document.querySelector('#data-tools-upload'),
  dataToolsClear: document.querySelector('#data-tools-clear'),
  mapTabPanel: document.querySelector('#tab-map'),
  aircraftTabPanel: document.querySelector('#tab-aircraft'),
  mapSide: document.querySelector('#map-side'),
  mapCanvas: document.querySelector('#map-canvas'),
  mapLegend: document.querySelector('#map-legend'),
  mapAirportKpi: document.querySelector('#map-airport-kpi'),
  continentPanel: document.querySelector('#continent-panel'),
  continentPanelBody: document.querySelector('#continent-panel-body'),
  continentCollapseToggle: document.querySelector('#continent-collapse-toggle'),
  continentKpi: document.querySelector('#continent-kpi'),
  continentProgress: document.querySelector('#continent-progress'),
  continentSearch: document.querySelector('#continent-search'),
  continentSort: document.querySelector('#continent-sort'),
  continentSortDirection: document.querySelector('#continent-sort-direction'),
  continentProgressMeta: document.querySelector('#continent-progress-meta'),
  countryPanel: document.querySelector('#country-panel'),
  countryPanelBody: document.querySelector('#country-panel-body'),
  countryCollapseToggle: document.querySelector('#country-collapse-toggle'),
  countryKpi: document.querySelector('#country-kpi'),
  countryProgress: document.querySelector('#country-progress'),
  countrySearch: document.querySelector('#country-search'),
  countrySort: document.querySelector('#country-sort'),
  countrySortDirection: document.querySelector('#country-sort-direction'),
  countryProgressMeta: document.querySelector('#country-progress-meta'),
  usStatePanel: document.querySelector('#us-state-panel'),
  usStatePanelBody: document.querySelector('#us-state-panel-body'),
  usStateCollapseToggle: document.querySelector('#us-state-collapse-toggle'),
  usStateKpi: document.querySelector('#us-state-kpi'),
  usStateProgress: document.querySelector('#us-state-progress'),
  usStateSearch: document.querySelector('#us-state-search'),
  usStateSort: document.querySelector('#us-state-sort'),
  usStateSortDirection: document.querySelector('#us-state-sort-direction'),
  usStateProgressMeta: document.querySelector('#us-state-progress-meta'),
  aircraftOverviewPanel: document.querySelector('#aircraft-overview-panel'),
  aircraftTierXpPanel: document.querySelector('#aircraft-tier-xp-panel'),
  aircraftCategoryXpPanel: document.querySelector('#aircraft-category-xp-panel'),
  aircraftTypeProgressPanel: document.querySelector('#aircraft-type-progress-panel'),
  aircraftCategoryProgressPanel: document.querySelector('#aircraft-category-progress-panel'),
  aircraftTierCompletionPanel: document.querySelector('#aircraft-tier-completion-panel'),
  aircraftImagePlaceholderPanel: document.querySelector('#aircraft-image-placeholder-panel'),
  aircraftRegPlaceholderPanel: document.querySelector('#aircraft-reg-placeholder-panel'),
  aircraftSide: document.querySelector('#aircraft-side'),
  aircraftSearch: document.querySelector('#aircraft-search'),
  aircraftSort: document.querySelector('#aircraft-sort'),
  aircraftSortDirection: document.querySelector('#aircraft-sort-direction'),
  aircraftListMeta: document.querySelector('#aircraft-list-meta'),
  aircraftList: document.querySelector('#aircraft-list'),
  aircraftRegTransparencyTrigger: document.querySelector('#aircraft-reg-transparency-trigger'),
  aircraftRegTransparencyModal: document.querySelector('#aircraft-reg-transparency-modal'),
  aircraftRegTransparencyBackdrop: document.querySelector('#aircraft-reg-transparency-backdrop'),
  aircraftRegTransparencyClose: document.querySelector('#aircraft-reg-transparency-close'),
  aircraftRegTransparencySummary: document.querySelector('#aircraft-reg-transparency-summary'),
  aircraftRegTransparencySearch: document.querySelector('#aircraft-reg-transparency-search'),
  aircraftRegTransparencyFilter: document.querySelector('#aircraft-reg-transparency-filter'),
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
};

const AIRCRAFT_CARD_HEIGHT_MOBILE = 460;
const AIRCRAFT_CARD_HEIGHT_TABLET_PLUS = 500;
const AIRCRAFT_GRID_GAP = 14;
const AIRCRAFT_GRID_PADDING = 14;
const AIRCRAFT_MIN_CARD_WIDTH = 244;
const AIRCRAFT_VIRTUAL_OVERSCAN_ROWS = 2;
const AIRCRAFT_IMAGE_BASE_URL = 'https://cdn.skycards.oldapes.com/assets/models/images/1';
const AIRCRAFT_IMAGE_TIERS = ['paper', 'bronze', 'silver', 'gold', 'platinum', 'cyber'];
const AIRCRAFT_IMAGE_SIZE_ORDER = ['md'];
const PERSISTED_UPLOAD_KEY = 'skyviz.persistedUpload.v1';
const PERSIST_PREFERENCE_KEY = 'skyviz.persistUploadPreference.v1';
const EXAMPLE_DECK_PATH = './data/example/try_now_user.json';
const COMPLETION_SORT_CATEGORIES = new Set(['percent', 'total', 'captured', 'name']);
const COMPLETION_SORT_DIRECTIONS = new Set(['asc', 'desc']);
const MAP_BASE_VIEW = Object.freeze({ center: [16, 0], zoom: 2 });
const MAP_MARKER_SCALE_PER_ZOOM = 0.24;
const MAP_MAX_MARKER_RADIUS = 10.5;
const MAP_HIGHLIGHT_EXTRA_RADIUS = 1.8;
const MAP_CODE_LABEL_MIN_ZOOM = 6;
const MAP_CODE_LABEL_MAX_COUNT = 140;
const REGION_CODE_PREVIEW_LIMIT = 56;
const REGISTRATION_MODAL_PAGE_SIZE = 120;
const MODEL_REGISTRATION_MODAL_PAGE_SIZE = 120;
const REGISTRATION_MODAL_FILTERS = new Set(['all', 'high', 'medium', 'ambiguous', 'low']);
const REGISTRATION_MODAL_CONFIDENCE_LABELS = {
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
    continentQuery: '',
    continentSort: 'total_desc',
    continentCollapsed: false,
    countryQuery: '',
    countrySort: 'total_desc',
    countryCollapsed: false,
    usStateQuery: '',
    usStateSort: 'total_desc',
    usStateCollapsed: false,
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
  ui: {
    dataToolsOpen: false,
    bannerDismissTimer: null,
    registrationModalOpen: false,
    registrationModalQuery: '',
    registrationModalConfidence: 'all',
    registrationModalPage: 1,
    modelRegsModalOpen: false,
    modelRegsModalModelId: null,
    modelRegsModalFocusModelId: null,
    modelRegsModalPage: 1,
  },
};

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
  if (statusMessage) {
    elements.bootStatus.textContent = statusMessage;
  }
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

function persistCurrentUploadIfEnabled() {
  if (!elements.persistUpload.checked) {
    clearPersistedUpload();
    writePersistPreference(false);
    return false;
  }
  const saved = writePersistedUpload(state.upload);
  if (!saved) {
    elements.persistUpload.checked = false;
    clearPersistedUpload();
    writePersistPreference(false);
    setBanner(
      'Could not save to local storage (browser storage unavailable or quota exceeded). Your data is still private and in-memory only for this session.',
      'warning',
    );
    return false;
  }
  writePersistPreference(true);
  return true;
}

function setDataToolsOpen(isOpen) {
  state.ui.dataToolsOpen = isOpen;
  elements.dataToolsTrigger.setAttribute('aria-expanded', String(isOpen));
  elements.dataToolsMenu.hidden = !isOpen;
}

function resetRegistrationModalState() {
  state.ui.registrationModalOpen = false;
  state.ui.registrationModalQuery = '';
  state.ui.registrationModalConfidence = 'all';
  state.ui.registrationModalPage = 1;
}

function resetModelRegsModalState() {
  state.ui.modelRegsModalOpen = false;
  state.ui.modelRegsModalModelId = null;
  state.ui.modelRegsModalFocusModelId = null;
  state.ui.modelRegsModalPage = 1;
}

function syncGlobalModalBodyLock() {
  document.body.classList.toggle(
    'has-modal-open',
    Boolean(state.ui.registrationModalOpen || state.ui.modelRegsModalOpen),
  );
}

function getRegistrationTransparencyRows(model = state.model) {
  if (!model?.aircraft?.registrationTransparency?.rows) {
    return [];
  }
  return model.aircraft.registrationTransparency.rows;
}

function registrationConfidenceLabel(value) {
  return REGISTRATION_MODAL_CONFIDENCE_LABELS[value] || 'Low';
}

function registrationStatusLabel(value) {
  return REGISTRATION_MODAL_STATUS_LABELS[value] || 'Unmapped';
}

function registrationMethodLabel(value) {
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

function renderRegistrationModalTrigger(model = state.model) {
  const trigger = elements.aircraftRegTransparencyTrigger;
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
  const rows = getRegistrationTransparencyRows(model);
  const summary = model?.aircraft?.registrationTransparency?.summary || {};
  const confidenceCounts = summary.confidenceCounts || {};
  const inferenceStatusCounts = summary.inferenceStatusCounts || {};
  const modelLabelMap = buildAircraftModelLabelMap(model);

  elements.aircraftRegTransparencySummary.innerHTML = `
    <span class="registration-summary-chip">${formatNumber(summary.mappedRows || 0)} mapped</span>
    <span class="registration-summary-chip">${formatNumber(summary.unmappedRows || 0)} unmapped</span>
    <span class="registration-summary-chip is-high">High ${formatNumber(confidenceCounts.high || 0)}</span>
    <span class="registration-summary-chip is-medium">Medium ${formatNumber(confidenceCounts.medium || 0)}</span>
    <span class="registration-summary-chip is-ambiguous">Ambiguous ${formatNumber(confidenceCounts.ambiguous || 0)}</span>
    <span class="registration-summary-chip is-low">Low ${formatNumber(confidenceCounts.low || 0)}</span>
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
        <td class="aircraft-reg-empty" colspan="5">No matching rows.</td>
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
      const noteParts = [];
      if (row.issueLabel) {
        noteParts.push(row.issueLabel);
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
  if (!elements.aircraftRegTransparencyModal) {
    return;
  }
  if (isOpen && !state.model) {
    return;
  }
  if (isOpen && state.ui.modelRegsModalOpen) {
    setModelRegsModalOpen(false, { restoreFocus: false });
  }
  state.ui.registrationModalOpen = Boolean(isOpen);
  elements.aircraftRegTransparencyModal.hidden = !state.ui.registrationModalOpen;
  elements.aircraftRegTransparencyTrigger?.setAttribute('aria-expanded', String(state.ui.registrationModalOpen));
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
    elements.aircraftRegTransparencyTrigger?.focus();
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

function clearDashboardPanels() {
  elements.mapLegend.innerHTML = '';
  elements.mapAirportKpi.textContent = '';
  elements.continentKpi.textContent = '';
  elements.countryKpi.textContent = '';
  elements.usStateKpi.textContent = '';
  elements.continentProgress.innerHTML = '';
  elements.countryProgress.innerHTML = '';
  elements.usStateProgress.innerHTML = '';
  elements.continentProgressMeta.textContent = '';
  elements.countryProgressMeta.textContent = '';
  elements.usStateProgressMeta.textContent = '';
  elements.aircraftOverviewPanel.innerHTML = '';
  elements.aircraftTierXpPanel.innerHTML = '';
  elements.aircraftCategoryXpPanel.innerHTML = '';
  elements.aircraftTypeProgressPanel.innerHTML = '';
  elements.aircraftCategoryProgressPanel.innerHTML = '';
  elements.aircraftTierCompletionPanel.innerHTML = '';
  elements.aircraftImagePlaceholderPanel.innerHTML = '';
  elements.aircraftRegPlaceholderPanel.innerHTML = '';
  elements.aircraftListMeta.textContent = '';
  elements.aircraftList.innerHTML = '';
  elements.aircraftRegTransparencySummary.innerHTML = '';
  elements.aircraftRegTransparencyMeta.textContent = '';
  elements.aircraftRegTransparencyRows.innerHTML = '';
  elements.aircraftRegTransparencyPageLabel.textContent = '';
  elements.aircraftModelRegsTitle.textContent = 'Caught registrations';
  elements.aircraftModelRegsSummary.textContent = '';
  elements.aircraftModelRegsBreakdown.innerHTML = '';
  elements.aircraftModelRegsMeta.textContent = '';
  elements.aircraftModelRegsRows.innerHTML = '';
  elements.aircraftModelRegsPageLabel.textContent = '';
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

function syncCompletionSortControls() {
  const continentSort = parseCompletionSortKey(state.map.continentSort);
  const countrySort = parseCompletionSortKey(state.map.countrySort);
  const usStateSort = parseCompletionSortKey(state.map.usStateSort);
  elements.continentSort.value = continentSort.category;
  elements.countrySort.value = countrySort.category;
  elements.usStateSort.value = usStateSort.category;
  applyDirectionButtonState(elements.continentSortDirection, continentSort.direction);
  applyDirectionButtonState(elements.countrySortDirection, countrySort.direction);
  applyDirectionButtonState(elements.usStateSortDirection, usStateSort.direction);
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

function applyCompletionCollapseButtonState(button, isCollapsed) {
  if (!button) {
    return;
  }
  button.textContent = isCollapsed ? 'Expand' : 'Collapse';
  button.setAttribute('aria-expanded', String(!isCollapsed));
  button.setAttribute('aria-label', isCollapsed ? 'Expand panel' : 'Collapse panel');
}

function isDesktopMapLayout() {
  return window.matchMedia('(min-width: 1025px)').matches;
}

function applyDefaultMapCompletionCollapseState() {
  if (isDesktopMapLayout()) {
    state.map.continentCollapsed = true;
    state.map.countryCollapsed = false;
    state.map.usStateCollapsed = false;
    return;
  }
  state.map.continentCollapsed = false;
  state.map.countryCollapsed = false;
  state.map.usStateCollapsed = false;
}

function syncMapCompletionCollapseUi() {
  const continentCollapsed = state.map.continentCollapsed;
  const countryCollapsed = state.map.countryCollapsed;
  const usStateCollapsed = state.map.usStateCollapsed;
  elements.continentPanel.classList.toggle('is-collapsed', continentCollapsed);
  elements.countryPanel.classList.toggle('is-collapsed', countryCollapsed);
  elements.usStatePanel.classList.toggle('is-collapsed', usStateCollapsed);
  elements.mapSide.classList.toggle('continent-collapsed', continentCollapsed);
  elements.mapSide.classList.toggle('country-collapsed', countryCollapsed);
  elements.mapSide.classList.toggle('us-state-collapsed', usStateCollapsed);
  elements.continentPanelBody.hidden = continentCollapsed;
  elements.countryPanelBody.hidden = countryCollapsed;
  elements.usStatePanelBody.hidden = usStateCollapsed;
  applyCompletionCollapseButtonState(elements.continentCollapseToggle, continentCollapsed);
  applyCompletionCollapseButtonState(elements.countryCollapseToggle, countryCollapsed);
  applyCompletionCollapseButtonState(elements.usStateCollapseToggle, usStateCollapsed);
}

function setMapCompletionCollapsed(panel, isCollapsed) {
  if (panel !== 'continent' && panel !== 'country' && panel !== 'us-state') {
    return;
  }
  if (panel === 'continent') {
    state.map.continentCollapsed = Boolean(isCollapsed);
  } else if (panel === 'country') {
    state.map.countryCollapsed = Boolean(isCollapsed);
  } else {
    state.map.usStateCollapsed = Boolean(isCollapsed);
  }
  syncMapCompletionCollapseUi();
  requestAnimationFrame(() => {
    if (state.map.instance) {
      state.map.instance.invalidateSize();
    }
  });
}

function resetToLanding({ clearPersisted = false, clearPersistPreference = false } = {}) {
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
  applyDefaultMapCompletionCollapseState();
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
  resetRegistrationModalState();
  resetModelRegsModalState();
  setRegistrationModalOpen(false, { restoreFocus: false });
  setModelRegsModalOpen(false, { restoreFocus: false });

  clearMapLayers();
  clearDashboardPanels();

  elements.continentSearch.value = '';
  elements.countrySearch.value = '';
  elements.usStateSearch.value = '';
  syncCompletionSortControls();
  syncMapCompletionCollapseUi();
  elements.aircraftSearch.value = '';
  syncAircraftSortControls();
  syncRegistrationModalControls();
  renderRegistrationModalTrigger(null);
  elements.fileInput.value = '';
  setUploadStatus('Waiting for a collection export.');

  elements.dashboard.hidden = true;
  elements.landingView.hidden = false;
  setDataToolsOpen(false);

  if (clearPersisted) {
    clearPersistedUpload();
  }
  if (clearPersistPreference) {
    writePersistPreference(false);
    elements.persistUpload.checked = false;
  }
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

  elements.dataToolsClear.addEventListener('click', () => {
    resetToLanding({ clearPersisted: true, clearPersistPreference: true });
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

function setActiveTab(tabId) {
  state.activeTab = tabId;
  const isMap = tabId === 'map';
  if (isMap && state.ui.registrationModalOpen) {
    setRegistrationModalOpen(false, { restoreFocus: false });
  }
  if (isMap && state.ui.modelRegsModalOpen) {
    setModelRegsModalOpen(false, { restoreFocus: false });
  }
  elements.mapTabButton.classList.toggle('is-active', isMap);
  elements.aircraftTabButton.classList.toggle('is-active', !isMap);
  elements.mapTabButton.setAttribute('aria-selected', String(isMap));
  elements.aircraftTabButton.setAttribute('aria-selected', String(!isMap));
  elements.mapTabPanel.hidden = !isMap;
  elements.aircraftTabPanel.hidden = isMap;
  if (isMap) {
    requestAnimationFrame(() => {
      if (state.map.instance) {
        state.map.instance.invalidateSize();
      }
    });
    return;
  }
  requestAnimationFrame(() => {
    queueAircraftListRender();
  });
}

function wireTabs() {
  const buttons = [elements.mapTabButton, elements.aircraftTabButton];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const target = button.dataset.tab;
      if (target) {
        setActiveTab(target);
      }
    });
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') {
        return;
      }
      event.preventDefault();
      const currentIndex = buttons.indexOf(button);
      const nextIndex = event.key === 'ArrowRight'
        ? (currentIndex + 1) % buttons.length
        : (currentIndex - 1 + buttons.length) % buttons.length;
      const nextButton = buttons[nextIndex];
      nextButton.focus();
      const target = nextButton.dataset.tab;
      if (target) {
        setActiveTab(target);
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
  const countryPercent = formatPercent(
    (model.summary.uniqueCapturedCountries / Math.max(model.summary.totalCountries, 1)) * 100,
    1,
  );
  const continentPercent = formatPercent(
    (model.summary.uniqueCapturedContinents / Math.max(model.summary.totalContinents, 1)) * 100,
    1,
  );
  const usStatePercent = formatPercent(
    (model.summary.uniqueCapturedUSStates / Math.max(model.summary.totalUSStates, 1)) * 100,
    1,
  );
  elements.mapAirportKpi.textContent = `Unlocked ${formatNumber(model.map.capturedAirports)} / ${formatNumber(model.map.totalAirports)} airports (${airportPercent} complete).`;
  elements.countryKpi.textContent = `Unlocked ${formatNumber(model.summary.uniqueCapturedCountries)} / ${formatNumber(model.summary.totalCountries)} countries (${countryPercent}).`;
  elements.continentKpi.textContent = `Unlocked ${formatNumber(model.summary.uniqueCapturedContinents)} / ${formatNumber(model.summary.totalContinents)} continents (${continentPercent}).`;
  elements.usStateKpi.textContent = `Unlocked ${formatNumber(model.summary.uniqueCapturedUSStates)} / ${formatNumber(model.summary.totalUSStates)} US states (${usStatePercent}).`;
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
    }
    if (point.countryCode === 'US' && point.usStateCode) {
      if (!usState.has(point.usStateCode)) {
        usState.set(point.usStateCode, []);
      }
      usState.get(point.usStateCode).push(point);
    }
  }
  state.map.regionPointIndex = { continent, country, usState };
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
                title="Zoom to ${escapeHtml(row.label)}"
              >
                <div class="bar-row-head">
                  <div>
                    <span class="bar-label">${escapeHtml(row.label)}</span>
                    <span class="bar-meta">${escapeHtml(row.meta)}</span>
                  </div>
                  <strong>${escapeHtml(formatPercent(row.percent, 1))}</strong>
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

function renderContinentProgress(model) {
  const filteredRows = applyCompletionFilters(
    model.map.continentProgress,
    state.map.continentQuery,
    state.map.continentSort,
  );
  setCompletionMeta(elements.continentProgressMeta, filteredRows.length, model.map.continentProgress.length, 'continents');
  const rows = filteredRows.map((row) => ({
    key: row.key,
    label: row.label,
    percent: row.percent,
    captured: row.captured,
    total: row.total,
    remaining: row.remaining,
    color: row.color,
    meta: `${formatNumber(row.captured)} / ${formatNumber(row.total)} (${formatNumber(row.remaining)} remaining)`,
  }));
  return renderCompletionProgressRows(model, rows, 'continent', 'No continent data available.');
}

function renderCountryProgress(model) {
  const filteredRows = applyCompletionFilters(
    model.map.countryProgress,
    state.map.countryQuery,
    state.map.countrySort,
  );
  setCompletionMeta(elements.countryProgressMeta, filteredRows.length, model.map.countryProgress.length, 'countries');
  const rows = filteredRows.map((row) => ({
    key: row.key,
    label: row.label,
    percent: row.percent,
    captured: row.captured,
    total: row.total,
    remaining: row.remaining,
    color: row.color,
    meta: `${formatNumber(row.captured)} / ${formatNumber(row.total)} (${formatNumber(row.remaining)} remaining)`,
  }));
  return renderCompletionProgressRows(model, rows, 'country', 'No country data available.');
}

function renderUSStateProgress(model) {
  const filteredRows = applyCompletionFilters(
    model.map.usStateProgress,
    state.map.usStateQuery,
    state.map.usStateSort,
  );
  setCompletionMeta(elements.usStateProgressMeta, filteredRows.length, model.map.usStateProgress.length, 'US states');
  const rows = filteredRows.map((row) => ({
    key: row.key,
    label: row.label,
    percent: row.percent,
    captured: row.captured,
    total: row.total,
    remaining: row.remaining,
    color: row.color,
    meta: `${formatNumber(row.captured)} / ${formatNumber(row.total)} (${formatNumber(row.remaining)} remaining)`,
  }));
  return renderCompletionProgressRows(model, rows, 'us-state', 'No US state data available.');
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
  window.L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
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
  const city = point.city ? `${point.city}, ` : '';
  const fr24Slug = toFr24AirportSlug(point);
  const fr24Link = fr24Slug
    ? `<a href="https://www.flightradar24.com/airport/${fr24Slug}" target="_blank" rel="noopener noreferrer">View on FR24</a>`
    : '';
  return `
    <strong>${escapeHtml(code)}</strong><br>
    ${escapeHtml(point.name)}<br>
    ${escapeHtml(city + point.countryLabel)}<br>
    ${fr24Link || ''}
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
  elements.continentProgress.innerHTML = renderContinentProgress(model);
  elements.countryProgress.innerHTML = renderCountryProgress(model);
  elements.usStateProgress.innerHTML = renderUSStateProgress(model);
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
    <div class="bar-list aircraft-focus-list">
      ${visibleRows.map((row) => {
    const width = Math.max(0, Math.min((row.value / maxValue) * 100, 100));
    const isSelected = isAircraftFocusSelected(options.focusDimension, row.key);
    const isExpanded = isAircraftFocusExpanded(options.focusScope || '', options.focusDimension, row.key);
    return `
          <article class="bar-row completion-region-row aircraft-focus-row${isSelected ? ' is-selected' : ''}${isExpanded ? ' is-expanded' : ''}">
            <div class="completion-region-row-top">
              <button
                type="button"
                class="bar-row-button aircraft-focus-button${isSelected ? ' is-selected' : ''}"
                data-action="toggle-aircraft-focus"
                data-focus-scope="${escapeHtml(options.focusScope || '')}"
                data-focus-dimension="${escapeHtml(options.focusDimension)}"
                data-focus-key="${escapeHtml(row.key)}"
                aria-pressed="${String(isSelected)}"
                title="Filter aircraft list by ${escapeHtml(row.label)}"
              >
                <div class="bar-row-head">
                  <div>
                    <span class="bar-label">${escapeHtml(row.label)}</span>
                    ${row.meta ? `<span class="bar-meta">${escapeHtml(row.meta)}</span>` : ''}
                  </div>
                  <strong>${escapeHtml(valueFormatter(row.value))}</strong>
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

  const totalXp = Math.max(model.summary.totalXp, 1);
  const tierXpRows = model.aircraft.tierXp.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    color: row.color,
    meta: `${formatPercent((row.value / totalXp) * 100, 1)} of total XP`,
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

  const categoryXpRows = model.aircraft.categoryXp.map((row) => ({
    key: row.key,
    label: row.label,
    value: row.value,
    color: row.color,
    meta: `${formatPercent((row.value / totalXp) * 100, 1)} of total XP`,
  }));
  elements.aircraftCategoryXpPanel.innerHTML = renderAircraftFocusPanel(model, {
    eyebrow: 'XP',
    title: 'XP by category',
    rows: categoryXpRows,
    valueFormatter: (value) => `${formatCompact(value)} XP`,
    emptyMessage: 'No category XP data available.',
    focusDimension: 'category',
    focusScope: 'category-xp',
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
  if (!Number.isFinite(number)) {
    return 'N/A';
  }
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: Number.isFinite(options.minFractionDigits) ? options.minFractionDigits : 0,
    maximumFractionDigits: Number.isFinite(options.maxFractionDigits) ? options.maxFractionDigits : 1,
  });
  return `${formatter.format(number)}${options.suffix || ''}`;
}

function formatAircraftRarity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return 'N/A';
  }
  return formatAircraftStat(number / 100, {
    minFractionDigits: 2,
    maxFractionDigits: 2,
  });
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
            <h4 class="aircraft-card-name">${escapeHtml(name)}</h4>
          </div>
          <div class="aircraft-card-badges">
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
        <p class="aircraft-card-model">ICAO ${escapeHtml(icao)}</p>
        <dl class="aircraft-card-stats">
          <div class="aircraft-card-stat">
            <dt>First flight</dt>
            <dd>${formatAircraftStat(row.firstFlight, { maxFractionDigits: 0 })}</dd>
          </div>
          <div class="aircraft-card-stat">
            <dt>Rarity</dt>
            <dd>${formatAircraftRarity(row.rareness)}</dd>
          </div>
          <div class="aircraft-card-stat">
            <dt>Wingspan</dt>
            <dd>${formatAircraftStat(row.wingspan, { suffix: ' m', maxFractionDigits: 1 })}</dd>
          </div>
          <div class="aircraft-card-stat">
            <dt>Speed</dt>
            <dd>${formatAircraftStat(row.maxSpeed, { suffix: ' kt', maxFractionDigits: 0 })}</dd>
          </div>
          <div class="aircraft-card-stat">
            <dt>Seats</dt>
            <dd>${formatAircraftStat(row.seats, { maxFractionDigits: 0 })}</dd>
          </div>
          <div class="aircraft-card-stat">
            <dt>Weight</dt>
            <dd>${formatAircraftStat(row.mtow, { suffix: ' kg', maxFractionDigits: 0 })}</dd>
          </div>
        </dl>
      </div>
    </article>
  `;
}

function sortAircraftRows(rows, sortBy, direction = 'desc') {
  const sortable = rows.slice();
  const factor = direction === 'asc' ? 1 : -1;
  return sortable.sort((left, right) => {
    let comparison = 0;
    if (sortBy === 'glow') {
      comparison = left.glowCount - right.glowCount
        || left.xp - right.xp
        || left.displayName.localeCompare(right.displayName);
    } else if (sortBy === 'coverage') {
      comparison = left.avgCoverage - right.avgCoverage
        || left.xp - right.xp
        || left.displayName.localeCompare(right.displayName);
    } else if (sortBy === 'name') {
      comparison = left.displayName.localeCompare(right.displayName);
    } else if (sortBy === 'speed') {
      comparison = (left.maxSpeed || -1) - (right.maxSpeed || -1)
        || left.xp - right.xp
        || left.displayName.localeCompare(right.displayName);
    } else {
      comparison = left.xp - right.xp
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

function renderAircraftList() {
  const rows = state.aircraft.visibleRows;
  const totalRows = state.model?.aircraft.rows.length || 0;
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
  const renderSignature = `${rows.length}|${layout.columns}|${startRow}|${endRow}|${rows[startIndex]?.key || ''}|${rows[endIndex]?.key || ''}`;
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
  applyDefaultMapCompletionCollapseState();
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
  setRegistrationModalOpen(false, { restoreFocus: false });
  setModelRegsModalOpen(false, { restoreFocus: false });
  elements.continentSearch.value = '';
  elements.countrySearch.value = '';
  elements.usStateSearch.value = '';
  syncCompletionSortControls();
  syncMapCompletionCollapseUi();
  elements.aircraftSearch.value = '';
  syncAircraftSortControls();
  syncRegistrationModalControls();
  elements.landingView.hidden = true;
  elements.dashboard.hidden = false;
  setDataToolsOpen(false);
  renderMapTab(model);
  renderAircraftTab(model);
  setActiveTab('map');
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
    const model = buildDashboardModel(payload, references);
    state.upload.fileName = persisted.fileName;
    state.upload.text = persisted.text;
    renderDashboard(model, references);
    setUploadStatus(`Loaded saved upload ${persisted.fileName} for ${model.user.name}. Stored only on this device.`);
    setBanner('Loaded from your browser local storage. Skyviz never sent your collection to a server.', 'info', {
      autoDismissMs: 10000,
    });
  } catch (error) {
    clearPersistedUpload();
    elements.persistUpload.checked = false;
    writePersistPreference(false);
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

async function handleFile(file) {
  if (!file) {
    return;
  }
  setBanner('');
  setUploadStatus(`Reading ${file.name}...`);
  try {
    const text = await file.text();
    const payload = parseUserCollection(text, file.name);
    setUploadStatus(`Enriching ${file.name} with reference data...`);
    const references = await loadReferenceData();
    const model = buildDashboardModel(payload, references);
    state.upload.fileName = file.name;
    state.upload.text = text;
    renderDashboard(model, references);
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
    elements.fileInput.value = '';
  }
}

async function handleExampleView() {
  setBanner('');
  setUploadStatus('Loading example dashboard...');
  try {
    const response = await fetch(EXAMPLE_DECK_PATH, { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`Failed to load built-in example data (${response.status}).`);
    }
    const text = await response.text();
    const payload = parseUserCollection(text, 'built-in example');
    setUploadStatus('Enriching example data with reference data...');
    const references = await loadReferenceData();
    const model = buildDashboardModel(payload, references);
    state.upload.fileName = 'skyviz_try_now_user.json';
    state.upload.text = text;
    renderDashboard(model, references);
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
    const enabled = elements.persistUpload.checked;
    writePersistPreference(enabled);
    if (!enabled) {
      clearPersistedUpload();
      if (state.model) {
        setBanner('Local save disabled. Any saved upload has been removed from this device.', 'info');
      }
      return;
    }
    if (!state.upload.text) {
      setBanner('Local save enabled. Your next successful upload will be saved only on this device.', 'info');
      return;
    }
    const saved = writePersistedUpload(state.upload);
    if (!saved) {
      elements.persistUpload.checked = false;
      clearPersistedUpload();
      writePersistPreference(false);
      setBanner(
        'Could not save to local storage (browser storage unavailable or quota exceeded). Data remains private in-memory only.',
        'warning',
      );
      return;
    }
    setUploadStatus('Current upload saved only on this device (local storage).');
    setBanner('Upload saved locally on this device. Skyviz does not send your collection to a server.', 'info');
  });
}

function wireMapCompletionControls() {
  elements.continentSearch.addEventListener('input', () => {
    if (!state.model) {
      return;
    }
    state.map.continentQuery = elements.continentSearch.value;
    renderMapProgressPanels(state.model);
  });

  elements.continentSort.addEventListener('change', () => {
    const current = parseCompletionSortKey(state.map.continentSort);
    state.map.continentSort = buildCompletionSortKey(elements.continentSort.value, current.direction);
    syncCompletionSortControls();
    if (state.model) {
      renderMapProgressPanels(state.model);
    }
  });

  elements.continentSortDirection.addEventListener('click', () => {
    const current = parseCompletionSortKey(state.map.continentSort);
    state.map.continentSort = buildCompletionSortKey(current.category, toggleCompletionDirection(current.direction));
    syncCompletionSortControls();
    if (state.model) {
      renderMapProgressPanels(state.model);
    }
  });

  elements.countrySearch.addEventListener('input', () => {
    if (!state.model) {
      return;
    }
    state.map.countryQuery = elements.countrySearch.value;
    renderMapProgressPanels(state.model);
  });

  elements.countrySort.addEventListener('change', () => {
    const current = parseCompletionSortKey(state.map.countrySort);
    state.map.countrySort = buildCompletionSortKey(elements.countrySort.value, current.direction);
    syncCompletionSortControls();
    if (state.model) {
      renderMapProgressPanels(state.model);
    }
  });

  elements.countrySortDirection.addEventListener('click', () => {
    const current = parseCompletionSortKey(state.map.countrySort);
    state.map.countrySort = buildCompletionSortKey(current.category, toggleCompletionDirection(current.direction));
    syncCompletionSortControls();
    if (state.model) {
      renderMapProgressPanels(state.model);
    }
  });

  elements.usStateSearch.addEventListener('input', () => {
    if (!state.model) {
      return;
    }
    state.map.usStateQuery = elements.usStateSearch.value;
    renderMapProgressPanels(state.model);
  });

  elements.usStateSort.addEventListener('change', () => {
    const current = parseCompletionSortKey(state.map.usStateSort);
    state.map.usStateSort = buildCompletionSortKey(elements.usStateSort.value, current.direction);
    syncCompletionSortControls();
    if (state.model) {
      renderMapProgressPanels(state.model);
    }
  });

  elements.usStateSortDirection.addEventListener('click', () => {
    const current = parseCompletionSortKey(state.map.usStateSort);
    state.map.usStateSort = buildCompletionSortKey(current.category, toggleCompletionDirection(current.direction));
    syncCompletionSortControls();
    if (state.model) {
      renderMapProgressPanels(state.model);
    }
  });

  elements.continentCollapseToggle.addEventListener('click', () => {
    setMapCompletionCollapsed('continent', !state.map.continentCollapsed);
  });

  elements.countryCollapseToggle.addEventListener('click', () => {
    setMapCompletionCollapsed('country', !state.map.countryCollapsed);
  });

  elements.usStateCollapseToggle.addEventListener('click', () => {
    setMapCompletionCollapsed('us-state', !state.map.usStateCollapsed);
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

  elements.continentProgress.addEventListener('click', onCompletionRowClick);
  elements.countryProgress.addEventListener('click', onCompletionRowClick);
  elements.usStateProgress.addEventListener('click', onCompletionRowClick);
}

function wireAircraftControls() {
  elements.aircraftRegTransparencyTrigger.addEventListener('click', () => {
    if (!state.model) {
      return;
    }
    setModelRegsModalOpen(false, { restoreFocus: false });
    state.ui.registrationModalQuery = '';
    state.ui.registrationModalConfidence = 'all';
    state.ui.registrationModalPage = 1;
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
    if (state.ui.registrationModalOpen) {
      renderRegistrationTransparencyModal(state.model);
    }
  });

  elements.aircraftRegTransparencyFilter.addEventListener('change', () => {
    const selected = elements.aircraftRegTransparencyFilter.value;
    state.ui.registrationModalConfidence = REGISTRATION_MODAL_FILTERS.has(selected) ? selected : 'all';
    state.ui.registrationModalPage = 1;
    if (state.ui.registrationModalOpen) {
      renderRegistrationTransparencyModal(state.model);
    }
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
    renderRegistrationTransparencyModal(state.model);
  });

  elements.aircraftRegTransparencyNext.addEventListener('click', () => {
    if (!state.ui.registrationModalOpen) {
      return;
    }
    state.ui.registrationModalPage += 1;
    renderRegistrationTransparencyModal(state.model);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') {
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
      const wasSelected = isAircraftFocusSelected(dimension, key);
      toggleAircraftFocus(dimension, key);
      if (wasSelected) {
        if (isAircraftFocusExpanded(scope, dimension, key)) {
          state.aircraft.expandedFocus = null;
        }
      } else {
        state.aircraft.expandedFocus = { scope, dimension, key };
      }
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

  window.addEventListener('resize', () => {
    if (!state.model) {
      return;
    }
    if (state.activeTab === 'map' && state.map.instance) {
      state.map.instance.invalidateSize();
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
  wireAircraftControls();
  syncCompletionSortControls();
  syncAircraftSortControls();
  resetRegistrationModalState();
  resetModelRegsModalState();
  setModelRegsModalOpen(false, { restoreFocus: false });
  syncRegistrationModalControls();
  renderRegistrationModalTrigger(null);
  syncMapCompletionCollapseUi();
  elements.persistUpload.checked = readPersistPreference();
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
    const modelDate = formatDateFromMillis(manifest?.datasets?.models?.updatedAt);
    const airportDate = formatDateFromMillis(manifest?.datasets?.airports?.updatedAt);
    setReferenceStatus(`Reference snapshot: models ${modelDate}, airports ${airportDate}, client ${manifest?.clientVersion || 'unknown'}.`, 'ok');
    if (shouldRestorePersistedUpload) {
      setBootState(true, 'Loading saved local data from this device...');
      await tryLoadPersistedUpload(persistedUpload);
    }
    if (!state.model) {
      elements.landingView.hidden = false;
      elements.dashboard.hidden = true;
    }
  } catch (error) {
    setReferenceStatus('Reference manifest failed to load. Uploads will not work until committed data files are served.', 'warning');
    setBanner(error instanceof Error ? error.message : 'Reference manifest failed to load.', 'warning');
    if (!state.model) {
      elements.landingView.hidden = false;
      elements.dashboard.hidden = true;
    }
  }
  setBootState(false);

  if (!window.L) {
    setBanner('Leaflet did not load. The map tab will stay unavailable until the Leaflet script is reachable.', 'warning');
  }
}

void bootstrap();
