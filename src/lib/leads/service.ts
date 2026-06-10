import { Prisma, type LeadStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import { normalizeEmail, normalizePhone, splitName } from "@/lib/normalize";
import { leadSchema, leadUpdateSchema } from "@/lib/validation";

export type ImportSummary = {
  totalRows: number;
  importedRows: number;
  duplicateRows: number;
  invalidRows: number;
  missingRows: number;
  rowErrors: { rowNumber: number; reason: string; rawData?: unknown }[];
};

export async function createLeadForUser(userId: string, input: unknown) {
  const parsed = leadSchema.parse(input);
  const normalizedEmail = normalizeEmail(parsed.email);
  const normalizedPhone = normalizePhone(parsed.phone, parsed.country);
  if (!normalizedPhone) throw new Error("Invalid phone number");

  const duplicate = await prisma.lead.findFirst({
    where: {
      OR: [
        normalizedEmail ? { normalizedEmail } : undefined,
        normalizedPhone ? { normalizedPhone } : undefined,
      ].filter(Boolean) as Prisma.LeadWhereInput[],
    },
    select: { id: true },
  });
  if (duplicate) throw new Error("Duplicate email or phone already exists in the database");

  const name = splitName(parsed.fullName);
  const count = await prisma.lead.count({ where: { userId } });
  return prisma.lead.create({
    data: {
      userId,
      firstName: name.firstName,
      lastName: name.lastName,
      fullName: parsed.fullName,
      phone: parsed.phone,
      normalizedPhone,
      email: parsed.email || null,
      normalizedEmail,
      jobTitle: parsed.jobTitle || null,
      company: parsed.company || null,
      companyWebsite: parsed.companyWebsite || null,
      industry: parsed.industry || null,
      region: parsed.region || null,
      country: parsed.country || null,
      city: parsed.city || null,
      timezone: parsed.timezone || null,
      source: parsed.source || null,
      status: parsed.status,
      notes: parsed.notes || null,
      queueOrder: count,
    },
  });
}

export async function updateLeadForUser(userId: string, leadId: string, input: unknown) {
  const existing = await prisma.lead.findFirst({ where: { id: leadId, userId } });
  if (!existing) throw new Error("Lead not found");

  const parsed = leadUpdateSchema.parse(input);
  const normalizedEmail = parsed.email !== undefined ? normalizeEmail(parsed.email) : existing.normalizedEmail;
  const normalizedPhone = parsed.phone !== undefined ? normalizePhone(parsed.phone, parsed.country || existing.country) : existing.normalizedPhone;

  if (normalizedEmail !== existing.normalizedEmail || normalizedPhone !== existing.normalizedPhone) {
    const duplicate = await prisma.lead.findFirst({
      where: {
        id: { not: leadId },
        OR: [
          normalizedEmail ? { normalizedEmail } : undefined,
          normalizedPhone ? { normalizedPhone } : undefined,
        ].filter(Boolean) as Prisma.LeadWhereInput[],
      },
    });
    if (duplicate) throw new Error("Duplicate email or phone already exists in the database");
  }

  const name = parsed.fullName ? splitName(parsed.fullName) : null;
  return prisma.lead.update({
    where: { id: leadId },
    data: {
      firstName: name?.firstName,
      lastName: name?.lastName,
      fullName: parsed.fullName,
      phone: parsed.phone,
      normalizedPhone,
      email: parsed.email,
      normalizedEmail,
      jobTitle: parsed.jobTitle,
      company: parsed.company,
      companyWebsite: parsed.companyWebsite,
      industry: parsed.industry,
      region: parsed.region,
      country: parsed.country,
      city: parsed.city,
      timezone: parsed.timezone,
      source: parsed.source,
      status: parsed.status as LeadStatus | undefined,
      notes: parsed.notes,
      calledInSession: parsed.calledInSession,
    },
  });
}

export async function importLeadsForUser(userId: string, rows: Record<string, string>[], filename?: string) {
  const batch = await prisma.importBatch.create({ data: { userId, filename, totalRows: rows.length } });
  const summary: ImportSummary = { totalRows: rows.length, importedRows: 0, duplicateRows: 0, invalidRows: 0, missingRows: 0, rowErrors: [] };

  const existing = await prisma.lead.findMany({
    select: { normalizedEmail: true, normalizedPhone: true },
  });
  const emails = new Set(existing.map((l) => l.normalizedEmail).filter(Boolean) as string[]);
  const phones = new Set(existing.map((l) => l.normalizedPhone).filter(Boolean) as string[]);
  let queueOrder = await prisma.lead.count({ where: { userId } });

  for (const [index, row] of rows.entries()) {
    const rowNumber = index + 2;
    const input = mapCsvRow(row);
    if (!input.fullName || !input.phone) {
      summary.missingRows++;
      summary.rowErrors.push({ rowNumber, reason: "Missing full_name or phone", rawData: row });
      continue;
    }

    const parsed = leadSchema.safeParse(input);
    if (!parsed.success) {
      summary.invalidRows++;
      summary.rowErrors.push({ rowNumber, reason: "Invalid row data", rawData: row });
      continue;
    }

    const normalizedEmail = normalizeEmail(parsed.data.email);
    const normalizedPhone = normalizePhone(parsed.data.phone, parsed.data.country);
    if (!normalizedPhone) {
      summary.invalidRows++;
      summary.rowErrors.push({ rowNumber, reason: "Invalid phone number", rawData: row });
      continue;
    }

    if ((normalizedEmail && emails.has(normalizedEmail)) || phones.has(normalizedPhone)) {
      summary.duplicateRows++;
      summary.rowErrors.push({ rowNumber, reason: "Duplicate email or phone", rawData: row });
      continue;
    }

    const name = splitName(parsed.data.fullName);
    await prisma.lead.create({
      data: {
        userId,
        firstName: name.firstName,
        lastName: name.lastName,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        normalizedPhone,
        email: parsed.data.email || null,
        normalizedEmail,
        jobTitle: parsed.data.jobTitle || null,
        company: parsed.data.company || null,
        companyWebsite: parsed.data.companyWebsite || null,
        industry: parsed.data.industry || null,
        region: parsed.data.region || null,
        country: parsed.data.country || null,
        city: parsed.data.city || null,
        timezone: parsed.data.timezone || null,
        source: parsed.data.source || "csv_import",
        status: parsed.data.status,
        notes: parsed.data.notes || null,
        queueOrder: queueOrder++,
      },
    });
    if (normalizedEmail) emails.add(normalizedEmail);
    phones.add(normalizedPhone);
    summary.importedRows++;
  }

  await prisma.importBatch.update({
    where: { id: batch.id },
    data: {
      status: "completed",
      importedRows: summary.importedRows,
      duplicateRows: summary.duplicateRows,
      invalidRows: summary.invalidRows,
      missingRows: summary.missingRows,
      completedAt: new Date(),
      rowErrors: {
        create: summary.rowErrors.slice(0, 500).map((e) => ({
          rowNumber: e.rowNumber,
          reason: e.reason,
          rawData: JSON.parse(JSON.stringify(e.rawData || {})),
        })),
      },
    },
  });

  return { batchId: batch.id, ...summary };
}

function mapCsvRow(row: Record<string, string>) {
  const get = (...keys: string[]) => {
    for (const key of keys) {
      const found = Object.entries(row).find(([k]) => k.toLowerCase().replace(/\s+/g, "_") === key);
      if (found?.[1]) return found[1];
    }
    return "";
  };
  return {
    fullName: get("full_name", "name"),
    phone: get("phone", "phone_number", "mobile"),
    email: get("email", "email_address"),
    jobTitle: get("job_title", "title"),
    company: get("company_name", "company"),
    companyWebsite: get("company_website", "website"),
    industry: get("industry"),
    region: get("region"),
    country: get("country"),
    city: get("city"),
    timezone: get("timezone"),
    source: get("source"),
    notes: get("notes"),
    status: (get("status") || "new").toLowerCase(),
  };
}
