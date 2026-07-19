import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata = { title: 'FAQ' };

const faqs = [
  [
    'Does Devorju steal or "pull" members into other servers?',
    'No. Devorju never stores OAuth tokens to add members elsewhere - that violates Discord’s Terms of Service. Recovery only re-creates your own server’s structure.',
  ],
  [
    'What member data do you collect?',
    'Only a member’s Discord ID, username and whether they verified. We never collect IP addresses, email or device information through verification.',
  ],
  [
    'Can you restore my messages?',
    'Backups capture server structure - roles, channels, categories, permissions and settings. Discord does not allow re-posting message history as the original authors, so message content is not restored.',
  ],
  [
    'How does verification work?',
    'Members click a Verify button in Discord, then complete a CAPTCHA on a branded page. On success the bot grants your verified role. Optionally you can require a consent-based Discord identity check.',
  ],
  [
    'How does anti-raid protection work?',
    'You can require a minimum account age (derived from the account creation date), blacklist known bad actors, and review every verification in the logs.',
  ],
  [
    'Do I need to host anything?',
    'You invite the Devorju bot to your server and configure it from the dashboard. Backups run automatically on your chosen schedule.',
  ],
];

export default function FaqPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-16">
        <h1 className="text-4xl font-bold">Frequently asked questions</h1>
        <div className="mt-10 max-w-3xl space-y-4">
          {faqs.map(([q, a]) => (
            <details key={q} className="card">
              <summary className="cursor-pointer list-none font-medium">{q}</summary>
              <p className="mt-3 text-sm text-slate-400">{a}</p>
            </details>
          ))}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
