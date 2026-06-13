import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { isDuplicate } from '@/lib/dedup';
import { normalizePhone, normalizeEmail } from '@/lib/phone';
import { z } from 'zod';

const createSchema = z.object({
  fullName: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companyWebsite: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['new','cold','warm','meeting_booked','not_interested','callback','do_not_call']).default('new'),
  source: z.string().optional().nullable(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const limit = parseInt(searchParams.get('limit') || '500');

  const where: Record<string, unknown> = { userId: session.user.id };
  if (status && status !== 'all') where.status = status;
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { companyName: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const leads = await db.lead.findMany({
    where,
    orderBy: [{ queueOrder: 'asc' }, { createdAt: 'desc' }],
    take: limit,
  });
  return NextResponse.json(leads);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { phone, email } = parsed.data;
  const nPhone = normalizePhone(phone);
  const nEmail = normalizeEmail(email);

  const workspaceId = session.user.workspaceId ?? null;
  const dup = await isDuplicate(workspaceId, phone, email);
  if (dup) return NextResponse.json({ error: 'A lead with this phone or email already exists in the system.' }, { status: 409 });

  const count = await db.lead.count({ where: { userId: session.user.id } });
  const lead = await db.lead.create({
    data: {
      ...parsed.data,
      userId: session.user.id,
      workspaceId,
      normalizedPhone: nPhone,
      normalizedEmail: nEmail,
      queueOrder: count,
    },
  });
  return NextResponse.json(lead, { status: 201 });
}
