import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generatePitch } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const lead = await req.json();
  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({ error: 'AI not configured. Add DEEPSEEK_API_KEY to .env' }, { status: 503 });
  }

  try {
    const pitch = await generatePitch(lead);
    return NextResponse.json({ pitch });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
