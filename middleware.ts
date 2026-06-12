import NextAuth from 'next-auth';
import { authConfig } from '@/lib/auth.config';

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ['/((?!api/signalwire/webhook|api/signalwire/swml|api/auth/register|_next/static|_next/image|favicon.ico|login|register|pending).*)'],
};
