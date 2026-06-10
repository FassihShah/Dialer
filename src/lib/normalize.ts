import { parsePhoneNumberFromString } from "libphonenumber-js";

export function normalizeEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();
  return value || null;
}

export function normalizePhone(phone?: string | null, country?: string | null) {
  const raw = phone?.trim();
  if (!raw) return null;
  const parsed = parsePhoneNumberFromString(raw, country as never);
  if (parsed?.isValid()) return parsed.number;

  const hasPlus = raw.startsWith("+");
  const digits = raw.replace(/[^\d]/g, "");
  if (!digits) return null;
  if (hasPlus) return `+${digits}`;
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("0")) return `+92${digits.slice(1)}`;
  return `+${digits}`;
}

export function splitName(fullName: string) {
  const parts = fullName.trim().split(/\s+/);
  return {
    firstName: parts[0] || null,
    lastName: parts.length > 1 ? parts.slice(1).join(" ") : null,
  };
}
