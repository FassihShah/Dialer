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

    // The SWML webhook body shape (confirmed from logs) is { call, vars }.
    // SDK userVariables land nested at body.vars.userVariables. Merge every
    // candidate object so call data is found no matter the nesting.
    const b = body as Record<string, unknown>;
    const obj = (v: unknown): Record<string, string> =>
      (v && typeof v === 'object') ? (v as Record<string, string>) : {};
    const callObj = obj(b.call);
    const varsObj = obj(b.vars);
    const paramsObj = obj(b.params);

    const vars: Record<string, string> = {};
    // Order matters — later spreads win. Most specific (userVariables) last.
    Object.assign(
      vars,
      obj(b),                       // top-level
      callObj,                      // call.*
      obj(callObj.variables),       // call.variables
      obj(callObj.user_variables),  // call.user_variables
      paramsObj,                    // params.*
      obj(paramsObj.userVariables), // params.userVariables
      varsObj,                      // vars.*
      obj(b.userVariables),         // body.userVariables
      obj(callObj.userVariables),   // call.userVariables
      obj(varsObj.userVariables),   // vars.userVariables  ← actual location
    );

    const callId = (callObj.call_id as string) || vars.call_id || null;

    console.log('[SWML] body keys:', Object.keys(body),
      '| vars.userVariables keys:', Object.keys(obj(varsObj.userVariables)),
      '| resolved lead_phone:', vars.lead_phone || '(none)');

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
          callSid: callId,
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
