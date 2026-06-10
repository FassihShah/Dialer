import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { saveSignalWireSettings, testSignalWireConnection } from "@/lib/signalwire/service";
import { jsonError } from "@/lib/http";
import { audit } from "@/lib/audit";

export async function GET() {
  try {
    await requireAdmin();
    const settings = await prisma.signalWireSetting.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true, provider: true, projectId: true, spaceUrl: true, sharedSubscriberReference: true,
        signalwireNumber: true, dialAddress: true, active: true, configuredById: true, createdAt: true, updatedAt: true,
      },
    });
    return NextResponse.json({ settings });
  } catch (error) {
    return jsonError(error, 401);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    const setting = await saveSignalWireSettings(actor.id, await request.json());
    await audit(actor.id, "signalwire.configure", "SignalWireSetting", setting.id);
    return NextResponse.json({ setting: { id: setting.id, active: setting.active } }, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PUT() {
  try {
    await requireAdmin();
    return NextResponse.json(await testSignalWireConnection());
  } catch (error) {
    return jsonError(error);
  }
}
