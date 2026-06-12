import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { bulkCheckDuplicates } from '@/lib/dedup';
import { normalizePhone, normalizeEmail } from '@/lib/phone';

interface RawRow {
  full_name?: string;
  fullName?: string;
  name?: string;
  phone?: string;
  email?: string;
  job_title?: string;
  jobTitle?: string;
  company_name?: string;
  companyName?: string;
  company?: string;
  company_website?: string;
  companyWebsite?: string;
  website?: string;
  industry?: string;
  region?: string;
  notes?: string;
  status?: string;
  [key: string]: string | undefined;
}

function mapRow(raw: RawRow) {
  return {
    fullName: raw.full_name || raw.fullName || raw.name || '',
    phone: raw.phone || '',
    email: raw.email || null,
    jobTitle: raw.job_title || raw.jobTitle || null,
    companyName: raw.company_name || raw.companyName || raw.company || null,
    companyWebsite: raw.company_website || raw.companyWebsite || raw.website || null,
    industry: raw.industry || null,
    region: raw.region || null,
    notes: raw.notes || null,
    status: (['new','cold','warm','meeting_booked','not_interested','callback','do_not_call'].includes(raw.status || '') ? raw.status : 'new') as 'new',
  };
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { rows, fileName }: { rows: RawRow[]; fileName?: string } = body;

  if (!Array.isArray(rows)) return NextResponse.json({ error: 'rows must be an array' }, { status: 400 });

  const batch = await db.importBatch.create({
    data: { userId: session.user.id, fileName: fileName || null, totalRows: rows.length, status: 'processing' },
  });

  const mapped = rows.map(mapRow);
  const invalidIndices = new Set<number>();
  const rowErrors: Array<{ row: number; reason: string }> = [];

  mapped.forEach((m, i) => {
    if (!m.fullName || !m.phone) {
      invalidIndices.add(i);
      rowErrors.push({ row: i + 2, reason: `Missing ${!m.fullName ? 'full_name' : 'phone'}` });
    }
  });

  const validMapped = mapped.filter((_, i) => !invalidIndices.has(i));
  const dupIndices = await bulkCheckDuplicates(validMapped.map((m) => ({ phone: m.phone, email: m.email })));

  let importedRows = 0;
  let queueStart = await db.lead.count({ where: { userId: session.user.id } });

  const toInsert = [];
  let dupCount = 0;
  let validIdx = 0;
  for (let i = 0; i < mapped.length; i++) {
    if (invalidIndices.has(i)) continue;
    if (dupIndices.has(validIdx)) {
      dupCount++;
      rowErrors.push({ row: i + 2, reason: 'Duplicate phone or email' });
      validIdx++;
      continue;
    }
    const m = mapped[i];
    toInsert.push({
      ...m,
      userId: session.user.id,
      normalizedPhone: normalizePhone(m.phone),
      normalizedEmail: normalizeEmail(m.email),
      queueOrder: queueStart + importedRows,
    });
    importedRows++;
    validIdx++;
  }

  if (toInsert.length > 0) {
    await db.lead.createMany({ data: toInsert, skipDuplicates: true });
  }

  await db.importBatch.update({
    where: { id: batch.id },
    data: {
      importedRows,
      duplicateRows: dupCount,
      invalidRows: invalidIndices.size,
      status: 'completed',
      errors: rowErrors.length > 0 ? rowErrors : undefined,
    },
  });

  return NextResponse.json({
    batchId: batch.id,
    totalRows: rows.length,
    importedRows,
    duplicateRows: dupCount,
    invalidRows: invalidIndices.size,
    errors: rowErrors.slice(0, 20),
  });
}
