import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/session";
import { generateSubscriberToken } from "@/lib/signalwire/service";
import { jsonError } from "@/lib/http";

export async function POST() {
  try {
    await requireUser();
    return NextResponse.json(await generateSubscriberToken());
  } catch (error) {
    return jsonError(error);
  }
}
