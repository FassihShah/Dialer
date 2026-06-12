/**
 * Normalize a raw phone string to E.164.
 * Returns null if the input is empty.
 * Preserves leading '+', strips all non-digit chars,
 * then handles common local-number prefixes.
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
  // local PK prefix — same fallback as original Base44 implementation
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
