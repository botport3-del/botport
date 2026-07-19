import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { ArchiveIcon, ShieldIcon, GateIcon, TeamIcon, CheckIcon } from '@/components/icons';

const features = [
  {
    Icon: ArchiveIcon,
    title: 'Automatic backups',
    body: 'Hourly or daily snapshots of roles, channels, categories, permissions and server settings - stored and ready to restore.',
  },
  {
    Icon: ShieldIcon,
    title: 'One-click recovery',
    body: 'Rebuild the whole structure after a nuke or deletion. Restore is additive, so it never wipes your live server.',
  },
  {
    Icon: GateIcon,
    title: 'Verification & anti-raid',
    body: 'A CAPTCHA gate, minimum account age and a blacklist keep raiders and alt accounts out. Members see exactly what is stored.',
  },
  {
    Icon: TeamIcon,
    title: 'Team & audit log',
    body: 'Invite staff with scoped, role-based permissions. Every privileged action is recorded in an audit log.',
  },
];

const compareRows: [string, string, string, boolean][] = [
  ['Backs up your server structure', 'Yes', 'Yes', true],
  ['Stores member IP / email / device', 'Never', 'Often', false],
  ['Stores OAuth tokens to add members elsewhere', 'Never', 'Yes', false],
  ['Shows members what is collected', 'Always', 'Rarely', true],
  ["Complies with Discord's Terms of Service", 'Yes', 'No', true],
];

const commands: [string, string][] = [
  ['/backup', 'Take a snapshot of the server now.'],
  ['/restore', 'Rebuild the server from its most recent backup.'],
  ['/verify-embed', 'Post the verification message with a Verify button.'],
  ['/blacklist add / remove', 'Block or unblock a user from verifying.'],
  ['/info', "Show a member's verification status and account age."],
];

const tiers = [
  { name: 'Free', price: '$0', features: ['1 server', 'Daily backups', 'CAPTCHA verification'] },
  {
    name: 'Premium',
    price: '$4.97',
    features: ['5 servers', 'Hourly backups', 'Auto roles & blacklist'],
    highlight: true,
  },
  {
    name: 'Plus',
    price: '$9.97',
    features: ['Unlimited servers', 'Team roles & audit log', 'Priority support'],
  },
];

export default function HomePage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="container-page grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <div className="eyebrow">Discord backup &amp; verification</div>
            <h1 className="mt-4 max-w-[14ch] text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
              Rebuild your server in <span className="text-brand">one click</span> after a raid.
            </h1>
            <p className="mt-5 max-w-md text-lg text-slate-400">
              Devorju keeps automatic backups of your roles, channels and settings, and screens new
              members with a CAPTCHA gate - without logging their IPs, emails or storing OAuth
              tokens.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/login" className="btn-primary px-5 py-2.5">
                Add to Discord
              </Link>
              <Link href="#features" className="btn-ghost px-5 py-2.5">
                How it works
              </Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-500">
              <span>
                <CheckIcon className="inline h-3.5 w-3.5 text-emerald-400" /> No OAuth token storage
              </span>
              <span>
                <CheckIcon className="inline h-3.5 w-3.5 text-emerald-400" /> No IP or email logging
              </span>
              <span>
                <CheckIcon className="inline h-3.5 w-3.5 text-emerald-400" /> Restores your own server
              </span>
            </div>
          </div>

          {/* Product mock */}
          <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-raised shadow-2xl">
            <div className="flex items-center gap-2 border-b border-surface-border bg-black/20 px-4 py-3">
              <span className="h-2.5 w-2.5 rounded-full bg-surface-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-border" />
              <span className="h-2.5 w-2.5 rounded-full bg-surface-border" />
              <span className="ml-2 font-mono text-xs text-slate-500">devorju / restore</span>
            </div>
            <div className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Demo Community</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-400">
                  Restored
                </span>
              </div>
              {[
                ['#', 'general', 'channel'],
                ['#', 'announcements', 'channel'],
                ['@', 'Member', 'role'],
                ['@', 'Moderator', 'role'],
              ].map(([sym, name, kind]) => (
                <div
                  key={name}
                  className="mt-2 flex items-center gap-2.5 rounded-lg border border-surface-border bg-surface px-2.5 py-2 text-sm"
                >
                  <span className="text-slate-500">{sym}</span>
                  <span className="flex-1">{name}</span>
                  <span className="text-xs font-medium text-emerald-400">{kind}</span>
                </div>
              ))}
              <div className="mt-3.5 flex justify-between text-xs text-slate-500">
                <span className="font-mono">42 roles / 68 channels</span>
                <span>restored in 3.1s</span>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="border-t border-surface-border">
          <div className="section">
            <div className="eyebrow">Features</div>
            <h2 className="mt-2.5 max-w-2xl text-3xl font-bold sm:text-4xl">
              Everything to protect and recover a server
            </h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Four things a community needs when a raid hits - and nothing that quietly collects your
              members&apos; data.
            </p>
            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              {features.map(({ Icon, title, body }) => (
                <div key={title} className="card">
                  <div className="grid h-10 w-10 place-items-center rounded-lg border border-surface-border bg-brand/10 text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                  <p className="mt-2 text-sm text-slate-400">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Comparison */}
        <section id="compare" className="border-t border-surface-border">
          <div className="section">
            <div className="eyebrow">Why Devorju</div>
            <h2 className="mt-2.5 max-w-2xl text-3xl font-bold sm:text-4xl">
              Protection without the data harvesting
            </h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Many “recovery” bots quietly store OAuth tokens and member data so they can add people
              to other servers. Devorju does not - and that difference is the whole point.
            </p>
            <div className="mt-8 overflow-x-auto rounded-xl border border-surface-border">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-raised text-xs uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3.5 text-left font-medium">Capability</th>
                    <th className="bg-brand/10 px-4 py-3.5 text-left font-medium text-brand">
                      Devorju
                    </th>
                    <th className="px-4 py-3.5 text-left font-medium">Typical member-pulling bot</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map(([cap, us, them, usGood]) => (
                    <tr key={cap} className="border-t border-surface-border">
                      <td className="px-4 py-3.5 text-slate-400">{cap}</td>
                      <td
                        className={`bg-brand/[0.06] px-4 py-3.5 font-semibold ${usGood ? 'text-emerald-400' : 'text-emerald-400'}`}
                      >
                        {us}
                      </td>
                      <td
                        className={`px-4 py-3.5 font-semibold ${them === 'Yes' && !usGood ? 'text-red-400' : them === 'Often' || them === 'No' || them === 'Rarely' ? 'text-red-400' : 'text-slate-300'}`}
                      >
                        {them}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Commands */}
        <section id="commands" className="border-t border-surface-border">
          <div className="section">
            <div className="eyebrow">Commands</div>
            <h2 className="mt-2.5 text-3xl font-bold sm:text-4xl">Slash commands</h2>
            <p className="mt-3 max-w-2xl text-slate-400">
              Everything is on the dashboard too - but admins can run the essentials right from
              Discord.
            </p>
            <div className="mt-8 overflow-hidden rounded-xl border border-surface-border">
              {commands.map(([cmd, desc]) => (
                <div
                  key={cmd}
                  className="flex flex-col gap-1 border-t border-surface-border px-4 py-3.5 first:border-t-0 sm:flex-row sm:items-baseline sm:gap-4"
                >
                  <code className="min-w-[160px] rounded bg-black/30 px-2 py-1 font-mono text-sm text-brand">
                    {cmd}
                  </code>
                  <span className="text-sm text-slate-400">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-t border-surface-border">
          <div className="section">
            <div className="eyebrow">Pricing</div>
            <h2 className="mt-2.5 text-3xl font-bold sm:text-4xl">Start free, upgrade when you grow</h2>
            <div className="mt-10 grid gap-5 md:grid-cols-3">
              {tiers.map((t) => (
                <div
                  key={t.name}
                  className={`card flex flex-col ${t.highlight ? 'border-brand' : ''}`}
                >
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                    {t.name}
                  </h3>
                  <div className="mt-2 text-3xl font-bold">
                    {t.price}
                    <span className="text-sm font-normal text-slate-500"> / mo</span>
                  </div>
                  <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                    {t.features.map((f) => (
                      <li key={f} className="flex gap-2.5">
                        <CheckIcon className="mt-0.5 h-4 w-4 flex-none text-brand" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`mt-6 ${t.highlight ? 'btn-primary' : 'btn-ghost'}`}
                  >
                    Add to Discord
                  </Link>
                </div>
              ))}
            </div>
            <p className="mt-6 text-xs text-slate-500">
              Prices are illustrative - billing is not enabled in this build.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-surface-border">
          <div className="section">
            <div className="card flex flex-wrap items-center justify-between gap-6 p-10">
              <div>
                <h2 className="text-2xl font-bold">Protect your server today</h2>
                <p className="mt-2 text-slate-400">
                  Free to start - no credit card, no member data harvesting.
                </p>
              </div>
              <Link href="/login" className="btn-primary px-6 py-3">
                Add to Discord
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
