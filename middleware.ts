import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // NextAuth v5 uses "authjs.*" cookie names (v4 used "next-auth.*").
  // Check both to be safe across versions / dev vs prod (secure prefix).
  const sessionToken =
    req.cookies.get('authjs.session-token') ||
    req.cookies.get('__Secure-authjs.session-token') ||
    req.cookies.get('next-auth.session-token') ||
    req.cookies.get('__Secure-next-auth.session-token');

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/signalwire/webhook|api/signalwire/swml|api/auth/register|_next/static|_next/image|favicon.ico|login|register|pending).*)'],
};
