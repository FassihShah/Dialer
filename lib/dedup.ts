import { db } from './db';
import { normalizePhone, normalizeEmail } from './phone';

/**
 * Check if a phone or email already exists within a workspace's leads
 * (deduplication is scoped per workspace/tenant).
 */
export async function isDuplicate(workspaceId: string | null, phone?: string | null, email?: string | null): Promise<boolean> {
  const nPhone = normalizePhone(phone);
  const nEmail = normalizeEmail(email);
  const scope = workspaceId ? { workspaceId } : {};

  if (nPhone) {
    const existing = await db.lead.findFirst({ where: { ...scope, normalizedPhone: nPhone } });
    if (existing) return true;
  }

  if (nEmail) {
    const existing = await db.lead.findFirst({ where: { ...scope, normalizedEmail: nEmail } });
    if (existing) return true;
  }

  return false;
}

/**
 * Check multiple phone/email pairs in bulk.
 * Returns a set of indices that are duplicates.
 */
export async function bulkCheckDuplicates(
  workspaceId: string | null,
  items: Array<{ phone?: string | null; email?: string | null }>
): Promise<Set<number>> {
  // Collect all normalized phones and emails
  const phones = items.map((i) => normalizePhone(i.phone)).filter(Boolean) as string[];
  const emails = items.map((i) => normalizeEmail(i.email)).filter(Boolean) as string[];
  const scope = workspaceId ? { workspaceId } : {};

  const [existingPhones, existingEmails] = await Promise.all([
    phones.length > 0
      ? db.lead.findMany({ where: { ...scope, normalizedPhone: { in: phones } }, select: { normalizedPhone: true } })
      : [],
    emails.length > 0
      ? db.lead.findMany({ where: { ...scope, normalizedEmail: { in: emails } }, select: { normalizedEmail: true } })
      : [],
  ]);

  const dupPhoneSet = new Set(existingPhones.map((l) => l.normalizedPhone));
  const dupEmailSet = new Set(existingEmails.map((l) => l.normalizedEmail));

  const duplicateIndices = new Set<number>();
  items.forEach((item, idx) => {
    const nPhone = normalizePhone(item.phone);
    const nEmail = normalizeEmail(item.email);
    if ((nPhone && dupPhoneSet.has(nPhone)) || (nEmail && dupEmailSet.has(nEmail))) {
      duplicateIndices.add(idx);
    }
  });

  return duplicateIndices;
}
