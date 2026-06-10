import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { callOutcomeSchema } from "@/lib/validation";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = callOutcomeSchema.parse(await request.json());
    const lead = await prisma.lead.findFirst({ where: { id: body.leadId, userId: user.id } });
    if (!lead) throw new Error("Lead not found");

    const now = new Date();
    const appended = `[${now.toLocaleString()}] Call duration: ${Math.floor(body.durationSeconds / 60)}m ${body.durationSeconds % 60}s\n${body.notes || "-"}\n--------------------\n`;
    const nextFollowUpAt = body.followUp && body.followUpAt ? new Date(body.followUpAt) : null;

    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        status: body.outcome,
        notes: `${lead.notes ? `${lead.notes}\n` : ""}${appended}`,
        callCount: { increment: 1 },
        lastCalledAt: now,
        calledInSession: true,
        nextFollowUpAt,
        callStatus: "completed",
      },
    });

    let callLog = null;
    if (body.callLogId) {
      await prisma.callLog.updateMany({
        where: { id: body.callLogId, userId: user.id },
        data: { outcome: body.outcome, notes: updatedLead.notes, durationSeconds: body.durationSeconds, state: "completed", followUpTask: body.followUp, followUpTaskDescription: body.followUpNotes, followUpDueDate: nextFollowUpAt },
      });
      callLog = await prisma.callLog.findFirst({ where: { id: body.callLogId, userId: user.id } });
      if (!callLog) throw new Error("Call log not found");
    } else {
      callLog = await prisma.callLog.create({
          data: {
            userId: user.id,
            leadId: lead.id,
            leadName: lead.fullName,
            leadCompany: lead.company,
            leadPhone: lead.phone,
            outcome: body.outcome,
            notes: updatedLead.notes,
            durationSeconds: body.durationSeconds,
            state: "completed",
            followUpTask: body.followUp,
            followUpTaskDescription: body.followUpNotes,
            followUpDueDate: nextFollowUpAt,
          },
        });
    }

    if (body.followUp && nextFollowUpAt) {
      await prisma.followUp.create({
        data: {
          leadId: lead.id,
          leadName: lead.fullName,
          leadPhone: lead.phone,
          leadCompany: lead.company,
          followUpAt: nextFollowUpAt,
          followUpNotes: body.followUpNotes,
          assignedToIds: [user.id],
          createdById: user.id,
        },
      });
    }

    if (body.outcome === "do_not_call") {
      await prisma.dncEntry.create({
        data: {
          contactName: lead.fullName,
          email: lead.email,
          normalizedEmail: lead.normalizedEmail,
          phone: lead.phone,
          normalizedPhone: lead.normalizedPhone,
          company: lead.company,
          reason: "DNC Requested",
          addedById: user.id,
          addedByName: user.name,
          notes: "Added via Dialer",
        },
      });
    }

    return NextResponse.json({ lead: updatedLead, callLog });
  } catch (error) {
    return jsonError(error);
  }
}
