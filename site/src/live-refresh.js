const ABSOLUTE_TIME_FORMATTER = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  timeZoneName: 'short',
});

function pluralize(value, unit) {
  return `${value} ${unit}${value === 1 ? '' : 's'}`;
}

export function formatRefreshDuration(value) {
  const seconds = Math.max(0, Math.floor(Number(value) || 0));
  if (seconds < 5) {
    return 'a few seconds';
  }
  if (seconds < 60) {
    return pluralize(seconds, 'second');
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return pluralize(minutes, 'minute');
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    if (hours < 4 && remainingMinutes > 0) {
      return `${pluralize(hours, 'hour')} ${pluralize(remainingMinutes, 'minute')}`;
    }
    return pluralize(hours, 'hour');
  }
  return pluralize(Math.floor(hours / 24), 'day');
}

export function formatRefreshAbsoluteTime(value) {
  const millis = Number.isFinite(Number(value))
    ? Number(value)
    : Date.parse(String(value || ''));
  if (!Number.isFinite(millis)) {
    return '';
  }
  return ABSOLUTE_TIME_FORMATTER.format(new Date(millis));
}

export function buildLiveRefreshStatus(options = {}) {
  const generatedAtMillis = Number.isFinite(Number(options.generatedAtMillis))
    ? Number(options.generatedAtMillis)
    : Date.parse(String(options.generatedAt || ''));
  const hasData = options.hasData === true || Number.isFinite(generatedAtMillis);
  const loading = options.loading === true;
  const error = String(options.error || '').trim();
  const nextCheckSeconds = Math.max(0, Math.floor(Number(options.nextCheckSeconds) || 0));
  const staleAfterSeconds = Math.max(0, Math.floor(Number(options.staleAfterSeconds) || 0));
  const ageMillis = Number.isFinite(generatedAtMillis)
    ? Math.max(Date.now() - generatedAtMillis, 0)
    : null;
  const isStale = Boolean(
    hasData
      && Number.isFinite(ageMillis)
      && staleAfterSeconds > 0
      && ageMillis > staleAfterSeconds * 1000,
  );

  let primary = 'Waiting for the first update.';
  let secondary = `Next update expected in ${formatRefreshDuration(nextCheckSeconds)}.`;
  let tone = 'default';

  if (!hasData && loading) {
    secondary = 'Checking for the first shared update now.';
    tone = 'loading';
  } else if (!hasData && error) {
    primary = 'Live updates unavailable.';
    secondary = 'Skyviz could not load the shared live data.';
    tone = 'error';
  } else if (hasData) {
    primary = `Last updated ${formatRefreshDuration((ageMillis || 0) / 1000)} ago.`;
    secondary = loading
      ? 'Checking for a newer update now.'
      : `Next update expected in ${formatRefreshDuration(nextCheckSeconds)}.`;
    if (isStale) {
      secondary = `${secondary} This feed looks stale.`;
      tone = 'warning';
    } else if (loading) {
      tone = 'loading';
    }
    if (error && !loading) {
      secondary = `${secondary} Last check failed.`;
    }
  }

  const absoluteTime = formatRefreshAbsoluteTime(generatedAtMillis);
  return {
    absoluteTime,
    ageMillis,
    hasData,
    isStale,
    loading,
    primary,
    secondary,
    title: absoluteTime ? `Generated ${absoluteTime}` : '',
    tone,
  };
}

export function applyLiveRefreshStatus(targets, status) {
  const card = targets?.card || null;
  const primary = targets?.primary || null;
  const secondary = targets?.secondary || null;
  if (primary) {
    primary.textContent = status?.primary || '';
  }
  if (secondary) {
    secondary.textContent = status?.secondary || '';
  }
  if (!card) {
    return;
  }
  card.dataset.tone = status?.tone || 'default';
  card.setAttribute('aria-busy', status?.loading ? 'true' : 'false');
  if (status?.title) {
    card.title = status.title;
  } else {
    card.removeAttribute('title');
  }
}
