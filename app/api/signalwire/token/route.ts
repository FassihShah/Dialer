import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActiveConfig, generateToken } from '@/lib/signalwire';

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const config = await getActiveConfig(session.user.workspaceId);
  if (!config) return NextResponse.json({ success: false, error: 'No VoIPConfig found. Configure it in Admin → Settings.' });

  const result = await generateToken(config);
  if ('error' in result) return NextResponse.json({ success: false, error: result.error });

  return NextResponse.json({ success: true, token: result.token, dial_address: config.dialAddress });
}
