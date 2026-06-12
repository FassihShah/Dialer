import { db } from './db';

export interface SWConfig {
  projectId: string;
  apiToken: string;
  spaceUrl: string;
  cleanSpaceUrl: string;
  sharedSubscriberReference?: string | null;
  sharedSubscriberPassword?: string | null;
  signalwireNumber?: string | null;
  dialAddress?: string | null;
}

/** Load the active VoIPConfig from DB only. Configure via Admin → Settings. */
export async function getActiveConfig(): Promise<SWConfig | null> {
  let record = await db.voIPConfig.findFirst({ where: { active: true } });
  if (!record) record = await db.voIPConfig.findFirst({ orderBy: { createdAt: 'desc' } });

  if (!record?.projectId || !record?.apiToken || !record?.spaceUrl) return null;

  const cleanSpaceUrl = record.spaceUrl.replace(/^https?:\/\//i, '').replace(/\/$/, '').trim();

  return {
    projectId: record.projectId,
    apiToken: record.apiToken,
    spaceUrl: record.spaceUrl,
    cleanSpaceUrl,
    sharedSubscriberReference: record.sharedSubscriberReference || null,
    sharedSubscriberPassword: record.sharedSubscriberPassword || null,
    signalwireNumber: record.signalwireNumber || null,
    dialAddress: record.dialAddress || null,
  };
}

export function basicAuth(config: SWConfig): string {
  return 'Basic ' + Buffer.from(`${config.projectId}:${config.apiToken}`).toString('base64');
}

/** Generate a Fabric subscriber token */
export async function generateToken(config: SWConfig): Promise<{ token: string } | { error: string }> {
  const { sharedSubscriberReference: ref, sharedSubscriberPassword: pwd } = config;
  if (!ref || !pwd) return { error: 'Shared subscriber not configured. Fill in shared_subscriber_reference and shared_subscriber_password in Admin → Settings.' };

  const url = `https://${config.cleanSpaceUrl}/api/fabric/subscribers/tokens`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: basicAuth(config) },
    body: JSON.stringify({ reference: ref, password: pwd }),
  });

  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { data = { raw: text }; }

  if (!res.ok) {
    const msg = (data.message || data.error || `HTTP ${res.status}`) as string;
    return { error: `Token generation failed: ${msg}` };
  }

  const token = (data.token || data.jwt_token || data.jwt) as string | undefined;
  if (!token) return { error: `No token in response. Keys: ${Object.keys(data).join(', ')}` };
  return { token };
}

/** Fetch phone numbers from SignalWire account */
export async function fetchNumbers(config: SWConfig) {
  const url = `https://${config.cleanSpaceUrl}/api/laml/2010-04-01/Accounts/${config.projectId}/IncomingPhoneNumbers`;
  const res = await fetch(url, {
    headers: { Authorization: basicAuth(config), Accept: 'application/json' },
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { return { success: false, error: `Parse error. HTTP ${res.status}` }; }

  if (!res.ok) return { success: false, error: `HTTP ${res.status}: ${JSON.stringify(data).slice(0, 200)}` };

  const numbers = ((data.incoming_phone_numbers as Array<{
    phone_number: string;
    friendly_name: string;
    sid: string;
    capabilities?: { voice?: boolean };
  }>) || []).filter((n) => n.capabilities?.voice !== false);

  return { success: true, numbers };
}

/** Verify API credentials by fetching the account record. */
export async function fetchAccount(config: SWConfig) {
  const url = `https://${config.cleanSpaceUrl}/api/laml/2010-04-01/Accounts/${config.projectId}.json`;
  try {
    const res = await fetch(url, { headers: { Authorization: basicAuth(config), Accept: 'application/json' } });
    const text = await res.text();
    let data: Record<string, unknown>;
    try { data = JSON.parse(text); } catch { return { ok: false, error: `Parse error. HTTP ${res.status}` }; }
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${(data.message || data.detail || '') as string}` };
    return { ok: true, friendlyName: (data.friendly_name as string) || null, status: (data.status as string) || null };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

/** End an active call via SignalWire Calling API */
export async function endCall(config: SWConfig, callId: string) {
  const url = `https://${config.cleanSpaceUrl}/api/calling/calls`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: basicAuth(config) },
    body: JSON.stringify({ command: 'calling.end', params: { id: callId } }),
  });
  return res.status;
}
