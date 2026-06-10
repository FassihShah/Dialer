import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { upsertPhoneNumber } from "@/lib/phone-numbers/service";
import { fetchSignalWireNumbers } from "@/lib/signalwire/service";
import { jsonError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const phoneNumbers = await prisma.phoneNumber.findMany({
      include: { assignments: { where: { active: true }, include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ phoneNumbers });
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    const phoneNumber = await upsertPhoneNumber(await request.json());
    await audit(actor.id, "phone_number.upsert", "PhoneNumber", phoneNumber.id);
    return NextResponse.json({ phoneNumber }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT() {
  try {
    await requireAdmin();
    return NextResponse.json({ numbers: await fetchSignalWireNumbers() });
  } catch (error) {
    return jsonError(error);
  }
}
