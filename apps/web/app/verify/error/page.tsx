export default async function VerifyErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md text-center">
        <h1 className="text-xl font-semibold">Verification failed</h1>
        <p className="mt-2 text-sm text-slate-400">
          Something went wrong. Please start over from the Verify button in your Discord server.
        </p>
        {reason && <p className="mt-4 text-xs text-slate-500">Reason: {reason}</p>}
      </div>
    </main>
  );
}
