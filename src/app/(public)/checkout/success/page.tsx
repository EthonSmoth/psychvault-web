import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment successful — PsychVault",
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
        ✅
      </div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
        Payment successful
      </h1>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Your purchase is confirmed. A confirmation email is on its way. Your resource
        is in your library and ready to download.
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
          className="text-sm text-slate-500 transition hover:text-slate-900"
        >
          Browse more resources
        </Link>
      </div>
    </div>
  );
}
