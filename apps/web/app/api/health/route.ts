import { NextResponse } from 'next/server';
import { prisma } from 'db';

export const dynamic = 'force-dynamic';

/**
 * Lightweight diagnostics endpoint. Reports whether required environment is
 * present and whether the database is reachable — without exposing secrets.
 */
export async function GET() {
  const env = {
    DISCORD_CLIENT_ID: Boolean(process.env.DISCORD_CLIENT_ID),
    DISCORD_CLIENT_SECRET: Boolean(process.env.DISCORD_CLIENT_SECRET),
    DISCORD_BOT_TOKEN: Boolean(process.env.DISCORD_BOT_TOKEN),
    DATABASE_URL: Boolean(process.env.DATABASE_URL),
    AUTH_SECRET: Boolean(process.env.AUTH_SECRET),
  };

  let db: { ok: boolean; error?: string } = { ok: false };
  try {
    const count = await prisma.user.count();
    db = { ok: true, error: `users=${count}` };
  } catch (e) {
    db = { ok: false, error: e instanceof Error ? e.message : String(e) };
  }

  return NextResponse.json({ env, db });
}
