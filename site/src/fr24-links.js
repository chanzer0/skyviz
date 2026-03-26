const FR24_CANONICAL_WEB_BASE_URL = 'https://flightradar24.com';
const FR24_ANDROID_PACKAGE_NAME = 'com.flightradar24free';

function cleanText(value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function collapseLookupValue(value) {
  return cleanText(value).replaceAll(/\s+/g, '');
}

function normalizeLookupKind(value) {
  const text = cleanText(value).toLowerCase();
  if (text === 'registration' || text === 'callsign' || text === 'flight_number' || text === 'hex') {
    return text;
  }
  return '';
}

function normalizeLookupValue(kind, value) {
  const collapsed = collapseLookupValue(value);
  if (!collapsed) {
    return '';
  }
  if (kind === 'hex') {
    return collapsed.toLowerCase();
  }
  return collapsed.toUpperCase();
}

function lookupFromExplicitFields(input) {
  const normalizedKind = normalizeLookupKind(input?.kind || input?.fr24LookupKind);
  const normalizedValue = normalizeLookupValue(normalizedKind, input?.value || input?.fr24LookupValue);
  if (!normalizedKind || !normalizedValue) {
    return null;
  }
  return {
    kind: normalizedKind,
    value: normalizedValue,
  };
}

export function buildFr24Lookup(input) {
  const explicit = lookupFromExplicitFields(input);
  if (explicit) {
    return explicit;
  }

  const registration = normalizeLookupValue('registration', input?.registration);
  if (registration) {
    return { kind: 'registration', value: registration };
  }

  const callsign = normalizeLookupValue('callsign', input?.callsign);
  if (callsign) {
    return { kind: 'callsign', value: callsign };
  }

  const flightNumber = normalizeLookupValue('flight_number', input?.flightNumber);
  if (flightNumber) {
    return { kind: 'flight_number', value: flightNumber };
  }

  const aircraftHex = normalizeLookupValue('hex', input?.aircraftHex);
  if (aircraftHex) {
    return { kind: 'hex', value: aircraftHex };
  }

  return null;
}

export function buildFr24WebUrl(input) {
  const lookup = input?.kind ? input : buildFr24Lookup(input);
  if (!lookup) {
    return `${FR24_CANONICAL_WEB_BASE_URL}/`;
  }
  if (lookup.kind === 'hex') {
    return `${FR24_CANONICAL_WEB_BASE_URL}/?icao=${encodeURIComponent(lookup.value)}`;
  }
  return `${FR24_CANONICAL_WEB_BASE_URL}/${encodeURIComponent(lookup.value)}`;
}

export function buildFr24IosAppUrl(input) {
  const lookup = input?.kind ? input : buildFr24Lookup(input);
  if (!lookup || lookup.kind === 'hex') {
    return null;
  }
  return `fr24://${encodeURIComponent(lookup.value)}`;
}

export function buildFr24AndroidIntentUrl(input) {
  const lookup = input?.kind ? input : buildFr24Lookup(input);
  if (!lookup || lookup.kind === 'hex') {
    return null;
  }
  const webUrl = buildFr24WebUrl(lookup);
  return (
    `intent://flightradar24.com/${encodeURIComponent(lookup.value)}`
    + `#Intent;scheme=https;package=${FR24_ANDROID_PACKAGE_NAME};`
    + `S.browser_fallback_url=${encodeURIComponent(webUrl)};end`
  );
}

export function detectFr24MobilePlatform(userAgent = '') {
  const text = String(userAgent || '').toLowerCase();
  if (/android/.test(text)) {
    return 'android';
  }
  if (/iphone|ipad|ipod/.test(text)) {
    return 'ios';
  }
  return 'other';
}

export function resolveFr24OpenPlan(input, userAgent = '') {
  const lookup = buildFr24Lookup(input);
  const webUrl = buildFr24WebUrl(lookup);
  const platform = detectFr24MobilePlatform(userAgent);

  if (platform === 'ios') {
    const appUrl = buildFr24IosAppUrl(lookup);
    return {
      lookupKind: lookup?.kind || null,
      lookupValue: lookup?.value || null,
      platform,
      mode: appUrl ? 'ios-app-scheme' : 'web',
      webUrl,
      appUrl,
    };
  }

  if (platform === 'android') {
    const appUrl = buildFr24AndroidIntentUrl(lookup);
    return {
      lookupKind: lookup?.kind || null,
      lookupValue: lookup?.value || null,
      platform,
      mode: appUrl ? 'android-intent' : 'web',
      webUrl,
      appUrl,
    };
  }

  return {
    lookupKind: lookup?.kind || null,
    lookupValue: lookup?.value || null,
    platform,
    mode: 'web',
    webUrl,
    appUrl: null,
  };
}

function shouldInterceptForMobile(event, windowObj) {
  if (event.defaultPrevented) {
    return false;
  }
  if (event.button !== 0) {
    return false;
  }
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return false;
  }
  return detectFr24MobilePlatform(windowObj.navigator?.userAgent || '') !== 'other';
}

function buildAnchorInput(anchor) {
  return {
    kind: anchor.dataset.fr24LookupKind,
    value: anchor.dataset.fr24LookupValue,
    registration: anchor.dataset.fr24Registration,
    callsign: anchor.dataset.fr24Callsign,
    flightNumber: anchor.dataset.fr24FlightNumber,
    aircraftHex: anchor.dataset.fr24Hex,
  };
}

export function openFr24FromUserGesture(input, options = {}) {
  const windowObj = options.window || window;
  const documentObj = options.document || document;
  const fallbackDelayMs = Number.isFinite(options.fallbackDelayMs) ? options.fallbackDelayMs : 900;
  const plan = resolveFr24OpenPlan(input, windowObj.navigator?.userAgent || '');

  if (plan.mode === 'ios-app-scheme' && plan.appUrl) {
    let fallbackTimer = 0;
    const cleanup = () => {
      if (fallbackTimer) {
        windowObj.clearTimeout(fallbackTimer);
        fallbackTimer = 0;
      }
      documentObj.removeEventListener('visibilitychange', onVisibilityChange, true);
      windowObj.removeEventListener('pagehide', onPageHide, true);
    };
    const onVisibilityChange = () => {
      if (documentObj.hidden) {
        cleanup();
      }
    };
    const onPageHide = () => {
      cleanup();
    };
    documentObj.addEventListener('visibilitychange', onVisibilityChange, true);
    windowObj.addEventListener('pagehide', onPageHide, true);
    fallbackTimer = windowObj.setTimeout(() => {
      cleanup();
      if (!documentObj.hidden) {
        windowObj.location.assign(plan.webUrl);
      }
    }, fallbackDelayMs);
    windowObj.location.assign(plan.appUrl);
    return plan;
  }

  if (plan.mode === 'android-intent' && plan.appUrl) {
    windowObj.location.assign(plan.appUrl);
    return plan;
  }

  windowObj.location.assign(plan.webUrl);
  return plan;
}

export function handleFr24LiveFlightAnchorClick(event, anchor, options = {}) {
  const targetAnchor = anchor instanceof HTMLAnchorElement
    ? anchor
    : (event.target instanceof Element ? event.target.closest('a[data-fr24-link="live-flight"]') : null);
  const windowObj = options.window || window;
  if (!(targetAnchor instanceof HTMLAnchorElement)) {
    return false;
  }
  if (!shouldInterceptForMobile(event, windowObj)) {
    return false;
  }
  event.preventDefault();
  openFr24FromUserGesture(buildAnchorInput(targetAnchor), options);
  return true;
}
