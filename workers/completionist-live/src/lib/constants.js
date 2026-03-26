export const WORKER_NAME = 'skyviz-completionist-live';
export const COORDINATOR_NAME = 'completionist-live-coordinator';

export const DEFAULT_FEED_URL = 'https://data-cloud.flightradar24.com/zones/fcgi/feed.js';
export const DEFAULT_INITIAL_TILE_DEGREES = 60.0;
export const DEFAULT_MIN_TILE_DEGREES = 7.5;
export const DEFAULT_MAX_REQUESTS = 96;
export const DEFAULT_REQUEST_DELAY_SECONDS = 0.2;
export const DEFAULT_UI_REFRESH_INTERVAL_SECONDS = 60;
export const DEFAULT_PUBLISH_INTERVAL_SECONDS = 300;
export const DEFAULT_STALE_AFTER_SECONDS = 900;
export const DEFAULT_RUN_LOCK_TIMEOUT_SECONDS = 1800;
export const DEFAULT_WORKFLOW_POLL_SECONDS = 10;
export const DEFAULT_RUN_RETENTION_HOURS = 72;

export const FEED_CAP_THRESHOLD = 1500;
export const TILE_LEASE_WINDOW_MS = 120000;
export const MAX_TILE_RETRY_ATTEMPTS = 5;

export const LIVE_ROUTE_PREFIX = '/live';
export const LIVE_MANIFEST_ROUTE = `${LIVE_ROUTE_PREFIX}/completionist-manifest.json`;
export const LIVE_RUNS_ROUTE_PREFIX = `${LIVE_ROUTE_PREFIX}/runs/`;
export const HEALTH_ROUTE = '/health';

export const CURRENT_MANIFEST_KEY = 'live/current/completionist-manifest.json';

export const SNAPSHOT_FIELDS = [
  'flightId',
  'aircraftHex',
  'lat',
  'lon',
  'track',
  'altitude',
  'speed',
  'typeCode',
  'registration',
  'seenAt',
  'origin',
  'destination',
  'flightNumber',
  'callsign',
];

export const DEFAULT_FEED_PARAMS = {
  faa: '1',
  satellite: '1',
  mlat: '1',
  flarm: '1',
  adsb: '1',
  air: '1',
  gnd: '0',
  vehicles: '0',
  estimated: '1',
  maxage: '14400',
  gliders: '1',
  stats: '1',
  limit: '5000',
};

export const REQUEST_HEADERS = {
  accept: 'application/json',
  'accept-language': 'en-US,en;q=0.9',
  'cache-control': 'max-age=0',
  origin: 'https://flightradar24.com',
  referer: 'https://flightradar24.com/',
  'sec-fetch-dest': 'empty',
  'sec-fetch-mode': 'cors',
  'sec-fetch-site': 'same-site',
  'user-agent': (
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) '
    + 'AppleWebKit/537.36 (KHTML, like Gecko) '
    + 'Chrome/145.0.0.0 Safari/537.36'
  ),
};
