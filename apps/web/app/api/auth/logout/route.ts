import { NextResponse } from 'next/server';
import { destroySession } from '@/lib/session';
import { getBaseUrl } from '@/lib/base-url';

export async function POST() {
  await destroySession();
  return NextResponse.redirect(`${await getBaseUrl()}/`, { status: 303 });
}
