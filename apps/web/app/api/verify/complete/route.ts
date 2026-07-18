import { NextRequest, NextResponse } from 'next/server';
import { verifyVerifyToken } from '@/lib/verify-token';
import { verifyTurnstile } from '@/lib/turnstile';
import { completeVerification } from '@/lib/verify';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as {
    token?: string;
    turnstileToken?: string;
  } | null;

  if (!body?.token) {
    return NextResponse.json({ ok: false, message: 'Missing verification token.' }, { status: 400 });
  }

  const payload = await verifyVerifyToken(body.token);
  if (!payload) {
    return NextResponse.json(
      { ok: false, message: 'Your verification link has expired. Please try again from Discord.' },
      { status: 400 },
    );
  }

  const captchaOk = await verifyTurnstile(
    body.turnstileToken,
    req.headers.get('x-forwarded-for') ?? undefined,
  );
  if (!captchaOk) {
    return NextResponse.json(
      { ok: false, message: 'CAPTCHA check failed. Please try again.' },
      { status: 400 },
    );
  }

  const outcome = await completeVerification({
    guildDbId: payload.guildId,
    discordUserId: payload.discordUserId,
    username: payload.username,
    method: 'captcha',
  });

  return NextResponse.json(outcome, { status: outcome.ok ? 200 : 400 });
}
