'use client';

import { useState } from 'react';

const DISCORD_EPOCH = 1420070400000;

interface Result {
  id: string;
  created: Date;
}

export function IdLookup() {
  const [value, setValue] = useState('');
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');

  function lookup() {
    setError('');
    setResult(null);
    const id = value.trim();
    if (!/^\d{15,20}$/.test(id)) {
      setError('Enter a valid Discord ID (15–20 digits).');
      return;
    }
    const ms = Number(BigInt(id) >> 22n) + DISCORD_EPOCH;
    setResult({ id, created: new Date(ms) });
  }

  return (
    <div className="card">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder="e.g. 175928847299117063"
          className="flex-1 rounded-lg border border-surface-border bg-surface px-3 py-2 text-sm outline-none focus:border-brand"
        />
        <button onClick={lookup} className="btn-primary">
          Look up
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      {result && (
        <dl className="mt-5 grid grid-cols-3 gap-2 text-sm">
          <dt className="text-slate-500">ID</dt>
          <dd className="col-span-2 font-mono">{result.id}</dd>
          <dt className="text-slate-500">Account created</dt>
          <dd className="col-span-2">{result.created.toUTCString()}</dd>
          <dt className="text-slate-500">Relative</dt>
          <dd className="col-span-2">
            {Math.floor((Date.now() - result.created.getTime()) / (1000 * 60 * 60 * 24))} days ago
          </dd>
        </dl>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Computed entirely in your browser from the ID&apos;s timestamp — no lookup or tracking.
      </p>
    </div>
  );
}
