import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8),
  role: z.enum(['admin', 'user']).default('user'),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const users = await db.user.findMany({
    select: {
      id: true, email: true, name: true, role: true, status: true,
      agentPhone: true, subscriberReference: true, createdAt: true,
      phoneAssignment: { include: { phoneNumber: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json(users);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const existing = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: 'Email already exists' }, { status: 409 });

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  const user = await db.user.create({
    data: { ...parsed.data, password: hashed, status: 'active', createdById: session.user.id },
  });

  await audit({ userId: session.user.id, action: 'create_user', entityType: 'User', entityId: user.id });
  return NextResponse.json({ id: user.id, email: user.email, name: user.name, role: user.role });
}
