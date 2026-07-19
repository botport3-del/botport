import { prisma } from 'db';
import { verifyVerifyToken } from '@/lib/verify-token';

export const dynamic = 'force-dynamic';

function Shell({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md text-center">
        <div
          className="mx-auto grid h-12 w-12 place-items-center rounded-xl text-xl font-bold text-white"
          style={{ backgroundColor: color || '#5865F2' }}
        >
          D
        </div>
        {children}
      </div>
    </main>
  );
}

export default async function VerifyPage({
  params,
  searchParams,
}: {
  params: Promise<{ guildId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { guildId } = await params;
  const { token } = await searchParams;

  const payload = token ? await verifyVerifyToken(token) : null;
  if (!payload || payload.guildId !== guildId) {
    return (
      <Shell>
        <h1 className="mt-5 text-xl font-semibold">Verification link invalid</h1>
        <p className="mt-2 text-sm text-slate-400">
          This link is missing or has expired. Start verification again from the button in your
          Discord server.
        </p>
      </Shell>
    );
  }

  const guild = await prisma.guild.findUnique({
    where: { id: guildId },
    include: { settings: true },
  });
  if (!guild || !guild.settings?.verifyEnabled) {
    return (
      <Shell>
        <h1 className="mt-5 text-xl font-semibold">Verification unavailable</h1>
        <p className="mt-2 text-sm text-slate-400">
          This server has not enabled verification.
        </p>
      </Shell>
    );
  }
  const settings = guild.settings;

  return (
    <Shell color={settings.verifyPageColor ?? undefined}>
      <h1 className="mt-5 text-xl font-semibold">
        {settings.verifyPageTitle || `Verify for ${guild.name}`}
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Click below to verify with Discord. You will see exactly what access you grant on
        Discord&apos;s own consent screen.
      </p>

      <a
        href={`/api/verify/oauth-start?token=${encodeURIComponent(token!)}`}
        className="btn-primary mt-6 w-full"
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden>
          <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.5c1.6.4 2.9 1 4.2 1.7A13.4 13.4 0 0 0 5 5.2 18.6 18.6 0 0 1 8.8 3.5L8.6 3a19.7 19.7 0 0 0-4.9 1.5C1 8.6.2 12.7.6 16.7a19.9 19.9 0 0 0 6 3l.8-1.3c-.7-.2-1.3-.5-1.9-.9l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.2.7-1.9 1l.8 1.2a19.8 19.8 0 0 0 6-3c.5-4.7-.8-8.8-3.3-12.3Z" />
        </svg>
        Continue with Discord
      </a>

      <p className="mt-4 text-xs text-slate-500">
        Devorju will store your Discord ID, username and a refresh token so that the server owner
        can re-add you to their new server after a raid or move. No IP, email or device data is
        collected.
      </p>
    </Shell>
  );
}
