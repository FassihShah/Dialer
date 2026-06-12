import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const OUTCOMES = ['cold', 'warm', 'meeting_booked', 'not_interested', 'callback', 'no_answer', 'do_not_call'] as const;

export async function GET(req: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { userId } = await params;
  const days = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('days') || '30'), 1), 365);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, role: true, status: true, createdAt: true,
      phoneAssignment: { include: { phoneNumber: true } },
    },
  });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const logs = await db.callLog.findMany({
    where: { userId, dateTime: { gte: since } },
    select: { id: true, durationSeconds: true, outcome: true, dateTime: true, followUpCreated: true, leadName: true, leadCompany: true, calledFromNumber: true },
    orderBy: { dateTime: 'desc' },
  });

  const totalCalls = logs.length;
  const totalTalkSeconds = logs.reduce((s, l) => s + (l.durationSeconds || 0), 0);
  const connectedCalls = logs.filter((l) => (l.durationSeconds || 0) > 0).length;
  const meetingsBooked = logs.filter((l) => l.outcome === 'meeting_booked').length;
  const followUpsCreated = logs.filter((l) => l.followUpCreated).length;
  const avgDuration = connectedCalls ? Math.round(totalTalkSeconds / connectedCalls) : 0;
  const connectRate = totalCalls ? Math.round((connectedCalls / totalCalls) * 100) : 0;
  const conversionRate = totalCalls ? Math.round((meetingsBooked / totalCalls) * 100) : 0;

  const outcomeBreakdown = OUTCOMES.map((o) => ({ outcome: o, count: logs.filter((l) => l.outcome === o).length }));

  const dayMap = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }
  for (const l of logs) {
    const key = new Date(l.dateTime).toISOString().slice(0, 10);
    if (dayMap.has(key)) dayMap.set(key, (dayMap.get(key) || 0) + 1);
  }
  const timeSeries = Array.from(dayMap.entries()).map(([date, calls]) => ({ date, calls }));

  const totalLeads = await db.lead.count({ where: { userId } });
  const pendingFollowUps = await db.followUp.count({ where: { userId, status: 'pending' } });

  return NextResponse.json({
    user: {
      id: user.id, name: user.name, email: user.email, role: user.role, status: user.status,
      createdAt: user.createdAt,
      assignedNumber: user.phoneAssignment?.phoneNumber?.phoneNumber || null,
    },
    range: { days },
    kpis: { totalCalls, totalTalkSeconds, connectedCalls, meetingsBooked, followUpsCreated, avgDuration, connectRate, conversionRate, totalLeads, pendingFollowUps },
    outcomeBreakdown,
    timeSeries,
    recentCalls: logs.slice(0, 25),
  });
}
