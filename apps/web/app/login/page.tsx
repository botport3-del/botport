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
              ? 'Login session expired — please try again.'
              : 'Something went wrong signing in. Please try again.'}
          </p>
        )}

        <a href="/api/auth/login" className="btn-primary mt-6 w-full">
          Continue with Discord
        </a>

        {env.devLoginEnabled && (
          <p className="mt-4 text-xs text-slate-500">
            Dev mode: no Discord app configured — the button uses a local demo account.
          </p>
        )}

        <p className="mt-6 text-xs text-slate-500">
          By continuing you agree that Botport stores only the data shown in your dashboard.
        </p>
      </div>
    </main>
  );
}
