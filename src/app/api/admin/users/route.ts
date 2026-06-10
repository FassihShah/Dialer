import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { userSchema } from "@/lib/validation";
import { jsonError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      select: { id: true, email: true, name: true, role: true, disabled: true, createdAt: true },
    });
    return NextResponse.json({ users });
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    const body = userSchema.extend({ password: userSchema.shape.password.unwrap().min(8) }).parse(await request.json());
    const user = await prisma.user.create({
      data: { name: body.name, email: body.email, role: body.role, disabled: body.disabled, passwordHash: await hashPassword(body.password) },
      select: { id: true, email: true, name: true, role: true, disabled: true },
    });
    await audit(actor.id, "user.create", "User", user.id, { email: user.email, role: user.role });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
