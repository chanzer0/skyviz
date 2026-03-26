import { escapeHtml, sanitizeText } from './format.js?v=20260325-aircraft-markers-1';

export const AIRCRAFT_MARKER_URL_TEMPLATE = 'https://www.skydex.info/img/markers/{icao}.png';

let nextResolverId = 1;
const markerResolversById = new Map();

function registerGlobalMarkerErrorHandler() {
  if (typeof window !== 'object') {
    return;
  }
  window.__skyvizAircraftMarkerError = (resolverId, typeCode) => {
    const resolver = markerResolversById.get(String(resolverId || ''));
    resolver?.markMissing(typeCode);
  };
}

function serializeStyleMap(styleMap = {}) {
  return Object.entries(styleMap)
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${key}:${String(value)}`)
    .join(';');
}

export function normalizeAircraftTypeCode(value) {
  return sanitizeText(value).toUpperCase();
}

export function normalizeAircraftRegistration(value) {
  return sanitizeText(value).toUpperCase().replace(/\s+/g, '');
}

export function createAircraftMarkerAssetResolver(options = {}) {
  const assetStatusByTypeCode = options.assetStatusByTypeCode instanceof Map
    ? options.assetStatusByTypeCode
    : new Map();
  const onAssetStatusChange = typeof options.onAssetStatusChange === 'function'
    ? options.onAssetStatusChange
    : null;
  const urlTemplate = sanitizeText(options.urlTemplate) || AIRCRAFT_MARKER_URL_TEMPLATE;
  const resolverId = `resolver-${nextResolverId++}`;

  function notifyAssetStatusChange() {
    onAssetStatusChange?.();
  }

  function buildMarkerUrl(typeCode) {
    const cleanedTypeCode = normalizeAircraftTypeCode(typeCode);
    if (!cleanedTypeCode) {
      return '';
    }
    return urlTemplate.replace('{icao}', encodeURIComponent(cleanedTypeCode));
  }

  function markMissing(typeCode) {
    const cleanedTypeCode = normalizeAircraftTypeCode(typeCode);
    if (!cleanedTypeCode) {
      return;
    }
    if (assetStatusByTypeCode.get(cleanedTypeCode) === 'missing') {
      return;
    }
    assetStatusByTypeCode.set(cleanedTypeCode, 'missing');
    notifyAssetStatusChange();
  }

  function resolveMarkerUrl(typeCode) {
    const cleanedTypeCode = normalizeAircraftTypeCode(typeCode);
    if (!cleanedTypeCode) {
      return '';
    }
    const existingStatus = assetStatusByTypeCode.get(cleanedTypeCode);
    if (existingStatus === 'missing') {
      return '';
    }
    const markerUrl = buildMarkerUrl(cleanedTypeCode);
    if (!existingStatus && typeof window.Image === 'function') {
      assetStatusByTypeCode.set(cleanedTypeCode, 'loading');
      const image = new window.Image();
      image.onload = () => {
        assetStatusByTypeCode.set(cleanedTypeCode, 'ready');
      };
      image.onerror = () => {
        markMissing(cleanedTypeCode);
      };
      image.src = markerUrl;
    }
    return markerUrl;
  }

  const resolver = {
    resolverId,
    assetStatusByTypeCode,
    buildMarkerUrl,
    markMissing,
    resolveMarkerUrl,
  };
  markerResolversById.set(resolverId, resolver);
  registerGlobalMarkerErrorHandler();
  return resolver;
}

export function getAircraftMarkerMetrics(zoomValue, options = {}) {
  const zoom = Number(zoomValue);
  const safeZoom = Math.max(
    Number(options.minZoom) || 2,
    Math.min(Number(options.maxZoom) || 8, Number.isFinite(zoom) ? zoom : (Number(options.fallbackZoom) || 2)),
  );
  const baseSize = Number(options.baseSize) || 16;
  const zoomStep = Number(options.zoomStep) || 3;
  const selectedSizeBoost = Number(options.selectedSizeBoost) || 4;
  const markerSize = Math.round(baseSize + ((safeZoom - (Number(options.minZoom) || 2)) * zoomStep)) + (options.isSelected ? selectedSizeBoost : 0);
  return {
    markerSize,
    markerRingInset: Math.max(Number(options.minRingInset) || 4, Math.round(markerSize * (Number(options.ringInsetRatio) || 0.18))),
    markerFallbackInset: Math.max(Number(options.minFallbackInset) || 4, Math.round(markerSize * (Number(options.fallbackInsetRatio) || 0.2))),
    popupOffset: Math.max(Number(options.minPopupOffset) || 12, Math.round(markerSize * (Number(options.popupOffsetRatio) || 0.45))),
  };
}

export function buildAircraftMarkerHtml(options = {}) {
  const rootClassName = sanitizeText(options.rootClassName) || 'skyviz-aircraft-marker';
  const imageClassName = sanitizeText(options.imageClassName) || `${rootClassName}-image`;
  const fallbackClassName = sanitizeText(options.fallbackClassName) || `${rootClassName}-fallback`;
  const classNames = Array.isArray(options.classNames)
    ? options.classNames.map((value) => sanitizeText(value)).filter(Boolean)
    : [];
  const metrics = options.metrics || getAircraftMarkerMetrics(options.zoomValue, { isSelected: options.isSelected });
  const markerUrl = sanitizeText(options.markerUrl);
  const fallbackLabel = sanitizeText(options.fallbackLabel).slice(0, 3) || 'FLT';
  const resolverId = sanitizeText(options.resolverId);
  const typeCode = normalizeAircraftTypeCode(options.typeCode);
  const rotation = Number.isFinite(Number(options.rotation)) ? Number(options.rotation) : 0;
  const classTokens = [rootClassName, ...classNames];
  if (options.isSelected) {
    classTokens.push('is-selected');
  }
  if (!markerUrl) {
    classTokens.push('is-fallback');
  }
  const styleText = serializeStyleMap({
    '--aircraft-marker-size': `${metrics.markerSize}px`,
    '--aircraft-marker-ring-inset': `${metrics.markerRingInset}px`,
    '--aircraft-marker-fallback-inset': `${metrics.markerFallbackInset}px`,
    ...(options.styleMap || {}),
  });
  const imageMarkup = markerUrl
    ? `
      <img
        class="${escapeHtml(imageClassName)}"
        src="${escapeHtml(markerUrl)}"
        alt=""
        loading="lazy"
        data-resolver-id="${escapeHtml(resolverId)}"
        data-type-code="${escapeHtml(typeCode)}"
        style="transform: rotate(${rotation}deg);"
        onerror="window.__skyvizAircraftMarkerError?.(this.dataset.resolverId, this.dataset.typeCode); this.closest('.${rootClassName}')?.classList.add('is-fallback'); this.remove()"
      >
    `
    : '';
  return `
    <div class="${escapeHtml(classTokens.join(' '))}" style="${escapeHtml(styleText)}">
      ${imageMarkup}
      <span class="${escapeHtml(fallbackClassName)}">${escapeHtml(fallbackLabel)}</span>
      ${options.overlayHtml || ''}
    </div>
  `;
}

export function buildLeafletAircraftMarkerIcon(options = {}) {
  const leaflet = options.leaflet;
  if (!leaflet) {
    throw new Error('Leaflet instance is required to build a marker icon.');
  }
  const metrics = options.metrics || getAircraftMarkerMetrics(options.zoomValue, { isSelected: options.isSelected });
  return leaflet.divIcon({
    className: sanitizeText(options.shellClassName),
    html: options.html || '',
    iconSize: [metrics.markerSize, metrics.markerSize],
    iconAnchor: [Math.round(metrics.markerSize / 2), Math.round(metrics.markerSize / 2)],
    popupAnchor: [0, -metrics.popupOffset],
  });
}
