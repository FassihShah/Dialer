import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { normalizePhone, normalizeEmail } from '@/lib/phone';
import { z } from 'zod';

const updateSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().nullable(),
  companyName: z.string().optional().nullable(),
  companyWebsite: z.string().optional().nullable(),
  jobTitle: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  region: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.enum(['new','cold','warm','meeting_booked','not_interested','callback','do_not_call']).optional(),
  followUpDate: z.string().datetime().optional().nullable(),
  followUpNotes: z.string().optional().nullable(),
  calledInSession: z.boolean().optional(),
  callCount: z.number().optional(),
  lastCalledAt: z.string().datetime().optional().nullable(),
  queueOrder: z.number().optional(),
});

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const lead = await db.lead.findUnique({ where: { id } });
  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  // Enforce data isolation
  if (lead.userId !== session.user.id && session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  return NextResponse.json(lead);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.userId !== session.user.id && session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const data: Record<string, unknown> = { ...parsed.data };
  if (data.phone) data.normalizedPhone = normalizePhone(data.phone as string);
  if (data.email !== undefined) data.normalizedEmail = normalizeEmail(data.email as string);
  if (data.followUpDate) data.followUpDate = new Date(data.followUpDate as string);
  if (data.lastCalledAt) data.lastCalledAt = new Date(data.lastCalledAt as string);

  const lead = await db.lead.update({ where: { id }, data });
  return NextResponse.json(lead);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  const existing = await db.lead.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.userId !== session.user.id && session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await db.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
