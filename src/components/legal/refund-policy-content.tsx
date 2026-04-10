import Link from "next/link";
import { getMarketplacePolicyLinks } from "@/lib/payments";

// Explains how digital purchases, refunds, and support are handled on the marketplace.
export function RefundPolicyContent() {
  const links = getMarketplacePolicyLinks();

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            Refund Policy
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            PsychVault sells digital products intended for clinicians, students, and
            helping professionals. Because digital downloads can be accessed
            immediately, refund requests are handled carefully and on a case-by-case
            basis.
          </p>
        </div>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">When refunds may be granted</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            We may offer a refund where a file is materially broken, the buyer receives
            the wrong product, the product cannot be downloaded after reasonable support
            attempts, or the listing was materially misleading.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">When refunds are usually not available</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Refunds are generally not available for change of mind, accidental
            purchases where the download has already been accessed, or situations where
            the resource matched the listing but was not the right fit for your workflow.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">How to request help</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            If you believe a purchase qualifies for a refund or needs urgent support,
            contact us with the resource name, purchase email, and a short description
            of the issue. We may ask for screenshots or download details to investigate.
          </p>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Related policies:
            {" "}
            <Link href={links.terms} className="font-medium text-[var(--text)] underline">
              Terms of Service
            </Link>
            {" "}
            and
            {" "}
            <Link href={links.privacy} className="font-medium text-[var(--text)] underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
