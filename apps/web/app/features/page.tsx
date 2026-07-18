import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const groups = [
  {
    title: 'Backup & recovery',
    items: [
      ['Automatic backups', 'Hourly or daily snapshots of roles, channels, categories and settings.'],
      ['One-click restore', 'Rebuild your server structure from any backup after a raid or deletion.'],
      ['Additive restore', 'Restores create missing structure and never delete your live server.'],
      ['Manual snapshots', 'Trigger a backup anytime from the dashboard or with /backup.'],
    ],
  },
  {
    title: 'Verification & anti-raid',
    items: [
      ['Transparent CAPTCHA', 'Cloudflare Turnstile challenge — privacy-friendly, no tracking.'],
      ['Consent-based identity', 'Optional Discord identify with a visible consent notice.'],
      ['Minimum account age', 'Reject brand-new accounts using the account creation date.'],
      ['Blacklist & review', 'Block known bad actors and review verification logs.'],
    ],
  },
  {
    title: 'Management',
    items: [
      ['Auto roles', 'Grant roles automatically when a member verifies.'],
      ['Team access', 'Invite staff with scoped, role-based permissions.'],
      ['Audit log', 'Every privileged action is recorded.'],
      ['Discord + web logs', 'Verification events post to a channel and the dashboard.'],
    ],
  },
];

export default function FeaturesPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-16">
        <h1 className="text-4xl font-bold">Features</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Everything you need to protect and recover your Discord community — without harvesting
          your members&apos; data.
        </p>

        <div className="mt-12 space-y-12">
          {groups.map((g) => (
            <section key={g.title}>
              <h2 className="text-xl font-semibold">{g.title}</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {g.items.map(([title, body]) => (
                  <div key={title} className="card">
                    <h3 className="font-medium">{title}</h3>
                    <p className="mt-1 text-sm text-slate-400">{body}</p>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
