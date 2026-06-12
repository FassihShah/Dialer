import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Match any NextAuth session cookie regardless of version/prefix:
  // v5: authjs.session-token / __Secure-authjs.session-token
  // v4: next-auth.session-token / __Secure-next-auth.session-token
  // Also handles chunked cookies (e.g. authjs.session-token.0)
  const hasSession = req.cookies
    .getAll()
    .some((c) => c.name.includes('session-token') && c.value.length > 0);

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth|api/signalwire/webhook|api/signalwire/swml|_next/static|_next/image|favicon.ico|login|register|pending).*)'],
};
