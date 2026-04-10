import Link from "next/link";
import { getMarketplacePolicyLinks } from "@/lib/payments";

// Explains what user, payment, and marketplace data PsychVault collects and why.
export function PrivacyPolicyContent() {
  const links = getMarketplacePolicyLinks();

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            This policy explains how PsychVault collects, uses, stores, and protects
            personal information when people browse, buy, sell, and contact us through
            the marketplace.
          </p>
        </div>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Information we collect</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            We collect account information such as name, email address, store profile
            details, purchase history, library activity, moderation reports, and data
            reasonably required to process payments, deliver downloads, prevent fraud,
            and support users. We do not sell personal information to data brokers.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">How we use data</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Your information is used to create and secure accounts, deliver purchases,
            manage creator storefronts, provide buyer libraries, operate moderation and
            reporting systems, respond to support requests, and improve marketplace
            quality and safety.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Payments and third parties</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Payments may be processed through providers such as Stripe. File storage and
            delivery may rely on secure infrastructure providers. Those services may
            process limited personal data needed to perform their role, subject to their
            own privacy and security controls.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Security and retention</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            We take reasonable steps to protect user data, limit access to sensitive
            information, and maintain marketplace records for operational, legal, fraud
            prevention, and support purposes. You should also protect your own device,
            credentials, and email account.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Related policies</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            You can also review our
            {" "}
            <Link href={links.terms} className="font-medium text-[var(--text)] underline">
              Terms of Service
            </Link>
            {" "}
            and
            {" "}
            <Link href={links.refunds} className="font-medium text-[var(--text)] underline">
              Refund Policy
            </Link>
            {" "}
            for more information about how digital purchases and creator content are
            handled on PsychVault.
          </p>
        </section>
      </div>
    </main>
  );
}
