import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { updateLeadForUser } from "@/lib/leads/service";
import { jsonError } from "@/lib/http";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const lead = await prisma.lead.findFirst({
      where: { id, userId: user.id },
      include: { callLogs: { orderBy: { dateTime: "desc" }, take: 20 }, followUps: { orderBy: { followUpAt: "asc" } } },
    });
    if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ lead });
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const lead = await updateLeadForUser(user.id, id, await request.json());
    return NextResponse.json({ lead });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const result = await prisma.lead.deleteMany({ where: { id, userId: user.id } });
    if (result.count === 0) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}
