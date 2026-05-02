import type { Metadata } from "next";
import Link from "next/link";
import { getAppBaseUrl } from "@/lib/env";

const baseUrl = getAppBaseUrl();

export const metadata: Metadata = {
  title: "AHPRA Logbook Parser | 5+1 Internship Hour Tracker | PsychVault",
  description:
    "Upload your LBPP-76 logbook and instantly see your 5+1 internship hours, supervision ratio, and progress toward the 1,500 hour target. Your data is never saved.",
  alternates: {
    canonical: `${baseUrl}/logbook`,
  },
  openGraph: {
    title: "AHPRA Logbook Parser | 5+1 Internship Hour Tracker | PsychVault",
    description:
      "Upload your LBPP-76 logbook and instantly see your 5+1 internship hours, supervision ratio, and progress toward the 1,500 hour target. Your data is never saved.",
    url: `${baseUrl}/logbook`,
    type: "website",
  },
  robots: { index: true, follow: true },
};

export default function LogbookMarketingPage() {
  return (
    <main className="app-main">
      {/* Hero */}
      <section className="bg-[var(--surface)] border-b border-[var(--border)]">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24 text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--primary)] mb-4">
            For provisional psychologists
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-[var(--text)] leading-tight tracking-tight">
            Know exactly where you stand
            <br />
            in your internship
          </h1>
          <p className="mt-6 text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
            Upload your LBPP-76 logbook and get an instant breakdown of your hours, supervision
            ratio, and progress toward each AHPRA requirement — without emailing anyone or opening
            a spreadsheet.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link
              href="/logbook/dashboard"
              className="btn-primary px-8 py-3 text-base font-semibold rounded-lg"
            >
              Buy your first parse
            </Link>
            <Link
              href="/logbook/dashboard"
              className="btn-secondary px-8 py-3 text-base font-semibold rounded-lg"
            >
              Open dashboard
            </Link>
          </div>
          <p className="mt-6 text-xs text-[var(--text-light)]">
            $2 per parse &middot; No subscription &middot; Credits never expire
          </p>
        </div>
      </section>

      {/* Feature trio */}
      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="grid sm:grid-cols-3 gap-8">
          <div className="card-panel p-6">
            <div className="text-3xl mb-4">⚡</div>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Instant parsing</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Upload your LBPP-76 Excel or PDF file and see your hour totals, supervision
              breakdown, and section summaries in seconds. No manual entry.
            </p>
          </div>
          <div className="card-panel p-6">
            <div className="text-3xl mb-4">✔</div>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Correct AHPRA targets</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Checked against the current 5+1 internship requirements: 1,500 total hours, 80
              supervision hours, 50 with your principal supervisor, and the updated December 2025
              advisory ratio.
            </p>
          </div>
          <div className="card-panel p-6">
            <div className="text-3xl mb-4">🔒</div>
            <h2 className="text-lg font-semibold text-[var(--text)] mb-2">Zero data retention</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Your logbook content is parsed in memory and never written to a database, cloud
              storage, or any third-party service. The dashboard lives only in your browser tab.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-20">
          <h2 className="heading-section text-center mb-12">How it works</h2>
          <ol className="space-y-8">
            {[
              {
                step: "1",
                title: "Buy a parse credit",
                body: "Each file upload costs $2.00 AUD. Credits never expire. You can buy 1, 3, or 5 at once.",
              },
              {
                step: "2",
                title: "Upload your logbook file",
                body: "Drag and drop or click to upload your LBPP-76 (.xlsx or .pdf), CHPS-76, INPP-76, or PACF-76.",
              },
              {
                step: "3",
                title: "Review your dashboard",
                body: "See your hours breakdown, supervision ratio, warnings, and a chart of your progress — all live in the browser.",
              },
              {
                step: "4",
                title: "Download your summary",
                body: "Generate a one-page PDF summary of your stats before you close the tab. Nothing is saved server-side.",
              },
            ].map((item) => (
              <li key={item.step} className="flex gap-5 items-start">
                <span className="flex-shrink-0 w-9 h-9 rounded-full bg-[var(--primary)] text-white font-bold flex items-center justify-center text-sm">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-semibold text-[var(--text)]">{item.title}</h3>
                  <p className="mt-1 text-sm text-[var(--text-muted)]">{item.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
        <h2 className="heading-section text-center mb-10">Simple, transparent pricing</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {[
            { qty: 1, price: "$2", label: "1 parse", note: "Try it once" },
            {
              qty: 3,
              price: "$6",
              label: "3 parses",
              note: "Great for mid-internship check-ins",
              highlight: true,
            },
            { qty: 5, price: "$10", label: "5 parses", note: "Full-year coverage" },
          ].map((tier) => (
            <div
              key={tier.qty}
              className={`card-panel p-6 flex flex-col items-center text-center ${
                tier.highlight ? "ring-2 ring-[var(--primary)]" : ""
              }`}
            >
              <p className="text-3xl font-bold text-[var(--text)]">{tier.price}</p>
              <p className="mt-1 text-base font-semibold text-[var(--text)]">{tier.label}</p>
              <p className="mt-1 text-sm text-[var(--text-muted)]">{tier.note}</p>
              <Link
                href="/logbook/dashboard"
                className="mt-5 btn-primary w-full py-2 text-sm font-semibold rounded-lg text-center"
              >
                Get started
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-xs text-[var(--text-light)]">
          Prices in AUD. Secure checkout via Stripe.
        </p>
      </section>

      {/* Supported forms */}
      <section className="bg-[var(--surface)] border-y border-[var(--border)]">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-16">
          <h2 className="heading-section text-center mb-8">Supported forms</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { code: "LBPP-76", name: "Logbook of Professional Practice", formats: "XLSX · PDF" },
              { code: "CHPS-76", name: "Change of Supervisor form", formats: "PDF" },
              { code: "INPP-76", name: "Internship Program Plan", formats: "PDF" },
              { code: "PACF-76", name: "Final Assessment of Competence", formats: "PDF" },
            ].map((form) => (
              <div
                key={form.code}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4"
              >
                <span className="tag-amber text-xs font-semibold">{form.code}</span>
                <p className="mt-2 text-sm font-medium text-[var(--text)]">{form.name}</p>
                <p className="mt-0.5 text-xs text-[var(--text-light)]">{form.formats}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-2xl px-4 py-16 sm:px-6 sm:py-20 text-center">
        <h2 className="text-2xl font-bold text-[var(--text)]">
          Ready to check your hours?
        </h2>
        <p className="mt-4 text-[var(--text-muted)]">
          Create a free account or log in, then buy your first parse credit for $2.
        </p>
        <Link
          href="/logbook/dashboard"
          className="mt-8 inline-block btn-primary px-10 py-3 text-base font-semibold rounded-lg"
        >
          Go to your dashboard
        </Link>
        <p className="mt-8 text-xs text-[var(--text-light)] max-w-md mx-auto">
          Not affiliated with or endorsed by AHPRA or the Psychology Board of Australia. This tool
          is for personal progress tracking only and does not constitute official registration
          advice.
        </p>
      </section>
    </main>
  );
}
