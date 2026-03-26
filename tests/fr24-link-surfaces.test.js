import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const completionistSource = fs.readFileSync(new URL('../site/src/main.js', import.meta.url), 'utf8');
const dailyMissionsSource = fs.readFileSync(new URL('../site/src/daily-missions-main.js', import.meta.url), 'utf8');

test('completionist FR24 anchors use the live-flight helper data attributes', () => {
  assert.match(completionistSource, /data-fr24-link="live-flight"/);
  assert.match(completionistSource, /data-fr24-lookup-kind=/);
  assert.match(completionistSource, /data-fr24-lookup-value=/);
});

test('live-flight Open in FR24 anchors no longer force a new tab', () => {
  assert.match(completionistSource, /Open in FR24/);
  assert.match(dailyMissionsSource, /Open in FR24/);
  assert.doesNotMatch(completionistSource, /Open in FR24[\s\S]{0,240}target="_blank"/);
  assert.doesNotMatch(dailyMissionsSource, /Open in FR24[\s\S]{0,240}target="_blank"/);
});
