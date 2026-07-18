import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { VerificationForm } from './verification-form';

export const dynamic = 'force-dynamic';

export default async function VerificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const guild = await requireGuildAccess(user.id, id);
  const s = guild.settings;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Verification</h2>
        <p className="text-sm text-slate-400">
          Configure how new members verify. Members reach the verify page from the button posted by
          the <code>/verify-embed</code> command.
        </p>
      </div>
      <VerificationForm
        guildId={guild.id}
        settings={{
          verifyEnabled: s?.verifyEnabled ?? false,
          captchaEnabled: s?.captchaEnabled ?? true,
          requireOAuthIdentify: s?.requireOAuthIdentify ?? false,
          verifyRoleId: s?.verifyRoleId ?? '',
          autoRoleIds: (s?.autoRoleIds ?? []).join(', '),
          minAccountAgeDays: s?.minAccountAgeDays ?? 0,
          logChannelId: s?.logChannelId ?? '',
          verifyPageTitle: s?.verifyPageTitle ?? '',
          verifyPageColor: s?.verifyPageColor ?? '#5865F2',
        }}
      />
    </div>
  );
}
