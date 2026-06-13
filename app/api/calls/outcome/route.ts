import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { z } from 'zod';
import { format } from 'date-fns';

const schema = z.object({
  leadId: z.string().optional().nullable(),
  callLogId: z.string().optional().nullable(),
  callSid: z.string().optional().nullable(),
  outcome: z.enum(['cold','warm','meeting_booked','not_interested','callback','no_answer','do_not_call']),
  notes: z.string().optional().nullable(),
  durationSeconds: z.number().default(0),
  calledFromNumber: z.string().optional().nullable(),
  followUp: z.boolean().default(false),
  followUpDate: z.string().optional().nullable(),
  followUpTime: z.string().optional().nullable(),
  followUpNotes: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { leadId, callLogId, callSid, outcome, notes, durationSeconds, calledFromNumber, followUp, followUpDate, followUpTime, followUpNotes } = parsed.data;
  const workspaceId = session.user.workspaceId ?? null;

  // Verify lead ownership (leadId is optional — manual calls to non-leads have none)
  const lead = leadId ? await db.lead.findUnique({ where: { id: leadId } }) : null;
  if (leadId && !lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
  if (lead && lead.userId !== session.user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const now = new Date();
  const timestamp = format(now, 'dd MMM yyyy, h:mm a');
  const durStr = `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`;
  const appendNote = `[${timestamp}] Call duration: ${durStr}\n${notes || '—'}\n─────────────────────\n`;

  // Update lead (only when this call is tied to a saved lead)
  if (lead) {
    const updatedNotes = (lead.notes ? lead.notes + '\n' : '') + appendNote;
    await db.lead.update({
      where: { id: lead.id },
      data: {
        status: outcome as 'new',
        notes: updatedNotes,
        callCount: { increment: 1 },
        lastCalledAt: now,
        calledInSession: true,
        ...(followUpDate ? { followUpDate: new Date(followUpDate), followUpNotes: followUpNotes || null } : {}),
      },
    });
  }

  // Update or create call log
  let log;
  if (callLogId) {
    log = await db.callLog.update({
      where: { id: callLogId },
      data: { outcome, notes, durationSeconds, followUpCreated: followUp, followUpDate: followUpDate ? new Date(followUpDate) : null, followUpNotes: followUpNotes || null },
    });
  } else {
    const phoneNum = calledFromNumber ? await db.phoneNumber.findFirst({ where: { phoneNumber: calledFromNumber } }) : null;
    log = await db.callLog.create({
      data: {
        userId: session.user.id,
        workspaceId,
        leadId: leadId || null,
        leadName: lead?.fullName || null,
        leadCompany: lead?.companyName || null,
        callSid: callSid || null,
        calledFromId: phoneNum?.id || null,
        calledFromNumber: calledFromNumber || null,
        dateTime: now,
        durationSeconds,
        outcome,
        notes,
        followUpCreated: followUp,
        followUpDate: followUpDate ? new Date(followUpDate) : null,
        followUpNotes: followUpNotes || null,
      },
    });
  }

  // Create follow-up record (requires a real lead)
  if (followUp && followUpDate && lead) {
    await db.followUp.create({
      data: {
        leadId: lead.id,
        userId: session.user.id,
        workspaceId,
        followUpDate: new Date(followUpDate),
        followUpTime: followUpTime || null,
        followUpNotes: followUpNotes || null,
      },
    });
  }

  // Auto-add to DNC list if outcome is do_not_call (requires a real lead)
  if (outcome === 'do_not_call' && lead) {
    await db.dNCEntry.create({
      data: {
        workspaceId,
        contactName: lead.fullName,
        email: lead.email || null,
        normalizedEmail: lead.normalizedEmail || null,
        phone: lead.phone,
        normalizedPhone: lead.normalizedPhone || null,
        company: lead.companyName || null,
        reason: 'DNC_Requested',
        addedById: session.user.id,
        addedByName: session.user.name || null,
        notes: 'Added via Dialer',
      },
    });
  }

  return NextResponse.json({ ok: true, callLogId: log.id });
}
