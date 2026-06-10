import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const followUps = await prisma.followUp.findMany({
      where: user.role === "ADMIN" ? {} : { lead: { userId: user.id } },
      orderBy: { followUpAt: "asc" },
    });
    return NextResponse.json({ followUps });
  } catch (error) {
    return jsonError(error, 401);
  }
}
