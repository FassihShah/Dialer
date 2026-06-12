import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status') || '';

  const where: Record<string, unknown> = { userId: session.user.id };
  if (status && status !== 'all') where.status = status;

  const leads = await db.lead.findMany({
    where,
    orderBy: [{ queueOrder: 'asc' }, { createdAt: 'desc' }],
  });

  const header = ['Full Name','Company','Job Title','Phone','Email','Industry','Region','Website','Status','Call Count','Last Called','Follow-up Date','Notes','Created At'];
  const rows = leads.map((l) => [
    l.fullName,
    l.companyName || '',
    l.jobTitle || '',
    l.phone,
    l.email || '',
    l.industry || '',
    l.region || '',
    l.companyWebsite || '',
    l.status,
    String(l.callCount),
    l.lastCalledAt ? format(new Date(l.lastCalledAt), 'yyyy-MM-dd HH:mm') : '',
    l.followUpDate ? format(new Date(l.followUpDate), 'yyyy-MM-dd') : '',
    (l.notes || '').replace(/\n/g, ' '),
    format(new Date(l.createdAt), 'yyyy-MM-dd HH:mm'),
  ]);

  const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="leads_${format(new Date(), 'yyyyMMdd')}.csv"`,
    },
  });
}
