import { NextResponse } from 'next/server';
import { prisma } from 'db';
import { env } from '@/lib/env';
import { createSession } from '@/lib/session';
import { getBaseUrl } from '@/lib/base-url';

/**
 * Local-only login shortcut used when no Discord OAuth app is configured.
 * Creates/uses a demo user so the dashboard can be exercised end-to-end.
 * Disabled entirely in production.
 */
export async function GET() {
  if (!env.devLoginEnabled) {
    return NextResponse.json({ error: 'dev login disabled' }, { status: 404 });
  }

  const user = await prisma.user.upsert({
    where: { discordId: '100000000000000001' },
    update: {},
    create: {
      discordId: '100000000000000001',
      username: 'demo-owner',
      globalName: 'Demo Owner',
      email: 'demo@example.com',
    },
  });

  await createSession({ userId: user.id, discordId: user.discordId });
  return NextResponse.redirect(`${await getBaseUrl()}/dashboard`);
}
