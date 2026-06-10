import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { jsonError } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireUser();
    const logs = await prisma.callLog.findMany({
      where: user.role === "ADMIN" ? {} : { userId: user.id },
      orderBy: { dateTime: "desc" },
      take: 200,
    });
    return NextResponse.json({ logs });
  } catch (error) {
    return jsonError(error, 401);
  }
}
