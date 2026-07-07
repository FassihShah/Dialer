/** Country descriptor used for phone normalization during CSV import. */
export interface Country {
  name: string;
  code: string;   // ISO 3166-1 alpha-2
  dialCode: string; // E.164 prefix, e.g. "+92"
  localPrefix: string; // trunk prefix dialled locally, e.g. "0" (empty string if none)
}

export const COUNTRIES: Country[] = [
  { name: 'Afghanistan',    code: 'AF', dialCode: '+93',  localPrefix: '0' },
  { name: 'Australia',      code: 'AU', dialCode: '+61',  localPrefix: '0' },
  { name: 'Bahrain',        code: 'BH', dialCode: '+973', localPrefix: ''  },
  { name: 'Bangladesh',     code: 'BD', dialCode: '+880', localPrefix: '0' },
  { name: 'Canada',         code: 'CA', dialCode: '+1',   localPrefix: ''  },
  { name: 'China',          code: 'CN', dialCode: '+86',  localPrefix: '0' },
  { name: 'Egypt',          code: 'EG', dialCode: '+20',  localPrefix: '0' },
  { name: 'France',         code: 'FR', dialCode: '+33',  localPrefix: '0' },
  { name: 'Germany',        code: 'DE', dialCode: '+49',  localPrefix: '0' },
  { name: 'India',          code: 'IN', dialCode: '+91',  localPrefix: '0' },
  { name: 'Indonesia',      code: 'ID', dialCode: '+62',  localPrefix: '0' },
  { name: 'Iran',           code: 'IR', dialCode: '+98',  localPrefix: '0' },
  { name: 'Iraq',           code: 'IQ', dialCode: '+964', localPrefix: '0' },
  { name: 'Ireland',        code: 'IE', dialCode: '+353', localPrefix: '0' },
  { name: 'Italy',          code: 'IT', dialCode: '+39',  localPrefix: '0' },
  { name: 'Jordan',         code: 'JO', dialCode: '+962', localPrefix: '0' },
  { name: 'Kenya',          code: 'KE', dialCode: '+254', localPrefix: '0' },
  { name: 'Kuwait',         code: 'KW', dialCode: '+965', localPrefix: ''  },
  { name: 'Lebanon',        code: 'LB', dialCode: '+961', localPrefix: '0' },
  { name: 'Malaysia',       code: 'MY', dialCode: '+60',  localPrefix: '0' },
  { name: 'Mexico',         code: 'MX', dialCode: '+52',  localPrefix: ''  },
  { name: 'Morocco',        code: 'MA', dialCode: '+212', localPrefix: '0' },
  { name: 'Netherlands',    code: 'NL', dialCode: '+31',  localPrefix: '0' },
  { name: 'New Zealand',    code: 'NZ', dialCode: '+64',  localPrefix: '0' },
  { name: 'Nigeria',        code: 'NG', dialCode: '+234', localPrefix: '0' },
  { name: 'Oman',           code: 'OM', dialCode: '+968', localPrefix: ''  },
  { name: 'Pakistan',       code: 'PK', dialCode: '+92',  localPrefix: '0' },
  { name: 'Philippines',    code: 'PH', dialCode: '+63',  localPrefix: '0' },
  { name: 'Qatar',          code: 'QA', dialCode: '+974', localPrefix: ''  },
  { name: 'Russia',         code: 'RU', dialCode: '+7',   localPrefix: '8' },
  { name: 'Saudi Arabia',   code: 'SA', dialCode: '+966', localPrefix: '0' },
  { name: 'Singapore',      code: 'SG', dialCode: '+65',  localPrefix: ''  },
  { name: 'South Africa',   code: 'ZA', dialCode: '+27',  localPrefix: '0' },
  { name: 'South Korea',    code: 'KR', dialCode: '+82',  localPrefix: '0' },
  { name: 'Spain',          code: 'ES', dialCode: '+34',  localPrefix: ''  },
  { name: 'Sri Lanka',      code: 'LK', dialCode: '+94',  localPrefix: '0' },
  { name: 'Sweden',         code: 'SE', dialCode: '+46',  localPrefix: '0' },
  { name: 'Switzerland',    code: 'CH', dialCode: '+41',  localPrefix: '0' },
  { name: 'Syria',          code: 'SY', dialCode: '+963', localPrefix: '0' },
  { name: 'Thailand',       code: 'TH', dialCode: '+66',  localPrefix: '0' },
  { name: 'Turkey',         code: 'TR', dialCode: '+90',  localPrefix: '0' },
  { name: 'UAE',            code: 'AE', dialCode: '+971', localPrefix: '0' },
  { name: 'Uganda',         code: 'UG', dialCode: '+256', localPrefix: '0' },
  { name: 'United Kingdom', code: 'GB', dialCode: '+44',  localPrefix: '0' },
  { name: 'United States',  code: 'US', dialCode: '+1',   localPrefix: ''  },
  { name: 'Vietnam',        code: 'VN', dialCode: '+84',  localPrefix: '0' },
  { name: 'Yemen',          code: 'YE', dialCode: '+967', localPrefix: '0' },
];

/**
 * Normalize a single raw phone string to E.164, using the country's dial code
 * and local trunk prefix (e.g. "0" in Pakistan).
 *
 * Resolution order:
 *  1. Already E.164 (+...): clean digits, return.
 *  2. International "00" prefix: strip 00, return as +.
 *  3. Digits start with the dial code itself (country code without +):
 *     e.g. "923001234567" for PK → "+923001234567".
 *  4. Local trunk prefix present (e.g. "03001234567" for PK): strip, prepend dialCode.
 *  5. Fallback: just prepend dialCode.
 */
export function normalizePhoneWithCountry(
  raw: string | null | undefined,
  dialCode: string,
  localPrefix: string,
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('+')) return '+' + trimmed.replace(/[^\d]/g, '');

  const digits = trimmed.replace(/[^\d]/g, '');
  if (!digits) return null;

  if (trimmed.startsWith('00')) return '+' + digits.slice(2);

  const dialDigits = dialCode.replace(/\D/g, '');

  // Already contains country code (without +), e.g. "923001234567"
  if (dialDigits && digits.startsWith(dialDigits) && digits.length > dialDigits.length + 4) {
    return '+' + digits;
  }

  // Has local trunk prefix (0, 8, etc.)
  const localPrefixDigits = localPrefix.replace(/\D/g, '');
  if (localPrefixDigits && digits.startsWith(localPrefixDigits)) {
    return dialCode + digits.slice(localPrefixDigits.length);
  }

  return dialCode + digits;
}

/**
 * Parse a raw cell value that may contain multiple phone numbers separated by
 * commas, semicolons, slashes, pipes, or newlines. Each number is normalized
 * with the given country. Invalid/non-E.164 results are discarded.
 * Returns a deduplicated array, primary number first.
 */
export function parsePhoneList(
  raw: string | null | undefined,
  dialCode: string,
  localPrefix: string,
): string[] {
  if (!raw) return [];
  const parts = raw.split(/[,;\/|\n\r]+/).map((s) => s.trim()).filter(Boolean);
  const seen = new Set<string>();
  const result: string[] = [];
  for (const p of parts) {
    const n = normalizePhoneWithCountry(p, dialCode, localPrefix);
    if (n && isE164(n) && !seen.has(n)) { seen.add(n); result.push(n); }
  }
  return result;
}

// ── Shared utilities (also used server-side) ──────────────────────────────────

/**
 * Normalize a raw phone string to E.164 (legacy helper, no country context).
 * Falls back to +92 prefix for local Pakistani numbers.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const hasPlus = trimmed.startsWith('+');
  let digits = trimmed.replace(/[^\d]/g, '');

  if (!digits) return null;

  if (hasPlus) return '+' + digits;
  if (digits.startsWith('00')) return '+' + digits.slice(2);
  if (digits.startsWith('0')) return '+92' + digits.slice(1);
  return '+' + digits;
}

export function isE164(num: string | null | undefined): boolean {
  if (!num) return false;
  return /^\+[1-9]\d{6,14}$/.test(num);
}

/** Normalize email: lowercase + trim */
export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const n = raw.trim().toLowerCase();
  return n || null;
}
