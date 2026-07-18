import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    highlight: false,
    features: ['1 server', 'Daily backups', 'CAPTCHA verification', 'Anti-raid basics', 'Community support'],
  },
  {
    name: 'Premium',
    price: '$4.97',
    period: '/mo',
    highlight: true,
    features: ['5 servers', 'Hourly backups', 'Auto roles', 'Blacklist & review', 'Priority support'],
  },
  {
    name: 'Plus',
    price: '$9.97',
    period: '/mo',
    highlight: false,
    features: ['Unlimited servers', 'Hourly backups', 'Full team RBAC', 'Audit log', 'Priority support'],
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-16">
        <h1 className="text-center text-4xl font-bold">Simple pricing</h1>
        <p className="mx-auto mt-3 max-w-xl text-center text-slate-400">
          Start free. Upgrade when your community grows. Cancel anytime.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`card flex flex-col ${t.highlight ? 'border-brand ring-1 ring-brand/40' : ''}`}
            >
              {t.highlight && (
                <span className="mb-3 inline-flex w-fit rounded-full bg-brand/20 px-2 py-0.5 text-xs text-brand">
                  Most popular
                </span>
              )}
              <h2 className="text-lg font-semibold">{t.name}</h2>
              <div className="mt-2">
                <span className="text-3xl font-bold">{t.price}</span>
                <span className="text-slate-400">{t.period}</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2 text-sm text-slate-300">
                {t.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-brand">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className={`mt-6 ${t.highlight ? 'btn-primary' : 'btn-ghost'}`}>
                Get started
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-slate-500">
          Prices are illustrative — billing is not enabled in this build.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
