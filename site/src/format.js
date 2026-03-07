const numberFormatter = new Intl.NumberFormat('en-US');
const compactFormatter = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});
const regionFormatter = typeof Intl.DisplayNames === 'function'
  ? new Intl.DisplayNames(['en'], { type: 'region' })
  : null;

const PLACE_SUBDIVISIONS = {
  AU: {
    ACT: 'Australian Capital Territory',
    NSW: 'New South Wales',
    NT: 'Northern Territory',
    QLD: 'Queensland',
    SA: 'South Australia',
    TAS: 'Tasmania',
    VIC: 'Victoria',
    WA: 'Western Australia',
  },
  CA: {
    AB: 'Alberta',
    BC: 'British Columbia',
    MB: 'Manitoba',
    NB: 'New Brunswick',
    NL: 'Newfoundland and Labrador',
    NS: 'Nova Scotia',
    NT: 'Northwest Territories',
    NU: 'Nunavut',
    ON: 'Ontario',
    PE: 'Prince Edward Island',
    QC: 'Quebec',
    SK: 'Saskatchewan',
    YT: 'Yukon',
  },
  US: {
    AL: 'Alabama',
    AK: 'Alaska',
    AZ: 'Arizona',
    AR: 'Arkansas',
    CA: 'California',
    CO: 'Colorado',
    CT: 'Connecticut',
    DE: 'Delaware',
    FL: 'Florida',
    GA: 'Georgia',
    HI: 'Hawaii',
    ID: 'Idaho',
    IL: 'Illinois',
    IN: 'Indiana',
    IA: 'Iowa',
    KS: 'Kansas',
    KY: 'Kentucky',
    LA: 'Louisiana',
    ME: 'Maine',
    MD: 'Maryland',
    MA: 'Massachusetts',
    MI: 'Michigan',
    MN: 'Minnesota',
    MS: 'Mississippi',
    MO: 'Missouri',
    MT: 'Montana',
    NE: 'Nebraska',
    NV: 'Nevada',
    NH: 'New Hampshire',
    NJ: 'New Jersey',
    NM: 'New Mexico',
    NY: 'New York',
    NC: 'North Carolina',
    ND: 'North Dakota',
    OH: 'Ohio',
    OK: 'Oklahoma',
    OR: 'Oregon',
    PA: 'Pennsylvania',
    RI: 'Rhode Island',
    SC: 'South Carolina',
    SD: 'South Dakota',
    TN: 'Tennessee',
    TX: 'Texas',
    UT: 'Utah',
    VT: 'Vermont',
    VA: 'Virginia',
    WA: 'Washington',
    WV: 'West Virginia',
    WI: 'Wisconsin',
    WY: 'Wyoming',
    DC: 'District of Columbia',
  },
};

export function sanitizeText(value) {
  return String(value ?? '')
    .replace(/Ã‚/g, '')
    .replace(/Â /g, ' ')
    .replace(/Â\u00A0/g, ' ')
    .replace(/Â /g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeHtml(value) {
  return sanitizeText(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? numberFormatter.format(number) : '0';
}

export function formatCompact(value) {
  const number = Number(value);
  return Number.isFinite(number) ? compactFormatter.format(number) : '0';
}

export function formatPercent(value, digits = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return '0%';
  }
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
  return `${formatter.format(number)}%`;
}

export function formatLabel(value) {
  const cleaned = sanitizeText(value).replace(/[_-]+/g, ' ');
  if (!cleaned) {
    return 'Unknown';
  }
  return cleaned
    .split(' ')
    .map((part) => {
      if (!part) {
        return part;
      }
      if (part.length <= 3 && /^[A-Z0-9]+$/.test(part)) {
        return part;
      }
      if (/^[A-Z0-9&/+-]+$/.test(part)) {
        return part.charAt(0) + part.slice(1).toLowerCase();
      }
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(' ');
}

export function formatPlaceCode(value) {
  const cleaned = sanitizeText(value).toUpperCase();
  if (!cleaned) {
    return 'Unknown';
  }

  const [countryCode, subdivisionCode, ...rest] = cleaned.split('-');
  const countryName = regionFormatter?.of(countryCode) || countryCode;
  if (!subdivisionCode) {
    return countryName;
  }

  const trailing = [subdivisionCode, ...rest].join('-');
  const subdivisionName = PLACE_SUBDIVISIONS[countryCode]?.[trailing] || trailing;
  return `${countryName} / ${subdivisionName}`;
}

export function formatDateFromMillis(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return sanitizeText(value) || 'Unknown';
  }
  return new Date(number).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}
