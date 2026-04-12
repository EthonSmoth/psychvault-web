import Link from "next/link";
import { PolicyContactPanel } from "@/components/legal/policy-contact-panel";
import { LEGAL_LAST_UPDATED } from "@/lib/legal";
import { getMarketplacePolicyLinks } from "@/lib/payments";

// Explains how digital purchases, refunds, and support are handled on the marketplace.
export function RefundPolicyContent() {
  const links = getMarketplacePolicyLinks();

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-light)]">
            Last updated {LEGAL_LAST_UPDATED}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Refund Policy
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            PsychVault sells digital psychology resources. Because digital products can
            often be accessed immediately after payment, refund decisions are handled with
            care and reviewed on a case-by-case basis.
          </p>
        </div>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Digital delivery and cancellations</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              PsychVault provides digital delivery only. There is no physical shipping.
              Purchased resources are generally made available through your library or
              download access immediately after successful payment.
            </p>
            <p>
              If an order has not yet completed or access has not yet been granted, we
              may be able to cancel it. Once a digital file has been made available,
              change-of-mind cancellations are usually not available unless required by
              law or otherwise approved under this policy.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">When a refund may be approved</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>A refund may be approved where we reasonably determine that:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>the buyer received the wrong product</li>
              <li>the file is materially defective or cannot be opened in a normal way</li>
              <li>the product cannot be downloaded after reasonable support attempts</li>
              <li>the listing was materially misleading about what was included or delivered</li>
              <li>the transaction was duplicated or charged incorrectly</li>
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">When refunds are usually not available</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>Refunds are usually not available for:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>change of mind after download access has been provided</li>
              <li>purchases that matched the description but were not the right fit for your workflow</li>
              <li>compatibility or software issues that were disclosed on the listing or caused by the buyer&apos;s environment</li>
              <li>mistaken purchases caused by buying the wrong item after the listing was clearly described</li>
            </ul>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">How to request a refund</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              Please contact us as soon as possible, ideally within 14 days of purchase,
              with the resource name, purchase email, order date, and a short description
              of the issue. Screenshots or error details can help us investigate faster.
            </p>
            <p>
              We aim to review genuine refund or delivery issues promptly. If a refund is
              approved, it is generally returned to the original payment method. Banking
              timelines can vary depending on the payment provider and card issuer.
            </p>
            <p>
              If you believe there has been an error, please contact PsychVault before
              opening a bank dispute or chargeback so we can try to resolve the issue
              directly.
            </p>
          </div>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Consumer law rights</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Nothing in this policy excludes rights or remedies that cannot be excluded
            under Australian Consumer Law or other mandatory laws. You can also review
            our{" "}
            <Link href={links.terms} className="font-medium text-[var(--text)] underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href={links.privacy} className="font-medium text-[var(--text)] underline">
              Privacy Policy
            </Link>{" "}
            for related information.
          </p>
        </section>

        <PolicyContactPanel />
      </div>
    </main>
  );
}
