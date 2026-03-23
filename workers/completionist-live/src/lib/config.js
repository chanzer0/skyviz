import {
  DEFAULT_FEED_URL,
  DEFAULT_INITIAL_TILE_DEGREES,
  DEFAULT_MAX_REQUESTS,
  DEFAULT_MIN_TILE_DEGREES,
  DEFAULT_PUBLISH_INTERVAL_SECONDS,
  DEFAULT_REQUEST_DELAY_SECONDS,
  DEFAULT_RUN_RETENTION_HOURS,
  DEFAULT_RUN_LOCK_TIMEOUT_SECONDS,
  DEFAULT_STALE_AFTER_SECONDS,
  DEFAULT_UI_REFRESH_INTERVAL_SECONDS,
  DEFAULT_WORKFLOW_POLL_SECONDS,
} from './constants.js';
import {
  coercePositiveInteger,
  coercePositiveNumber,
  normalizeText,
} from './utils.js';

export function getPipelineSettings(env) {
  const publishIntervalSeconds = coercePositiveInteger(
    env.COMPLETIONIST_PUBLISH_INTERVAL_SECONDS,
    DEFAULT_PUBLISH_INTERVAL_SECONDS,
  );
  return {
    feedUrl: normalizeText(env.COMPLETIONIST_FEED_URL) || DEFAULT_FEED_URL,
    initialTileDegrees: coercePositiveNumber(
      env.COMPLETIONIST_INITIAL_TILE_DEGREES,
      DEFAULT_INITIAL_TILE_DEGREES,
    ),
    minTileDegrees: coercePositiveNumber(
      env.COMPLETIONIST_MIN_TILE_DEGREES,
      DEFAULT_MIN_TILE_DEGREES,
    ),
    maxRequests: coercePositiveInteger(
      env.COMPLETIONIST_MAX_REQUESTS,
      DEFAULT_MAX_REQUESTS,
    ),
    requestDelaySeconds: coercePositiveNumber(
      env.COMPLETIONIST_REQUEST_DELAY_SECONDS,
      DEFAULT_REQUEST_DELAY_SECONDS,
      0,
    ),
    uiRefreshIntervalSeconds: coercePositiveInteger(
      env.COMPLETIONIST_UI_REFRESH_INTERVAL_SECONDS,
      DEFAULT_UI_REFRESH_INTERVAL_SECONDS,
    ),
    publishIntervalSeconds,
    staleAfterSeconds: Math.max(
      publishIntervalSeconds,
      coercePositiveInteger(
        env.COMPLETIONIST_STALE_AFTER_SECONDS,
        DEFAULT_STALE_AFTER_SECONDS,
      ),
    ),
    runLockTimeoutSeconds: coercePositiveInteger(
      env.COMPLETIONIST_RUN_LOCK_TIMEOUT_SECONDS,
      DEFAULT_RUN_LOCK_TIMEOUT_SECONDS,
    ),
    runRetentionHours: coercePositiveInteger(
      env.COMPLETIONIST_RUN_RETENTION_HOURS,
      DEFAULT_RUN_RETENTION_HOURS,
    ),
    workflowPollSeconds: coercePositiveInteger(
      env.COMPLETIONIST_WORKFLOW_POLL_SECONDS,
      DEFAULT_WORKFLOW_POLL_SECONDS,
    ),
  };
}
