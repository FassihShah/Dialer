import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { hashPassword } from "@/lib/auth/password";
import { userSchema } from "@/lib/validation";
import { jsonError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireAdmin();
    const { id } = await params;
    const body = userSchema.partial().parse(await request.json());
    const user = await prisma.user.update({
      where: { id },
      data: {
        name: body.name,
        email: body.email,
        role: body.role,
        disabled: body.disabled,
        passwordHash: body.password ? await hashPassword(body.password) : undefined,
      },
      select: { id: true, email: true, name: true, role: true, disabled: true },
    });
    await audit(actor.id, "user.update", "User", user.id, { email: user.email, role: user.role, disabled: user.disabled });
    return NextResponse.json({ user });
  } catch (error) {
    return jsonError(error);
  }
}
