import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// PUBLIC webhook — SignalWire POSTs call status events here.
export async function POST(req: NextRequest) {
  try {
    let event: Record<string, string> = {};
    const ct = req.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      event = await req.json();
    } else {
      const text = await req.text();
      event = Object.fromEntries(new URLSearchParams(text));
    }

    const callId = event.id || event.CallSid || event.call_id;
    const rawState = (event.state || event.status || event.CallStatus || '').toLowerCase();

    if (!callId) return new NextResponse('ok', { status: 200 });

    const stateMap: Record<string, string> = {
      created: 'ringing', ringing: 'ringing',
      answered: 'in-progress', active: 'in-progress', 'in-progress': 'in-progress',
      ended: 'completed', completed: 'completed',
      failed: 'failed', busy: 'busy', 'no-answer': 'no-answer', canceled: 'canceled',
    };
    const mappedStatus = stateMap[rawState] || rawState;

    const log = await db.callLog.findFirst({ where: { callSid: callId }, orderBy: { createdAt: 'desc' } });
    if (!log) return new NextResponse('ok', { status: 200 });

    const updateData: Record<string, unknown> = { notes: `Status: ${mappedStatus}` };

    if (rawState === 'ended' || rawState === 'completed') {
      updateData.durationSeconds = parseInt(event.duration || event.CallDuration || '0') || 0;
      if (event.recording_url || event.RecordingUrl) {
        updateData.recordingUrl = event.recording_url || event.RecordingUrl;
      }
    }

    await db.callLog.update({ where: { id: log.id }, data: updateData });

    return new NextResponse('ok', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    return new NextResponse('ok', { status: 200 }); // always 200 to prevent SignalWire retries
  }
}
