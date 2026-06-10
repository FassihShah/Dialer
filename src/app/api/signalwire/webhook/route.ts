import { prisma } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const secret = process.env.SIGNALWIRE_WEBHOOK_SECRET;
    if (secret && request.headers.get("x-webhook-secret") !== secret) {
      return new Response("forbidden", { status: 403 });
    }

    const contentType = request.headers.get("content-type") || "";
    const payload = contentType.includes("application/json")
      ? await request.json()
      : Object.fromEntries(new URLSearchParams(await request.text()));

    const callId = payload.id || payload.CallSid || payload.call_id;
    if (!callId) return new Response("ok", { status: 200 });

    const rawState = String(payload.state || payload.status || payload.CallStatus || "").toLowerCase();
    const state = mapState(rawState);
    const eventKey = `${callId}:${rawState || "unknown"}:${payload.timestamp || payload.Timestamp || payload.sequence || ""}`;

    const log = await prisma.callLog.findUnique({ where: { callSid: callId } });
    await prisma.signalWireWebhookEvent.upsert({
      where: { eventKey },
      update: {},
      create: { eventKey, callLogId: log?.id, payload },
    });

    if (log) {
      await prisma.callLog.update({
        where: { id: log.id },
        data: {
          state,
          durationSeconds: ["ended", "completed"].includes(rawState) ? Number(payload.duration || payload.CallDuration || 0) || log.durationSeconds : undefined,
          recordingUrl: payload.recording_url || payload.RecordingUrl || undefined,
        },
      });
      if (log.leadId) await prisma.lead.update({ where: { id: log.leadId }, data: { callStatus: state } });
    }

    return new Response("ok", { status: 200 });
  } catch {
    return new Response("error logged", { status: 200 });
  }
}

function mapState(state: string) {
  const map: Record<string, "ringing" | "in_progress" | "completed" | "failed" | "busy" | "no_answer" | "canceled"> = {
    created: "ringing",
    ringing: "ringing",
    answered: "in_progress",
    active: "in_progress",
    "in-progress": "in_progress",
    ended: "completed",
    completed: "completed",
    failed: "failed",
    busy: "busy",
    "no-answer": "no_answer",
    canceled: "canceled",
  };
  return map[state] || "in_progress";
}
