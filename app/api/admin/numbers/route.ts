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
    include: { assignment: { include: { user: { select: { id: true, name: true, email: true } } } } },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(numbers);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  // Batch import support
  if (Array.isArray(body)) {
    const results = [];
    for (const item of body) {
      const parsed = schema.safeParse(item);
      if (!parsed.success) { results.push({ error: parsed.error.flatten(), item }); continue; }
      const num = await db.phoneNumber.upsert({
        where: { phoneNumber: parsed.data.phoneNumber },
        update: { ...parsed.data, addedById: session.user.id },
        create: { ...parsed.data, addedById: session.user.id },
      });
      results.push(num);
    }
    return NextResponse.json(results);
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const num = await db.phoneNumber.upsert({
    where: { phoneNumber: parsed.data.phoneNumber },
    update: { ...parsed.data, addedById: session.user.id },
    create: { ...parsed.data, addedById: session.user.id },
  });
  return NextResponse.json(num);
}
