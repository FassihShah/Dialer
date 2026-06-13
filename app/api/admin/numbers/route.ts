import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';

const schema = z.object({
  phoneNumber: z.string().min(1),
  label: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  signalwireSid: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const numbers = await db.phoneNumber.findMany({
    where: { workspaceId: session.user.workspaceId },
    include: { assignment: { include: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(numbers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const workspaceId = session.user.workspaceId;
  const addedById = session.user.id;

  // Phone numbers are globally unique rows. Upsert only into the caller's own
  // workspace; refuse to touch a number already owned by another workspace.
  async function upsertNumber(data: z.infer<typeof schema>) {
    const existing = await db.phoneNumber.findUnique({ where: { phoneNumber: data.phoneNumber }, select: { id: true, workspaceId: true } });
    if (existing && existing.workspaceId && existing.workspaceId !== workspaceId) {
      return { error: 'This number is already registered to another workspace', phoneNumber: data.phoneNumber };
    }
    return db.phoneNumber.upsert({
      where: { phoneNumber: data.phoneNumber },
      update: { ...data, addedById, workspaceId },
      create: { ...data, addedById, workspaceId },
    });
  }

  const body = await req.json();
  // Batch import support
  if (Array.isArray(body)) {
    const results = [];
    for (const item of body) {
      const parsed = schema.safeParse(item);
      if (!parsed.success) { results.push({ error: parsed.error.flatten(), item }); continue; }
      results.push(await upsertNumber(parsed.data));
    }
    return NextResponse.json(results);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  return NextResponse.json(await upsertNumber(parsed.data));
}
