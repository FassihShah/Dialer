export { auth as middleware } from '@/lib/auth';

export const config = {
  matcher: ['/((?!api/signalwire/webhook|api/signalwire/swml|api/auth/register|_next/static|_next/image|favicon.ico|login|register|pending).*)'],
};
