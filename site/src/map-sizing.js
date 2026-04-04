function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function parseNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readStoredSizing(storageKey) {
  try {
    const raw = window.localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== 'object') {
      return {};
    }
    return Object.fromEntries(
      Object.entries(parsed)
        .map(([key, value]) => [key, parseNumber(value)])
        .filter(([, value]) => Number.isFinite(value)),
    );
  } catch {
    return {};
  }
}

function writeStoredSizing(storageKey, values) {
  const entries = Object.entries(values || {}).filter(([, value]) => Number.isFinite(value));
  try {
    if (!entries.length) {
      window.localStorage.removeItem(storageKey);
      return;
    }
    window.localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(entries)));
  } catch {
    // Ignore storage failures and keep the live session working.
  }
}

function resolveBound(bound) {
  const value = typeof bound === 'function' ? bound() : bound;
  return Number.isFinite(Number(value)) ? Number(value) : 0;
}

function resolveBounds(field) {
  const min = resolveBound(field.min);
  const max = resolveBound(field.max);
  if (min <= max) {
    return { min, max };
  }
  return { min: max, max: min };
}

function resolveStep(field) {
  const step = resolveBound(field.step);
  return step > 0 ? step : 1;
}

function measureField(field, bounds) {
  const measured = typeof field.measure === 'function' ? parseNumber(field.measure()) : null;
  if (!Number.isFinite(measured)) {
    return bounds.min;
  }
  return clamp(measured, bounds.min, bounds.max);
}

function formatFieldValue(field, value) {
  if (typeof field.formatValue === 'function') {
    return field.formatValue(value);
  }
  return `${Math.round(value)}`;
}

function isFieldAvailable(field, mediaQueryList) {
  return mediaQueryList.matches && (typeof field.isAvailable === 'function' ? field.isAvailable() : true);
}

function normalizeField(field) {
  if (!(field?.input instanceof HTMLInputElement)) {
    return null;
  }
  return {
    ...field,
    container: field.container instanceof HTMLElement ? field.container : null,
    input: field.input,
    output: field.output instanceof HTMLElement ? field.output : null,
  };
}

function updateFieldControlState(field, { available, bounds, value, hasStoredOverride }) {
  const step = resolveStep(field);
  const formattedValue = formatFieldValue(field, value);
  if (field.container instanceof HTMLElement) {
    field.container.hidden = !available;
    field.container.dataset.available = available ? 'true' : 'false';
    field.container.dataset.override = hasStoredOverride ? 'true' : 'false';
  }
  field.input.hidden = !available;
  field.input.disabled = !available;
  field.input.min = `${Math.round(bounds.min)}`;
  field.input.max = `${Math.round(bounds.max)}`;
  field.input.step = `${step}`;
  field.input.value = `${value}`;
  field.input.setAttribute('aria-valuetext', formattedValue);
  if (field.accessibleLabel) {
    field.input.setAttribute('aria-label', field.accessibleLabel);
  }
  field.input.title = `${field.accessibleLabel || 'Map size'}: ${formattedValue}`;
  if (field.output instanceof HTMLElement) {
    field.output.hidden = !available;
    field.output.textContent = formattedValue;
  }
}

export function createDesktopMapResizer({
  storageKey,
  desktopQuery = '(min-width: 1025px)',
  controlsShell = null,
  fields = {},
  resetButton = null,
} = {}) {
  const mediaQueryList = window.matchMedia(desktopQuery);
  const normalizedFields = Object.fromEntries(
    Object.entries(fields || {})
      .map(([key, field]) => [key, normalizeField(field)])
      .filter(([, field]) => field),
  );
  const fieldEntries = Object.entries(normalizedFields);
  const state = {
    previewValues: {},
    storedValues: readStoredSizing(storageKey),
  };

  function hasStoredOverrides() {
    return Object.keys(state.storedValues).length > 0;
  }

  function persist() {
    writeStoredSizing(storageKey, state.storedValues);
    updateControlsState();
  }

  function hasAvailableFields() {
    return fieldEntries.some(([, field]) => isFieldAvailable(field, mediaQueryList));
  }

  function updateControlsState() {
    const available = hasAvailableFields();
    if (controlsShell instanceof HTMLElement) {
      controlsShell.hidden = !available;
    }
    if (resetButton instanceof HTMLButtonElement) {
      resetButton.hidden = !available;
      resetButton.disabled = !hasStoredOverrides();
    }
  }

  function applyLiveFieldValue(key, nextValue, { persistValue = false } = {}) {
    const field = normalizedFields[key];
    if (!field) {
      return null;
    }
    const bounds = resolveBounds(field);
    const resolvedValue = clamp(Number(nextValue) || bounds.min, bounds.min, bounds.max);
    if (typeof field.apply === 'function') {
      field.apply(resolvedValue);
    }
    delete state.previewValues[key];
    if (persistValue) {
      state.storedValues[key] = resolvedValue;
      persist();
    }
    updateFieldControlState(field, {
      available: true,
      bounds,
      value: resolvedValue,
      hasStoredOverride: true,
    });
    return resolvedValue;
  }

  function previewFieldValue(key, nextValue) {
    const field = normalizedFields[key];
    if (!field) {
      return null;
    }
    const bounds = resolveBounds(field);
    const resolvedValue = clamp(Number(nextValue) || bounds.min, bounds.min, bounds.max);
    state.previewValues[key] = resolvedValue;
    updateFieldControlState(field, {
      available: true,
      bounds,
      value: resolvedValue,
      hasStoredOverride: Number.isFinite(parseNumber(state.storedValues[key])),
    });
    return resolvedValue;
  }

  function clearFieldOverride(key) {
    const field = normalizedFields[key];
    if (!field) {
      return;
    }
    delete state.previewValues[key];
    delete state.storedValues[key];
    persist();
    if (typeof field.clear === 'function') {
      field.clear();
    }
    syncField(key);
  }

  function syncField(key) {
    const field = normalizedFields[key];
    if (!field) {
      return;
    }
    const bounds = resolveBounds(field);
    const available = isFieldAvailable(field, mediaQueryList);
    const previewValue = parseNumber(state.previewValues[key]);
    const storedValue = parseNumber(state.storedValues[key]);
    const hasStoredValue = Number.isFinite(storedValue);
    const hasPreviewValue = field.applyOnInput === false && available && Number.isFinite(previewValue);
    const resolvedValue = hasStoredValue ? clamp(storedValue, bounds.min, bounds.max) : measureField(field, bounds);

    if (!available) {
      delete state.previewValues[key];
    }

    if (hasStoredValue && resolvedValue !== storedValue) {
      state.storedValues[key] = resolvedValue;
      writeStoredSizing(storageKey, state.storedValues);
    }

    if (hasPreviewValue) {
      const resolvedPreviewValue = clamp(previewValue, bounds.min, bounds.max);
      state.previewValues[key] = resolvedPreviewValue;
      updateFieldControlState(field, {
        available,
        bounds,
        value: resolvedPreviewValue,
        hasStoredOverride: hasStoredValue,
      });
      return;
    }

    if (!available || !hasStoredValue) {
      if (typeof field.clear === 'function') {
        field.clear();
      }
    }

    if (available && hasStoredValue && typeof field.apply === 'function') {
      field.apply(resolvedValue);
    }

    updateFieldControlState(field, {
      available,
      bounds,
      value: resolvedValue,
      hasStoredOverride: available && hasStoredValue,
    });
  }

  function syncAll() {
    fieldEntries.forEach(([key]) => syncField(key));
    updateControlsState();
  }

  fieldEntries.forEach(([key, field]) => {
    field.input.addEventListener('input', (event) => {
      if (!isFieldAvailable(field, mediaQueryList)) {
        return;
      }
      if (field.applyOnInput === false) {
        previewFieldValue(key, event.currentTarget.value);
        return;
      }
      applyLiveFieldValue(key, event.currentTarget.value, { persistValue: true });
    });

    field.input.addEventListener('change', (event) => {
      if (!isFieldAvailable(field, mediaQueryList)) {
        return;
      }
      if (field.applyOnInput === false) {
        const previewValue = parseNumber(state.previewValues[key]);
        const nextValue = Number.isFinite(previewValue) ? previewValue : event.currentTarget.value;
        applyLiveFieldValue(key, nextValue, { persistValue: true });
      }
    });

    field.input.addEventListener('dblclick', () => {
      clearFieldOverride(key);
    });

    field.input.addEventListener('keydown', (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace' || event.key === 'Escape') {
        event.preventDefault();
        clearFieldOverride(key);
      }
    });
  });

  if (resetButton instanceof HTMLButtonElement) {
    resetButton.addEventListener('click', () => {
      state.storedValues = {};
      persist();
      fieldEntries.forEach(([, field]) => {
        if (typeof field.clear === 'function') {
          field.clear();
        }
      });
      syncAll();
    });
  }

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', syncAll);
  } else if (typeof mediaQueryList.addListener === 'function') {
    mediaQueryList.addListener(syncAll);
  }

  return {
    clearOverrides() {
      state.storedValues = {};
      persist();
      syncAll();
    },
    setFieldValue(key, nextValue, { persistValue = true } = {}) {
      return applyLiveFieldValue(key, nextValue, { persistValue });
    },
    hasStoredOverrides,
    syncAll,
  };
}
