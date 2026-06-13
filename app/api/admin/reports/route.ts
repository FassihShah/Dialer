import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

const OUTCOMES = ['cold', 'warm', 'meeting_booked', 'not_interested', 'callback', 'no_answer', 'do_not_call'] as const;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const days = Math.min(Math.max(parseInt(req.nextUrl.searchParams.get('days') || '30'), 1), 365);
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (days - 1));

  const ws = session.user.workspaceId;
  const logs = await db.callLog.findMany({
    where: { workspaceId: ws, dateTime: { gte: since } },
    select: {
      id: true, userId: true, durationSeconds: true, outcome: true, dateTime: true,
      followUpCreated: true, user: { select: { id: true, name: true } },
    },
    orderBy: { dateTime: 'asc' },
  });

  const totalCalls = logs.length;
  const totalTalkSeconds = logs.reduce((s, l) => s + (l.durationSeconds || 0), 0);
  const connectedCalls = logs.filter((l) => (l.durationSeconds || 0) > 0).length;
  const meetingsBooked = logs.filter((l) => l.outcome === 'meeting_booked').length;
  const followUpsCreated = logs.filter((l) => l.followUpCreated).length;
  const avgDuration = connectedCalls ? Math.round(totalTalkSeconds / connectedCalls) : 0;
  const connectRate = totalCalls ? Math.round((connectedCalls / totalCalls) * 100) : 0;
  const conversionRate = totalCalls ? Math.round((meetingsBooked / totalCalls) * 100) : 0;

  // Outcome breakdown
  const outcomeBreakdown = OUTCOMES.map((o) => ({
    outcome: o,
    count: logs.filter((l) => l.outcome === o).length,
  }));

  // Daily time series (fill every day in range, even zero days)
  const dayMap = new Map<string, { calls: number; talk: number; meetings: number }>();
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    dayMap.set(d.toISOString().slice(0, 10), { calls: 0, talk: 0, meetings: 0 });
  }
  for (const l of logs) {
    const key = new Date(l.dateTime).toISOString().slice(0, 10);
    const e = dayMap.get(key);
    if (e) {
      e.calls += 1;
      e.talk += l.durationSeconds || 0;
      if (l.outcome === 'meeting_booked') e.meetings += 1;
    }
  }
  const timeSeries = Array.from(dayMap.entries()).map(([date, v]) => ({ date, ...v }));

  // Per-agent leaderboard
  const agentMap = new Map<string, { id: string; name: string; calls: number; talk: number; meetings: number; connected: number }>();
  for (const l of logs) {
    const id = l.userId;
    if (!agentMap.has(id)) agentMap.set(id, { id, name: l.user?.name || 'Unknown', calls: 0, talk: 0, meetings: 0, connected: 0 });
    const a = agentMap.get(id)!;
    a.calls += 1;
    a.talk += l.durationSeconds || 0;
    if (l.outcome === 'meeting_booked') a.meetings += 1;
    if ((l.durationSeconds || 0) > 0) a.connected += 1;
  }
  const agents = Array.from(agentMap.values())
    .map((a) => ({
      ...a,
      connectRate: a.calls ? Math.round((a.connected / a.calls) * 100) : 0,
      conversionRate: a.calls ? Math.round((a.meetings / a.calls) * 100) : 0,
    }))
    .sort((x, y) => y.calls - x.calls);

  // Lead pipeline snapshot (all-time, by current status)
  const leadGroups = await db.lead.groupBy({ by: ['status'], where: { workspaceId: ws }, _count: { _all: true } });
  const pendingFollowUps = await db.followUp.count({ where: { workspaceId: ws, status: 'pending' } });

  return NextResponse.json({
    range: { days, since: since.toISOString() },
    kpis: { totalCalls, totalTalkSeconds, connectedCalls, meetingsBooked, followUpsCreated, avgDuration, connectRate, conversionRate, pendingFollowUps },
    outcomeBreakdown,
    timeSeries,
    agents,
    leadPipeline: leadGroups.map((g) => ({ status: g.status, count: g._count._all })),
  });
}
