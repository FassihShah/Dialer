import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { createLeadForUser } from "@/lib/leads/service";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const q = url.searchParams.get("q")?.trim();
    const leads = await prisma.lead.findMany({
      where: {
        userId: user.id,
        ...(status && status !== "all" ? { status: status as never } : {}),
        ...(q ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { company: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { email: { contains: q, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: [{ queueOrder: "asc" }, { createdAt: "desc" }],
    });
    return NextResponse.json({ leads });
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const lead = await createLeadForUser(user.id, await request.json());
    return NextResponse.json({ lead }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
