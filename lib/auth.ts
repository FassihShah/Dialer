import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { db } from './db';
import type { UserRole, UserStatus } from '@prisma/client';

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: { type: 'email' }, password: { type: 'password' } },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await db.user.findUnique({ where: { email: credentials.email as string } });
        if (!user || user.status === 'suspended') return null;
        const valid = await bcrypt.compare(credentials.password as string, user.password);
        if (!valid) return null;
        return { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, workspaceId: user.workspaceId };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, populate from the authorize() return value
      if (user) {
        token.id = user.id;
        token.role = (user as { role: UserRole }).role;
        token.status = (user as { status: UserStatus }).status;
        token.workspaceId = (user as { workspaceId: string | null }).workspaceId;
        return token;
      }
      // On every subsequent request, re-read mutable fields from DB so that
      // admin changes (workspace placement, suspension, role change) take
      // effect immediately without requiring a re-login.
      if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, workspaceId: true },
        });
        if (dbUser) {
          token.role = dbUser.role;
          token.status = dbUser.status;
          token.workspaceId = dbUser.workspaceId;
        }
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.status = token.status as UserStatus;
      session.user.workspaceId = (token.workspaceId ?? null) as string | null;
      return session;
    },
  },
});
