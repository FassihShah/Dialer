import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { normalizePhone, isE164 } from '@/lib/phone';
import { getActiveConfig } from '@/lib/signalwire';

// PUBLIC endpoint — no user auth. SignalWire POSTs here when a browser call is placed.
// Returns SWML to bridge the browser call to the lead's real phone.
export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const qp = url.searchParams;

    let body: Record<string, unknown> = {};
    try {
      const text = await req.text();
      body = JSON.parse(text);
    } catch { /* form-encoded or empty */ }

    // SignalWire delivers SDK userVariables to the SWML webhook under `vars`.
    // Check every known shape defensively so call data is never lost.
    const b = body as {
      call?: { variables?: Record<string, string>; user_variables?: Record<string, string> };
      vars?: Record<string, string>;
      userVariables?: Record<string, string>;
      params?: { vars?: Record<string, string>; userVariables?: Record<string, string> };
    };
    const vars: Record<string, string> = {
      ...(body as Record<string, string>),
      ...(b?.params?.vars || {}),
      ...(b?.params?.userVariables || {}),
      ...(b?.call?.variables || {}),
      ...(b?.call?.user_variables || {}),
      ...(b?.userVariables || {}),
      ...(b?.vars || {}),
    };

    console.log('[SWML] incoming body keys:', Object.keys(body), '| resolved vars:', Object.keys(vars));

    const rawLeadPhone = qp.get('lead_phone') || (vars as Record<string, string>).lead_phone || null;
    const callerId     = qp.get('user_id')    || (vars as Record<string, string>).user_id    || null;
    const leadName     = qp.get('lead_name')  || (vars as Record<string, string>).lead_name  || null;
    const leadCompany  = qp.get('lead_company') || (vars as Record<string, string>).lead_company || null;
    const dialerLeadId = qp.get('dialer_lead_id') || (vars as Record<string, string>).dialer_lead_id || null;

    if (!rawLeadPhone) {
      return NextResponse.json({ version: '1.0.0', sections: { main: [{ say: { text: 'Error: no lead phone number provided.' } }] } });
    }

    const leadPhone = normalizePhone(rawLeadPhone);
    if (!leadPhone || !isE164(leadPhone)) {
      return NextResponse.json({ version: '1.0.0', sections: { main: [{ say: { text: `Error: invalid phone number.` } }] } });
    }

    // Determine caller ID: user's assigned number → VoIPConfig default → first active number
    let fromNumber: string | null = null;

    if (callerId) {
      const assignment = await db.phoneNumberAssignment.findFirst({
        where: { userId: callerId, phoneNumber: { status: 'active' } },
        include: { phoneNumber: true },
      });
      if (assignment?.phoneNumber.phoneNumber) fromNumber = assignment.phoneNumber.phoneNumber;
    }

    if (!fromNumber) {
      const config = await getActiveConfig();
      fromNumber = config?.signalwireNumber || null;
    }

    if (!fromNumber) {
      const pool = await db.phoneNumber.findFirst({ where: { status: 'active' } });
      fromNumber = pool?.phoneNumber || null;
    }

    if (!fromNumber) {
      return NextResponse.json({ version: '1.0.0', sections: { main: [{ say: { text: 'Error: no outbound caller ID configured.' } }] } });
    }

    // Record initial call log
    if (callerId) {
      await db.callLog.create({
        data: {
          userId: callerId,
          leadId: dialerLeadId || null,
          leadName: leadName || null,
          leadCompany: leadCompany || null,
          calledFromNumber: fromNumber,
          callSid: (vars as Record<string, string>).call_id || null,
          dateTime: new Date(),
          durationSeconds: 0,
        },
      }).catch(() => {}); // non-fatal
    }

    return NextResponse.json({
      version: '1.0.0',
      sections: {
        main: [{ connect: { from: fromNumber, to: leadPhone, answer_on_bridge: true } }],
      },
    });
  } catch (err) {
    console.error('SWML handler error:', err);
    return NextResponse.json({ version: '1.0.0', sections: { main: [{ say: { text: 'Internal server error.' } }] } });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
