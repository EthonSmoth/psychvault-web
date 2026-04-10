import Link from "next/link";

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <div className="text-5xl mb-6">✅</div>
      <h1 className="text-2xl font-semibold text-slate-900">
        Payment successful
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Your purchase is confirmed. You can now download your resource from your library.
      </p>
      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/library"
          className="inline-flex rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Go to my library
        </Link>
        <Link
          href="/resources"
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          Browse more resources
        </Link>
      </div>
    </div>
  );
}