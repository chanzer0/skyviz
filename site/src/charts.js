import { clamp, escapeHtml, formatNumber } from './format.js';

function buildTicks(maxValue, segments = 4) {
  return Array.from({ length: segments + 1 }, (_, index) => {
    const value = (maxValue / segments) * index;
    return Number.isFinite(value) ? value : 0;
  });
}

export function renderStackedRibbon(items, options = {}) {
  const rows = items.filter((item) => item.value > 0);
  if (!rows.length) {
    return `<div class="empty-copy">${escapeHtml(options.emptyMessage || 'No distribution available.')}</div>`;
  }
  const total = rows.reduce((sum, item) => sum + item.value, 0) || 1;
  const segments = rows
    .map((item) => {
      const width = (item.value / total) * 100;
      const label = width >= 12 ? `<span>${escapeHtml(item.label)}</span>` : '';
      return `<div class="ribbon-segment" style="width:${width.toFixed(2)}%;--segment-color:${item.color};">${label}</div>`;
    })
    .join('');
  const legend = rows
    .map(
      (item) => `
        <div class="legend-item">
          <span class="legend-swatch" style="background:${item.color};"></span>
          <span>${escapeHtml(item.label)}</span>
          <strong>${formatNumber(item.value)}</strong>
        </div>
      `,
    )
    .join('');
  return `
    <div class="stacked-ribbon">${segments}</div>
    <div class="legend-grid">${legend}</div>
  `;
}

export function renderBarList(items, options = {}) {
  const includeZero = Boolean(options.includeZero);
  const rows = items.filter((item) => {
    if (!Number.isFinite(item.value)) {
      return false;
    }
    return includeZero ? item.value >= 0 : item.value > 0;
  });
  if (!rows.length) {
    return `<div class="empty-copy">${escapeHtml(options.emptyMessage || 'No values available.')}</div>`;
  }
  const explicitMax = Number.isFinite(options.maxValue) ? Number(options.maxValue) : null;
  const maxValue = Math.max(explicitMax ?? Math.max(...rows.map((item) => item.value), 1), 1);
  const valueFormatter = options.valueFormatter || formatNumber;
  return `
    <div class="bar-list">
      ${rows
        .map((item) => {
          const width = clamp((item.value / maxValue) * 100, 0, 100);
          const meta = item.meta ? `<span class="bar-meta">${escapeHtml(item.meta)}</span>` : '';
          return `
            <div class="bar-row">
              <div class="bar-row-head">
                <div>
                  <span class="bar-label">${escapeHtml(item.label)}</span>
                  ${meta}
                </div>
                <strong>${escapeHtml(valueFormatter(item.value))}</strong>
              </div>
              <div class="bar-track">
                <div class="bar-fill" style="width:${width.toFixed(2)}%;--bar-color:${item.color || '#103f6e'};"></div>
              </div>
            </div>
          `;
        })
        .join('')}
    </div>
  `;
}

export function renderColumnChart(items, options = {}) {
  const rows = items.filter((item) => item.value > 0);
  if (!rows.length) {
    return `<div class="empty-copy">${escapeHtml(options.emptyMessage || 'No era data available.')}</div>`;
  }
  const width = 640;
  const height = 260;
  const padding = { top: 18, right: 20, bottom: 50, left: 34 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(...rows.map((item) => item.value), 1);
  const barWidth = plotWidth / rows.length;
  const yTicks = buildTicks(maxValue, 4);
  const labelStep = Math.max(1, Math.ceil(rows.length / 8));

  const grid = yTicks
    .map((value) => {
      const y = padding.top + plotHeight - (value / maxValue) * plotHeight;
      return `
        <g>
          <line x1="${padding.left}" x2="${width - padding.right}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}" class="chart-grid-line"></line>
          <text x="${padding.left - 8}" y="${(y + 4).toFixed(2)}" text-anchor="end" class="chart-tick-label">${escapeHtml(formatNumber(Math.round(value)))}</text>
        </g>
      `;
    })
    .join('');

  const bars = rows
    .map((item, index) => {
      const valueHeight = (item.value / maxValue) * plotHeight;
      const x = padding.left + index * barWidth + 4;
      const y = padding.top + plotHeight - valueHeight;
      const labelX = x + Math.max(barWidth - 8, 10) / 2;
      const showLabel = index % labelStep === 0 || index === rows.length - 1;
      return `
        <g>
          <rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${Math.max(barWidth - 8, 10).toFixed(2)}" height="${valueHeight.toFixed(2)}" rx="9" fill="${item.color || '#147a8a'}"></rect>
          ${showLabel ? `<text x="${labelX.toFixed(2)}" y="${height - 18}" text-anchor="middle" class="chart-axis-label">${escapeHtml(item.shortLabel || item.label)}</text>` : ''}
          <title>${escapeHtml(item.label)}: ${formatNumber(item.value)}</title>
        </g>
      `;
    })
    .join('');

  return `
    <div class="chart-frame">
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="First-flight era distribution">
        ${grid}
        ${bars}
      </svg>
    </div>
  `;
}

export function renderScatterPlot(points, options = {}) {
  const rows = points.filter((point) => point.x > 0 && point.y > 0);
  if (!rows.length) {
    return `<div class="empty-copy">${escapeHtml(options.emptyMessage || 'No performance points available.')}</div>`;
  }
  const width = 640;
  const height = 360;
  const padding = { top: 18, right: 24, bottom: 46, left: 60 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const xMax = Math.max(...rows.map((point) => point.x), 1) * 1.05;
  const yMax = Math.max(...rows.map((point) => point.y), 1) * 1.05;
  const xScale = (value) => padding.left + (value / xMax) * plotWidth;
  const yScale = (value) => padding.top + plotHeight - (value / yMax) * plotHeight;
  const xTicks = buildTicks(xMax, 4);
  const yTicks = buildTicks(yMax, 4);

  const grid = [
    ...xTicks.map((value) => {
      const x = xScale(value);
      return `
        <g>
          <line x1="${x.toFixed(2)}" x2="${x.toFixed(2)}" y1="${padding.top}" y2="${height - padding.bottom}" class="chart-grid-line"></line>
          <text x="${x.toFixed(2)}" y="${height - padding.bottom + 16}" text-anchor="middle" class="chart-tick-label">${escapeHtml(formatNumber(Math.round(value)))}</text>
        </g>
      `;
    }),
    ...yTicks.map((value) => {
      const y = yScale(value);
      return `
        <g>
          <line x1="${padding.left}" x2="${width - padding.right}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}" class="chart-grid-line"></line>
          <text x="${padding.left - 8}" y="${(y + 4).toFixed(2)}" text-anchor="end" class="chart-tick-label">${escapeHtml(formatNumber(Math.round(value)))}</text>
        </g>
      `;
    }),
  ].join('');

  const circles = rows
    .slice()
    .sort((left, right) => left.r - right.r)
    .map((point) => {
      const x = xScale(point.x);
      const y = yScale(point.y);
      const title = `${point.label} | speed ${formatNumber(point.x)} | seats ${formatNumber(point.y)}`;
      return `
        <g>
          <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${clamp(point.r, 3, 11).toFixed(2)}" fill="${point.color}" fill-opacity="0.55"></circle>
          <title>${escapeHtml(title)}</title>
        </g>
      `;
    })
    .join('');

  return `
    <div class="chart-frame">
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Scatter plot of speed and seats">
        ${grid}
        ${circles}
        <text x="${width / 2}" y="${height - 8}" text-anchor="middle" class="chart-axis-label">${escapeHtml(options.xLabel || 'X axis')}</text>
        <text x="22" y="${height / 2}" text-anchor="middle" class="chart-axis-label" transform="rotate(-90 22 ${height / 2})">${escapeHtml(options.yLabel || 'Y axis')}</text>
      </svg>
    </div>
  `;
}

export function renderGeoPlot(points, options = {}) {
  const rows = points.filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lon));
  if (!rows.length) {
    return `<div class="empty-copy">${escapeHtml(options.emptyMessage || 'No airport coordinates available.')}</div>`;
  }
  const width = 640;
  const height = 320;
  const padding = 18;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const xScale = (lon) => padding + ((lon + 180) / 360) * plotWidth;
  const yScale = (lat) => padding + ((90 - lat) / 180) * plotHeight;

  const longitudes = [-120, -60, 0, 60, 120];
  const latitudes = [-60, -30, 0, 30, 60];
  const grid = [
    ...longitudes.map((value) => {
      const x = xScale(value);
      return `<line x1="${x.toFixed(2)}" x2="${x.toFixed(2)}" y1="${padding}" y2="${height - padding}" class="chart-grid-line"></line>`;
    }),
    ...latitudes.map((value) => {
      const y = yScale(value);
      return `<line x1="${padding}" x2="${width - padding}" y1="${y.toFixed(2)}" y2="${y.toFixed(2)}" class="chart-grid-line"></line>`;
    }),
  ].join('');

  const dots = rows
    .map((point) => {
      const x = xScale(point.lon);
      const y = yScale(point.lat);
      return `
        <g>
          <circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="2.6" fill="#ff9657" fill-opacity="0.72"></circle>
          <title>${escapeHtml(point.label)}</title>
        </g>
      `;
    })
    .join('');

  return `
    <div class="chart-frame map-frame">
      <svg viewBox="0 0 ${width} ${height}" class="chart-svg" role="img" aria-label="Unlocked airport footprint map">
        <rect x="${padding}" y="${padding}" width="${plotWidth}" height="${plotHeight}" rx="20" fill="rgba(255, 255, 255, 0.72)"></rect>
        ${grid}
        ${dots}
      </svg>
    </div>
  `;
}
