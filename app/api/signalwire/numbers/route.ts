import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActiveConfig, fetchNumbers } from '@/lib/signalwire';

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const config = await getActiveConfig(session.user.workspaceId);
  if (!config) return NextResponse.json({ success: false, error: 'VoIPConfig not configured.' });

  const result = await fetchNumbers(config);
  return NextResponse.json(result);
}
