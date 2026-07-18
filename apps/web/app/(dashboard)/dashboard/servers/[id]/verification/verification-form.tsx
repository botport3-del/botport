'use client';

import { useActionState } from 'react';
import { saveVerificationSettings, type SettingsState } from './actions';

export interface VerificationSettingsView {
  verifyEnabled: boolean;
  captchaEnabled: boolean;
  requireOAuthIdentify: boolean;
  verifyRoleId: string;
  autoRoleIds: string;
  minAccountAgeDays: number;
  logChannelId: string;
  verifyPageTitle: string;
  verifyPageColor: string;
}

function Toggle({
  name,
  label,
  hint,
  defaultChecked,
}: {
  name: string;
  label: string;
  hint: string;
  defaultChecked: boolean;
}) {
  return (
    <label className="flex items-start gap-3">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-4 w-4" />
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-slate-500">{hint}</span>
      </span>
    </label>
  );
}

function Field({
  name,
  label,
  hint,
  defaultValue,
  type = 'text',
  placeholder,
}: {
  name: string;
  label: string;
  hint?: string;
  defaultValue: string | number;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-medium">{label}</span>
      {hint && <span className="block text-xs text-slate-500">{hint}</span>}
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
      />
    </label>
  );
}

export function VerificationForm({
  guildId,
  settings,
}: {
  guildId: string;
  settings: VerificationSettingsView;
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(
    saveVerificationSettings.bind(null, guildId),
    {},
  );

  return (
    <form action={action} className="max-w-xl space-y-6">
      <div className="card space-y-4">
        <h3 className="font-semibold">Verification</h3>
        <Toggle
          name="verifyEnabled"
          label="Enable verification"
          hint="New members must verify before accessing the server."
          defaultChecked={settings.verifyEnabled}
        />
        <Toggle
          name="captchaEnabled"
          label="Require CAPTCHA"
          hint="Show a Cloudflare Turnstile challenge on the verify page."
          defaultChecked={settings.captchaEnabled}
        />
        <Toggle
          name="requireOAuthIdentify"
          label="Require Discord identify (with consent)"
          hint="Ask members to confirm their Discord identity. Transparent — shown on the page."
          defaultChecked={settings.requireOAuthIdentify}
        />
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold">Roles</h3>
        <Field
          name="verifyRoleId"
          label="Verified role ID"
          hint="Role granted when a member passes verification."
          defaultValue={settings.verifyRoleId}
          placeholder="123456789012345678"
        />
        <Field
          name="autoRoleIds"
          label="Auto role IDs"
          hint="Comma-separated role IDs also granted on verification."
          defaultValue={settings.autoRoleIds}
          placeholder="1111…, 2222…"
        />
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold">Anti-raid &amp; logging</h3>
        <Field
          name="minAccountAgeDays"
          label="Minimum account age (days)"
          hint="Reject accounts younger than this. 0 disables the check."
          defaultValue={settings.minAccountAgeDays}
          type="number"
        />
        <Field
          name="logChannelId"
          label="Log channel ID"
          hint="Verification events are posted here."
          defaultValue={settings.logChannelId}
          placeholder="123456789012345678"
        />
      </div>

      <div className="card space-y-4">
        <h3 className="font-semibold">Verify page branding</h3>
        <Field
          name="verifyPageTitle"
          label="Page title"
          defaultValue={settings.verifyPageTitle}
          placeholder="Welcome to our server"
        />
        <Field
          name="verifyPageColor"
          label="Accent color"
          defaultValue={settings.verifyPageColor}
          placeholder="#5865F2"
        />
      </div>

      {state.ok && <p className="text-sm text-emerald-300">{state.ok}</p>}
      {state.error && <p className="text-sm text-red-300">{state.error}</p>}

      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Saving…' : 'Save settings'}
      </button>
    </form>
  );
}
