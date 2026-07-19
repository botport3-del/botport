import Link from 'next/link';
import { env } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md text-center">
        <Link href="/" className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-brand text-xl font-bold text-white">
          B
        </Link>
        <h1 className="mt-5 text-2xl font-semibold">Welcome to Botport</h1>
        <p className="mt-2 text-sm text-slate-400">
          Sign in with Discord to manage your servers, backups and verification.
        </p>

        {error && (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error === 'oauth_state'
              ? 'Login session expired - please try again.'
              : 'Something went wrong signing in. Please try again.'}
          </p>
        )}

        <a href="/api/auth/login" className="btn-primary mt-6 w-full">
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
            <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.5c1.6.4 2.9 1 4.2 1.7A13.4 13.4 0 0 0 5 5.2 18.6 18.6 0 0 1 8.8 3.5L8.6 3a19.7 19.7 0 0 0-4.9 1.5C1 8.6.2 12.7.6 16.7a19.9 19.9 0 0 0 6 3l.8-1.3c-.7-.2-1.3-.5-1.9-.9l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.2.7-1.9 1l.8 1.2a19.8 19.8 0 0 0 6-3c.5-4.7-.8-8.8-3.3-12.3ZM8.9 14.3c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Zm6.2 0c-1 0-1.8-.9-1.8-2s.8-2 1.8-2 1.8.9 1.8 2-.8 2-1.8 2Z" />
          </svg>
          Continue with Discord
        </a>

        {env.devLoginEnabled && (
          <p className="mt-4 text-xs text-slate-500">
            Dev mode: no Discord app configured - the button uses a local demo account.
          </p>
        )}

        <p className="mt-6 text-xs text-slate-500">
          By continuing you agree that Botport stores only the data shown in your dashboard.
        </p>
      </div>
    </main>
  );
}
