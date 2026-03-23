import {
  HEALTH_ROUTE,
  LIVE_MANIFEST_ROUTE,
  LIVE_RUNS_ROUTE_PREFIX,
  WORKER_NAME,
} from './constants.js';
import { stringifyJson } from './utils.js';

const CORS_HEADERS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,HEAD,OPTIONS',
  'access-control-allow-headers': 'content-type',
};

export function applyCorsHeaders(headers) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    headers.set(key, value);
  });
  return headers;
}

export function jsonResponse(payload, init = {}) {
  const headers = applyCorsHeaders(new Headers(init.headers || {}));
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json; charset=utf-8');
  }
  return new Response(stringifyJson(payload), {
    ...init,
    headers,
  });
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: applyCorsHeaders(new Headers()),
  });
}

export async function r2JsonResponse(object, init = {}) {
  if (!object) {
    return jsonResponse({ ok: false, error: 'Not found' }, { status: 404 });
  }
  const headers = applyCorsHeaders(new Headers(init.headers || {}));
  headers.set('content-type', 'application/json; charset=utf-8');
  if (init.cacheControl) {
    headers.set('cache-control', init.cacheControl);
  }
  return new Response(object.body, {
    status: init.status || 200,
    headers,
  });
}

export function isLiveRequestPath(pathname) {
  return pathname === LIVE_MANIFEST_ROUTE || pathname.startsWith(LIVE_RUNS_ROUTE_PREFIX);
}

export function buildRootStatus(origin) {
  return {
    ok: true,
    worker: WORKER_NAME,
    healthUrl: `${origin}${HEALTH_ROUTE}`,
    manifestUrl: `${origin}${LIVE_MANIFEST_ROUTE}`,
  };
}
