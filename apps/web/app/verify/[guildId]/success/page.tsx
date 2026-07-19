export default function VerifySuccessPage() {
  return (
    <main className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-md text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-500 text-xl font-bold text-white">
          &#10003;
        </div>
        <h1 className="mt-5 text-xl font-semibold">You&apos;re verified</h1>
        <p className="mt-2 text-sm text-slate-400">
          You can close this tab and return to Discord.
        </p>
      </div>
    </main>
  );
}
