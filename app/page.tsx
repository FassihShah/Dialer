import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';

export default async function Root() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.status === 'pending') redirect('/pending');
  if (session.user.status === 'suspended') redirect('/login');
  if (session.user.role === 'admin') redirect('/admin/dashboard');
  redirect('/dialer');
}
