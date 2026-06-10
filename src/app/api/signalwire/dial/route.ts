import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizePhone } from "@/lib/normalize";

export async function POST(request: Request) {
  return handleDial(request);
}

export async function GET(request: Request) {
  return handleDial(request);
}

async function handleDial(request: Request) {
  try {
    const url = new URL(request.url);
    const body = await request.json().catch(() => ({}));
    const vars = body?.call?.variables || body?.vars || body?.userVariables || body?.user_variables || body?.params || body || {};

    const rawLeadPhone = url.searchParams.get("lead_phone") || vars.lead_phone;
    const userId = url.searchParams.get("user_id") || vars.user_id || vars.caller_id;
    const leadId = url.searchParams.get("lead_id") || url.searchParams.get("dialer_lead_id") || vars.lead_id || vars.dialer_lead_id;
    const leadName = url.searchParams.get("lead_name") || vars.lead_name || null;
    const leadCompany = url.searchParams.get("lead_company") || vars.lead_company || null;
    const callSid = vars.call_id || body?.call?.id || null;

    if (!rawLeadPhone || !userId) return swmlSay("Error: no lead phone number or user id provided.");
    const leadPhone = normalizePhone(rawLeadPhone);
    if (!leadPhone || !/^\+[1-9]\d{6,14}$/.test(leadPhone)) return swmlSay(`Error: invalid phone number ${leadPhone || rawLeadPhone}`);

    const assignment = await prisma.phoneNumberAssignment.findFirst({
      where: { userId, active: true, phoneNumber: { status: "active" } },
      include: { phoneNumber: true },
    });
    if (!assignment) return swmlSay("Error: no outbound caller ID configured. Ask your admin to assign a number.");

    const lead = leadId
      ? await prisma.lead.findFirst({ where: { id: leadId, userId }, select: { id: true, fullName: true, company: true, phone: true } })
      : null;
    if (leadId && !lead) return swmlSay("Error: lead is not available for this user.");

    await prisma.callLog.upsert({
      where: { callSid: callSid || `pending-${crypto.randomUUID()}` },
      update: {},
      create: {
        callSid,
        userId,
        leadId: lead?.id,
        leadName: lead?.fullName || leadName,
        leadCompany: lead?.company || leadCompany,
        leadPhone,
        phoneNumberId: assignment.phoneNumberId,
        calledFromNumber: assignment.phoneNumber.phoneNumber,
        state: "ringing",
        outcome: "cold",
        notes: `Browser-dialed -> ${leadPhone}`,
      },
    });

    return NextResponse.json({
      version: "1.0.0",
      sections: { main: [{ connect: { from: assignment.phoneNumber.phoneNumber, to: leadPhone, answer_on_bridge: true } }] },
    });
  } catch {
    return swmlSay("Internal server error. Please try again.");
  }
}

function swmlSay(text: string) {
  return NextResponse.json({ version: "1.0.0", sections: { main: [{ say: { text } }] } });
}
