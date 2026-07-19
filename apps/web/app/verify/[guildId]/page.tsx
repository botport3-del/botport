import { prisma } from 'db';
import { env } from '@/lib/env';
import { verifyVerifyToken } from '@/lib/verify-token';
import { VerifyForm } from './verify-form';

export const dynamic = 'force-dynamic';

function Shell({ children, color }: { children: React.ReactNode; color?: string }) {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md text-center">
        <div
          className="mx-auto grid h-12 w-12 place-items-center rounded-xl text-xl font-bold text-white"
          style={{ backgroundColor: color || '#5865F2' }}
        >
          B
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
        Complete the check below to gain access. We only store your Discord username and the fact
        that you verified - never your IP, email or device.
      </p>

      <div className="mt-6">
        <VerifyForm
          token={token!}
          siteKey={env.turnstileSiteKey}
          captchaEnabled={settings.captchaEnabled}
        />
      </div>
    </Shell>
  );
}
