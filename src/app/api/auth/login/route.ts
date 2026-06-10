import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSession } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { loginSchema } from "@/lib/validation";
import { jsonError } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || user.disabled || !(await verifyPassword(body.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }
    await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
    return NextResponse.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  } catch (error) {
    return jsonError(error);
  }
}
