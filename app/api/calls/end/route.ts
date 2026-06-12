import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getActiveConfig, endCall } from '@/lib/signalwire';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { callId, callSid, durationSeconds } = await req.json();
  const id = callId || callSid;
  if (!id) return NextResponse.json({ success: false, error: 'callId required' });

  const config = await getActiveConfig();
  if (config) {
    const status = await endCall(config, id);
    if (![200, 201, 204, 404, 422].includes(status)) {
      // Log but don't fail — call may already be ended
      console.warn('endCall returned', status);
    }
  }

  if (durationSeconds != null && id) {
    const log = await db.callLog.findFirst({ where: { callSid: id }, orderBy: { createdAt: 'desc' } });
    if (log) await db.callLog.update({ where: { id: log.id }, data: { durationSeconds } });
  }

  return NextResponse.json({ success: true });
}
