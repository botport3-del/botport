import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CheckIcon } from '@/components/icons';

export const metadata = { title: 'Pricing' };

const tiers = [
  {
    name: 'Free',
    price: '$0',
    highlight: false,
    features: ['1 server', 'Daily backups', 'CAPTCHA verification', 'Anti-raid basics', 'Community support'],
  },
  {
    name: 'Premium',
    price: '$4.97',
    highlight: true,
    features: ['5 servers', 'Hourly backups', 'Auto roles', 'Blacklist & review', 'Priority support'],
  },
  {
    name: 'Plus',
    price: '$9.97',
    highlight: false,
    features: ['Unlimited servers', 'Hourly backups', 'Full team RBAC', 'Audit log', 'Priority support'],
  },
];

export default function PricingPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-16">
        <div className="eyebrow">Pricing</div>
        <h1 className="mt-2.5 text-4xl font-bold">Start free, upgrade when you grow</h1>
        <p className="mt-3 max-w-xl text-slate-400">
          Every plan includes the core protection. Upgrade for more servers and faster backups.
          Cancel anytime.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {tiers.map((t) => (
            <div key={t.name} className={`card flex flex-col ${t.highlight ? 'border-brand' : ''}`}>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                  {t.name}
                </h2>
                {t.highlight && (
                  <span className="rounded-full bg-brand/15 px-2.5 py-0.5 text-xs font-semibold text-brand">
                    Most popular
                  </span>
                )}
              </div>
              <div className="mt-2 text-3xl font-bold">
                {t.price}
                <span className="text-sm font-normal text-slate-500"> / mo</span>
              </div>
              <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                {t.features.map((f) => (
                  <li key={f} className="flex gap-2.5">
                    <CheckIcon className="mt-0.5 h-4 w-4 flex-none text-brand" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link href="/login" className={`mt-6 ${t.highlight ? 'btn-primary' : 'btn-ghost'}`}>
                Add to Discord
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-xs text-slate-500">
          Prices are illustrative - billing is not enabled in this build.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
