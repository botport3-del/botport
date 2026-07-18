'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: { sitekey: string; callback: (t: string) => void }) => void;
    };
  }
}

export function VerifyForm({
  token,
  siteKey,
  captchaEnabled,
}: {
  token: string;
  siteKey: string;
  captchaEnabled: boolean;
}) {
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const widgetRef = useRef<HTMLDivElement>(null);

  const needsCaptcha = captchaEnabled && Boolean(siteKey);

  useEffect(() => {
    if (!needsCaptcha) return;
    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    script.async = true;
    script.onload = () => {
      if (widgetRef.current && window.turnstile) {
        window.turnstile.render(widgetRef.current, {
          sitekey: siteKey,
          callback: (t) => setCaptchaToken(t),
        });
      }
    };
    document.body.appendChild(script);
    return () => {
      script.remove();
    };
  }, [needsCaptcha, siteKey]);

  async function submit() {
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch('/api/verify/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, turnstileToken: captchaToken }),
      });
      const data = (await res.json()) as { ok: boolean; message: string };
      setStatus(data.ok ? 'ok' : 'error');
      setMessage(data.message);
    } catch {
      setStatus('error');
      setMessage('Something went wrong. Please try again.');
    }
  }

  if (status === 'ok') {
    return (
      <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-emerald-300">
        ✅ {message}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {needsCaptcha && <div ref={widgetRef} />}
      {status === 'error' && (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {message}
        </p>
      )}
      <button
        onClick={submit}
        disabled={status === 'loading' || (needsCaptcha && !captchaToken)}
        className="btn-primary w-full disabled:opacity-50"
      >
        {status === 'loading' ? 'Verifying…' : 'Verify me'}
      </button>
    </div>
  );
}
