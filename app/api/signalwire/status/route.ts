import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActiveConfig, fetchAccount, fetchNumbers, generateToken } from '@/lib/signalwire';

export const dynamic = 'force-dynamic';

// Admin-only live SignalWire health/status snapshot.
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const config = await getActiveConfig();
  if (!config) {
    return NextResponse.json({
      configured: false,
      checkedAt: new Date().toISOString(),
    });
  }

  // Run the live checks in parallel.
  const [account, numbersResult, tokenResult] = await Promise.all([
    fetchAccount(config),
    fetchNumbers(config),
    generateToken(config),
  ]);

  // Cross-reference SignalWire numbers with DB assignments.
  const dbNumbers = await db.phoneNumber.findMany({
    include: { assignment: { include: { user: { select: { id: true, name: true, email: true } } } } },
  });
  const dbByNumber = new Map(dbNumbers.map((n) => [n.phoneNumber, n]));

  const swNumbers = (numbersResult.success && numbersResult.numbers) ? numbersResult.numbers : [];
  const numbers = swNumbers.map((n) => {
    const dbRec = dbByNumber.get(n.phone_number);
    return {
      phoneNumber: n.phone_number,
      friendlyName: n.friendly_name || null,
      sid: n.sid,
      voiceEnabled: n.capabilities?.voice !== false,
      syncedToDb: !!dbRec,
      status: dbRec?.status ?? null,
      assignedTo: dbRec?.assignment?.user ? dbRec.assignment.user.name : null,
      assignedEmail: dbRec?.assignment?.user ? dbRec.assignment.user.email : null,
    };
  });

  // Is the configured default caller ID actually present in the account?
  const defaultCallerId = config.signalwireNumber || null;
  const defaultCallerIdValid = defaultCallerId
    ? swNumbers.some((n) => n.phone_number === defaultCallerId)
    : null;

  return NextResponse.json({
    configured: true,
    checkedAt: new Date().toISOString(),
    spaceUrl: config.cleanSpaceUrl,
    projectId: config.projectId,
    dialAddress: config.dialAddress || null,
    defaultCallerId,
    defaultCallerIdValid,
    sharedSubscriberReference: config.sharedSubscriberReference || null,
    checks: {
      apiConnection: account.ok
        ? { ok: true, detail: account.friendlyName ? `Account: ${account.friendlyName} (${account.status})` : 'Connected' }
        : { ok: false, detail: account.error },
      browserCalling: 'error' in tokenResult
        ? { ok: false, detail: tokenResult.error }
        : { ok: true, detail: 'Subscriber token generated — browser calling ready' },
      numbersApi: numbersResult.success
        ? { ok: true, detail: `${swNumbers.length} number(s) on account` }
        : { ok: false, detail: numbersResult.error },
    },
    numbers,
    counts: {
      total: numbers.length,
      synced: numbers.filter((n) => n.syncedToDb).length,
      assigned: numbers.filter((n) => n.assignedTo).length,
      voiceEnabled: numbers.filter((n) => n.voiceEnabled).length,
    },
  });
}
