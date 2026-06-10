import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

const cookieName = "cold_calling_session";

function secret() {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) throw new Error("AUTH_SECRET must be at least 32 characters");
  return new TextEncoder().encode(raw);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret());

  (await cookies()).set(cookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearSession() {
  (await cookies()).delete(cookieName);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(cookieName)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    const user = await prisma.user.findUnique({
      where: { id: String(payload.sub) },
      select: { id: true, email: true, name: true, role: true, disabled: true },
    });
    if (!user || user.disabled) return null;
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  } catch {
    return null;
  }
}

export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/dashboard");
  return user;
}
