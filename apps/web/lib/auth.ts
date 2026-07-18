import 'server-only';
import { redirect } from 'next/navigation';
import { prisma, type User } from 'db';
import { getSession } from './session';

/** Returns the logged-in user, or null. */
export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

/** Returns the logged-in user or redirects to /login. */
export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}
