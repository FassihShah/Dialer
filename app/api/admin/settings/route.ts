import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit';
import { z } from 'zod';

const schema = z.object({
  projectId: z.string().min(1),
  apiToken: z.string().min(1),
  spaceUrl: z.string().min(1),
  sharedSubscriberReference: z.string().optional().nullable(),
  sharedSubscriberPassword: z.string().optional().nullable(),
  signalwireNumber: z.string().optional().nullable(),
  dialAddress: z.string().optional().nullable(),
  active: z.boolean().default(true),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const config = await db.voIPConfig.findFirst({ where: { active: true } }) ||
    await db.voIPConfig.findFirst({ orderBy: { createdAt: 'desc' } });

  if (!config) return NextResponse.json(null);

  // Mask api token for display
  return NextResponse.json({
    ...config,
    apiToken: config.apiToken ? '••••••••' + config.apiToken.slice(-4) : '',
    sharedSubscriberPassword: config.sharedSubscriberPassword ? '••••••••' : '',
  });
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  // Deactivate all existing configs
  await db.voIPConfig.updateMany({ data: { active: false } });

  const existing = await db.voIPConfig.findFirst();
  const data = { ...parsed.data, configuredById: session.user.id };

  // If tokens contain masking dots, keep the existing values
  if (data.apiToken.includes('•')) {
    if (existing) { data.apiToken = existing.apiToken; } else { return NextResponse.json({ error: 'Cannot keep masked token without existing config' }, { status: 400 }); }
  }
  if (data.sharedSubscriberPassword && data.sharedSubscriberPassword.includes('•')) {
    if (existing) { data.sharedSubscriberPassword = existing.sharedSubscriberPassword; }
  }

  let config;
  if (existing) {
    config = await db.voIPConfig.update({ where: { id: existing.id }, data });
  } else {
    config = await db.voIPConfig.create({ data });
  }

  await audit({ userId: session.user.id, action: 'update_voip_config', entityType: 'VoIPConfig', entityId: config.id });
  return NextResponse.json({ ok: true, id: config.id });
}
