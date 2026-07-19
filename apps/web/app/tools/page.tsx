import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { IdLookup } from './id-lookup';

export const metadata = {
  title: 'Tools - Devorju',
  description: 'Free Discord tools, including a Discord ID (snowflake) lookup.',
};

export default function ToolsPage() {
  return (
    <>
      <SiteHeader />
      <main className="container-page py-16">
        <div className="eyebrow">Tools</div>
        <h1 className="mt-3 text-4xl font-bold">Free Discord tools</h1>
        <p className="mt-3 max-w-2xl text-slate-400">
          Handy utilities for server admins. No account required.
        </p>

        <div className="mt-10 max-w-xl space-y-3">
          <h2 className="text-xl font-semibold">Discord ID lookup</h2>
          <p className="text-sm text-slate-400">
            Paste any Discord user, server or message ID to see exactly when it was created. Useful
            for spotting brand-new accounts during a raid.
          </p>
          <IdLookup />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
