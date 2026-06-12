import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { getActiveConfig, generateToken } from '@/lib/signalwire';

export const dynamic = 'force-dynamic';

// Returns the current user's assigned phone number + live calling readiness.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const assignment = await db.phoneNumberAssignment.findFirst({
    where: { userId: session.user.id },
    include: { phoneNumber: true },
  });

  const config = await getActiveConfig();
  let callingReady = false;
  let callingError: string | null = null;

  if (!config) {
    callingError = 'Dialer not configured by admin yet.';
  } else {
    const token = await generateToken(config);
    if ('error' in token) { callingError = token.error; }
    else { callingReady = true; }
  }

  const number = assignment?.phoneNumber;

  return NextResponse.json({
    hasNumber: !!number,
    number: number
      ? {
          phoneNumber: number.phoneNumber,
          label: number.label,
          country: number.country,
          status: number.status,
          assignedAt: assignment?.createdAt ?? null,
        }
      : null,
    // Falls back to the shared default caller ID when no personal number is assigned.
    defaultCallerId: config?.signalwireNumber || null,
    callingReady,
    callingError,
  });
}
