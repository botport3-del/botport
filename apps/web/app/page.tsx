import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const stats = [
  ['1-click', 'server recovery'],
  ['Hourly', 'automatic backups'],
  ['0', 'IPs or emails collected'],
  ['24/7', 'raid protection'],
];

const featureRows = [
  {
    eyebrow: 'Backup & recovery',
    title: 'Never lose your server again',
    body: 'Botport takes automatic snapshots of your roles, channels, categories, permissions and settings. If your server gets nuked, raided or deleted, rebuild the entire structure in one click.',
    points: [
      'Hourly or daily automatic backups',
      'One-click restore of roles & channels',
      'Additive restore — never wipes your live server',
    ],
    icon: '🗄️',
  },
  {
    eyebrow: 'Verification',
    title: 'Stop raiders, respect members',
    body: 'Gate new members behind a fast Cloudflare Turnstile CAPTCHA and an optional consent-based identity check. Unlike other tools, Botport never secretly logs IPs, emails or device data.',
    points: [
      'Branded verify page with CAPTCHA',
      'Auto-assign roles on success',
      'Transparent — members see exactly what is stored',
    ],
    icon: '🛡️',
    reverse: true,
  },
  {
    eyebrow: 'Anti-raid & team',
    title: 'Control who gets in — and who helps you',
    body: 'Require a minimum account age, blacklist bad actors, and get raid alerts. Invite staff with scoped, role-based permissions and a full audit log of every action.',
    points: [
      'Minimum account age & blacklist',
      'Join-rate raid detection',
      'Role-based team access + audit log',
    ],
    icon: '🚧',
  },
];

const steps = [
  ['1', 'Invite the bot', 'Add Botport to a server you manage and confirm its permissions.'],
  ['2', 'Configure', 'Turn on verification, pick a verified role, and set your backup schedule.'],
  ['3', 'Relax', 'Backups run automatically and members verify themselves. Restore anytime.'],
];

const testimonials = [
  {
    quote:
      'A raid wiped half our channels overnight. One click and everything was back in minutes. Absolute lifesaver.',
    name: 'Aria',
    role: 'Owner · 48,000 members',
  },
  {
    quote:
      'Finally a protection bot that does not harvest my members data. The verification page is clean and fast.',
    name: 'Kenji',
    role: 'Admin · 22,500 members',
  },
  {
    quote:
      'Set the backup schedule once and forgot about it. The dashboard makes staff permissions trivial.',
    name: 'Mara',
    role: 'Community manager · 15,000 members',
  },
];

const tiers = [
  { name: 'Free', price: '$0', features: ['1 server', 'Daily backups', 'CAPTCHA verification'] },
  {
    name: 'Premium',
    price: '$4.97',
    features: ['5 servers', 'Hourly backups', 'Auto roles'],
    highlight: true,
  },
  { name: 'Plus', price: '$9.97', features: ['Unlimited servers', 'Full team RBAC', 'Audit log'] },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute left-1/2 top-[-10rem] h-[28rem] w-[48rem] -translate-x-1/2 rounded-full bg-brand/20 blur-3xl" />
          <div className="container-page relative pt-20 pb-16 text-center sm:pt-28">
            <span className="inline-flex items-center gap-2 rounded-full border border-surface-border bg-surface-raised px-4 py-1.5 text-xs text-slate-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Backup · Recover · Verify — without harvesting member data
            </span>
            <h1 className="mx-auto mt-6 max-w-4xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
              <span className="gradient-text">Protect your Discord</span>
              <br />
              server before disaster strikes
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
              Botport keeps automatic backups of your server, screens new members with transparent
              verification, and lets you rebuild everything in one click after a raid.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <Link href="/login" className="btn-primary px-6 py-3 text-base">
                Get started free
              </Link>
              <Link href="/features" className="btn-ghost px-6 py-3 text-base">
                See all features
              </Link>
            </div>

            <div className="mx-auto mt-16 grid max-w-3xl grid-cols-2 gap-6 sm:grid-cols-4">
              {stats.map(([value, label]) => (
                <div key={label} className="text-center">
                  <div className="text-2xl font-bold text-white sm:text-3xl">{value}</div>
                  <div className="mt-1 text-xs text-slate-400">{label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Feature rows */}
        <section className="section space-y-20">
          {featureRows.map((f) => (
            <div
              key={f.title}
              className={`grid items-center gap-10 lg:grid-cols-2 ${f.reverse ? 'lg:[&>*:first-child]:order-2' : ''}`}
            >
              <div>
                <div className="eyebrow">{f.eyebrow}</div>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">{f.title}</h2>
                <p className="mt-4 text-slate-300">{f.body}</p>
                <ul className="mt-6 space-y-3">
                  {f.points.map((p) => (
                    <li key={p} className="flex items-center gap-3 text-slate-200">
                      <span className="grid h-6 w-6 place-items-center rounded-full bg-brand/20 text-sm text-brand">
                        ✓
                      </span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                <div className="card glow flex aspect-[4/3] items-center justify-center border-brand/20 bg-gradient-to-br from-surface-raised to-surface">
                  <span className="text-7xl opacity-90">{f.icon}</span>
                </div>
              </div>
            </div>
          ))}
        </section>

        {/* How it works */}
        <section className="section">
          <div className="text-center">
            <div className="eyebrow">How it works</div>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Set up in three steps</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map(([num, title, body]) => (
              <div key={num} className="card">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-brand text-lg font-bold text-white">
                  {num}
                </div>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-2 text-sm text-slate-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="section">
          <div className="text-center">
            <div className="eyebrow">Loved by server owners</div>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Communities that bounced back</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure key={t.name} className="card flex flex-col">
                <div className="text-brand">★★★★★</div>
                <blockquote className="mt-3 flex-1 text-sm text-slate-200">“{t.quote}”</blockquote>
                <figcaption className="mt-4 border-t border-surface-border pt-4">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-slate-500">{t.role}</div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* Pricing preview */}
        <section className="section">
          <div className="text-center">
            <div className="eyebrow">Pricing</div>
            <h2 className="mt-3 text-3xl font-bold sm:text-4xl">Start free, upgrade anytime</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {tiers.map((t) => (
              <div
                key={t.name}
                className={`card flex flex-col ${t.highlight ? 'border-brand ring-1 ring-brand/40' : ''}`}
              >
                <h3 className="text-lg font-semibold">{t.name}</h3>
                <div className="mt-2 text-3xl font-bold">
                  {t.price}
                  <span className="text-sm font-normal text-slate-400">/mo</span>
                </div>
                <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-300">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span className="text-brand">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/pricing"
                  className={`mt-6 ${t.highlight ? 'btn-primary' : 'btn-ghost'}`}
                >
                  View plans
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="section">
          <div className="card glow relative overflow-hidden border-brand/30 bg-gradient-to-br from-brand/15 to-surface-raised py-14 text-center">
            <h2 className="text-3xl font-bold sm:text-4xl">Ready to secure your community?</h2>
            <p className="mx-auto mt-3 max-w-xl text-slate-300">
              Connect your server in minutes. Free to start — no credit card, no member data
              harvesting.
            </p>
            <Link href="/login" className="btn-primary mt-8 inline-flex px-6 py-3 text-base">
              Open the dashboard
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
