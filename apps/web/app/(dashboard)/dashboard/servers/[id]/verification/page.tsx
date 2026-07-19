import { requireUser } from '@/lib/auth';
import { requireGuildAccess } from '@/lib/guild-access';
import { listGuildChannels } from '@/lib/discord/bot-api';
import { VerificationForm } from './verification-form';
import { PostEmbedForm } from './post-embed-form';

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

  // Fetch channels via the bot so the user can pick from a dropdown.
  const channels = (await listGuildChannels(guild.discordId))
    .filter((c) => c.type === 0 || c.type === 5) // text/announcement only
    .sort((a, b) => a.position - b.position);

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-xs uppercase tracking-wider text-brand">Verification</div>
        <h2 className="mt-1.5 text-lg font-semibold">Verification settings</h2>
        <p className="text-sm text-slate-400">
          Configure how new members verify, and post the Verify button into a channel - all from
          here.
        </p>
      </div>

      <PostEmbedForm
        guildId={guild.id}
        channels={channels.map((c) => ({ id: c.id, name: c.name }))}
        defaultTitle={s?.verifyPageTitle ?? ''}
        defaultDescription=""
      />

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
