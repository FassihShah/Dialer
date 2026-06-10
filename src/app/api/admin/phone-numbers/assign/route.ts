import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth/session";
import { assignNumber, unassignNumber } from "@/lib/phone-numbers/service";
import { jsonError } from "@/lib/http";
import { audit } from "@/lib/audit";

const assignSchema = z.object({ phoneNumberId: z.string(), userId: z.string() });
const unassignSchema = z.object({ assignmentId: z.string() });

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    const body = assignSchema.parse(await request.json());
    const assignment = await assignNumber(body.phoneNumberId, body.userId, actor.id);
    await audit(actor.id, "phone_number.assign", "PhoneNumberAssignment", assignment.id, body);
    return NextResponse.json({ assignment });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const actor = await requireAdmin();
    const body = unassignSchema.parse(await request.json());
    const assignment = await unassignNumber(body.assignmentId);
    await audit(actor.id, "phone_number.unassign", "PhoneNumberAssignment", assignment.id);
    return NextResponse.json({ assignment });
  } catch (error) {
    return jsonError(error);
  }
}
