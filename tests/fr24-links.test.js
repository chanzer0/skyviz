import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildFr24AndroidIntentUrl,
  buildFr24Lookup,
  buildFr24WebUrl,
  detectFr24MobilePlatform,
  resolveFr24OpenPlan,
} from '../site/src/fr24-links.js';

test('buildFr24Lookup prefers registration', () => {
  assert.deepEqual(
    buildFr24Lookup({
      registration: 'n123ab',
      callsign: 'UAL42',
      flightNumber: 'UA42',
    }),
    { kind: 'registration', value: 'N123AB' },
  );
});

test('buildFr24Lookup falls back to callsign, flight number, then hex', () => {
  assert.deepEqual(
    buildFr24Lookup({ callsign: 'ual 42' }),
    { kind: 'callsign', value: 'UAL42' },
  );
  assert.deepEqual(
    buildFr24Lookup({ flightNumber: 'ua 42' }),
    { kind: 'flight_number', value: 'UA42' },
  );
  assert.deepEqual(
    buildFr24Lookup({ aircraftHex: ' a4b123 ' }),
    { kind: 'hex', value: 'a4b123' },
  );
});

test('buildFr24WebUrl uses the apex host and live lookup path', () => {
  assert.equal(
    buildFr24WebUrl({ registration: 'N123AB' }),
    'https://flightradar24.com/N123AB',
  );
  assert.equal(
    buildFr24WebUrl({ aircraftHex: 'A4B123' }),
    'https://flightradar24.com/?icao=a4b123',
  );
});

test('detectFr24MobilePlatform identifies ios and android user agents', () => {
  assert.equal(
    detectFr24MobilePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X)'),
    'ios',
  );
  assert.equal(
    detectFr24MobilePlatform('Mozilla/5.0 (Linux; Android 15; Pixel 8)'),
    'android',
  );
  assert.equal(
    detectFr24MobilePlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'),
    'other',
  );
});

test('resolveFr24OpenPlan uses app paths for supported mobile lookups', () => {
  assert.deepEqual(
    resolveFr24OpenPlan(
      { registration: 'N123AB' },
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X)',
    ),
    {
      lookupKind: 'registration',
      lookupValue: 'N123AB',
      platform: 'ios',
      mode: 'ios-app-scheme',
      webUrl: 'https://flightradar24.com/N123AB',
      appUrl: 'fr24://N123AB',
    },
  );

  const androidPlan = resolveFr24OpenPlan(
    { callsign: 'UAL42' },
    'Mozilla/5.0 (Linux; Android 15; Pixel 8)',
  );
  assert.equal(androidPlan.platform, 'android');
  assert.equal(androidPlan.mode, 'android-intent');
  assert.equal(androidPlan.lookupKind, 'callsign');
  assert.equal(androidPlan.lookupValue, 'UAL42');
  assert.equal(androidPlan.webUrl, 'https://flightradar24.com/UAL42');
  assert.equal(androidPlan.appUrl, buildFr24AndroidIntentUrl({ callsign: 'UAL42' }));
});

test('resolveFr24OpenPlan keeps hex-only lookups on web fallback', () => {
  assert.deepEqual(
    resolveFr24OpenPlan(
      { aircraftHex: 'A4B123' },
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_3 like Mac OS X)',
    ),
    {
      lookupKind: 'hex',
      lookupValue: 'a4b123',
      platform: 'ios',
      mode: 'web',
      webUrl: 'https://flightradar24.com/?icao=a4b123',
      appUrl: null,
    },
  );
});
