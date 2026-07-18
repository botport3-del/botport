import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const features = [
  {
    title: 'Automatic backups',
    body: 'Hourly or daily snapshots of your roles, channels, categories and server settings — stored safely and ready to restore.',
    icon: '🗄️',
  },
  {
    title: 'One-click recovery',
    body: 'Rebuild your server structure from any backup after a nuke, raid or accidental deletion. Roles and channels come back in order.',
    icon: '♻️',
  },
  {
    title: 'Transparent verification',
    body: 'Gate new members behind a CAPTCHA and optional consent-based checks. No hidden data collection — members always see what is stored.',
    icon: '🛡️',
  },
  {
    title: 'Anti-raid protection',
    body: 'Minimum account age, join-rate raid detection, blacklists and manual review to keep bad actors out.',
    icon: '🚧',
  },
  {
    title: 'Auto roles',
    body: 'Assign roles automatically once a member verifies, so they land in the right place without manual work.',
    icon: '🎭',
  },
  {
    title: 'Team access',
    body: 'Invite staff with scoped, role-based permissions and a full audit log of every privileged action.',
    icon: '👥',
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="container-page pt-20 pb-16 text-center">
          <span className="inline-flex rounded-full border border-surface-border bg-surface-raised px-3 py-1 text-xs text-slate-300">
            Backup · Recover · Verify
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-bold tracking-tight sm:text-6xl">
            Protect your Discord server before disaster strikes
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            Botport keeps automatic backups of your server, screens new members with transparent
            verification, and lets you rebuild everything in one click after a raid.
          </p>
          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/login" className="btn-primary">
              Get started free
            </Link>
            <Link href="/features" className="btn-ghost">
              See all features
            </Link>
          </div>
          <p className="mt-4 text-xs text-slate-500">
            No covert tracking. No token harvesting. Your members&apos; privacy respected.
          </p>
        </section>

        <section id="features" className="container-page grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="card">
              <div className="text-2xl">{f.icon}</div>
              <h3 className="mt-3 text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-slate-400">{f.body}</p>
            </div>
          ))}
        </section>

        <section className="container-page mt-24">
          <div className="card flex flex-col items-center gap-4 py-12 text-center">
            <h2 className="text-2xl font-semibold">Ready to secure your community?</h2>
            <p className="max-w-xl text-slate-400">
              Connect your server in minutes. Start on the free plan and upgrade when you need more.
            </p>
            <Link href="/login" className="btn-primary">
              Open the dashboard
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
