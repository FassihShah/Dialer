import { prisma } from "@/lib/db";
import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { signalWireSettingSchema } from "@/lib/validation";

export async function saveSignalWireSettings(actorId: string, input: unknown) {
  const parsed = signalWireSettingSchema.parse(input);
  if (parsed.active) {
    await prisma.signalWireSetting.updateMany({ data: { active: false } });
  }
  return prisma.signalWireSetting.create({
    data: {
      projectId: parsed.projectId,
      apiTokenEncrypted: encryptSecret(parsed.apiToken),
      spaceUrl: cleanSpaceUrl(parsed.spaceUrl),
      sharedSubscriberReference: parsed.sharedSubscriberReference || null,
      sharedSubscriberPasswordEncrypted: parsed.sharedSubscriberPassword ? encryptSecret(parsed.sharedSubscriberPassword) : null,
      signalwireNumber: parsed.signalwireNumber || null,
      dialAddress: parsed.dialAddress || null,
      active: parsed.active,
      configuredById: actorId,
    },
  });
}

export async function getActiveSignalWireSettings() {
  const config = await prisma.signalWireSetting.findFirst({ where: { active: true }, orderBy: { createdAt: "desc" } });
  if (!config) throw new Error("SignalWire is not configured");
  return config;
}

export async function generateSubscriberToken() {
  const config = await getActiveSignalWireSettings();
  if (!config.sharedSubscriberReference || !config.sharedSubscriberPasswordEncrypted) {
    throw new Error("Shared SignalWire subscriber is not configured");
  }
  const credentials = Buffer.from(`${config.projectId}:${decryptSecret(config.apiTokenEncrypted)}`).toString("base64");
  const response = await fetch(`https://${cleanSpaceUrl(config.spaceUrl)}/api/fabric/subscribers/tokens`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${credentials}` },
    body: JSON.stringify({
      reference: config.sharedSubscriberReference,
      password: decryptSecret(config.sharedSubscriberPasswordEncrypted),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `SignalWire token request failed: ${response.status}`);
  const token = data.token || data.jwt_token || data.jwt;
  if (!token) throw new Error("SignalWire did not return a subscriber token");
  return { token, dialAddress: config.dialAddress };
}

export async function fetchSignalWireNumbers() {
  const config = await getActiveSignalWireSettings();
  const credentials = Buffer.from(`${config.projectId}:${decryptSecret(config.apiTokenEncrypted)}`).toString("base64");
  const response = await fetch(`https://${cleanSpaceUrl(config.spaceUrl)}/api/laml/2010-04-01/Accounts/${config.projectId}/IncomingPhoneNumbers`, {
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `SignalWire numbers request failed: ${response.status}`);
  return (data.incoming_phone_numbers || [])
    .filter((n: { capabilities?: { voice?: boolean } }) => n.capabilities?.voice === true)
    .map((n: { phone_number: string; friendly_name?: string; sid?: string; capabilities?: unknown }) => ({
      phoneNumber: n.phone_number,
      label: n.friendly_name || n.phone_number,
      signalwireSid: n.sid || "",
      country: n.phone_number?.startsWith("+1") ? "United States" : "International",
      countryCode: n.phone_number?.startsWith("+1") ? "+1" : "",
      capabilities: n.capabilities,
    }));
}

export async function testSignalWireConnection() {
  const config = await getActiveSignalWireSettings();
  const credentials = Buffer.from(`${config.projectId}:${decryptSecret(config.apiTokenEncrypted)}`).toString("base64");
  const response = await fetch(`https://${cleanSpaceUrl(config.spaceUrl)}/api/calling/calls`, {
    headers: { Authorization: `Basic ${credentials}`, Accept: "application/json" },
  });
  if (response.status === 200 || response.status === 404) return { success: true, spaceUrl: cleanSpaceUrl(config.spaceUrl), projectId: config.projectId };
  if (response.status === 401) throw new Error("SignalWire authentication failed");
  if (response.status === 403) throw new Error("SignalWire API token does not have Calling API access");
  throw new Error(`SignalWire returned HTTP ${response.status}`);
}

export function cleanSpaceUrl(value: string) {
  return value.replace(/^https?:\/\//i, "").replace(/\/$/, "").trim();
}
