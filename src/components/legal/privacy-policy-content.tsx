import Link from"next/link";
import { PolicyContactPanel } from"@/components/legal/policy-contact-panel";
import { LEGAL_LAST_UPDATED } from"@/lib/legal";
import { getMarketplacePolicyLinks } from"@/lib/payments";

// Explains what user, payment, and marketplace data PsychVault collects and why.
export function PrivacyPolicyContent() {
  const links = getMarketplacePolicyLinks();

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-light)]">
            Last updated {LEGAL_LAST_UPDATED}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            This policy explains how PsychVault collects, uses, stores, and shares
            personal information when people browse, buy, sell, upload, download, and
            contact us through the marketplace.
          </p>
        </div>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">What information we collect</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              We collect information you provide directly, including your name, email
              address, account details, creator profile details, storefront content,
              uploaded files, support messages, reviews, and moderation reports.
            </p>
            <p>
              When you buy or sell on PsychVault, we also process transaction-related
              information such as purchase history, download access, payout status,
              refund decisions, fraud checks, and payment metadata required to operate
              the marketplace. Card details are handled by our payment processor and are
              not stored by PsychVault in raw form.
            </p>
            <p>
              Like most websites, we also collect technical and usage information such as
              IP address, browser and device data, log records, approximate location,
              cookies, and page interaction data to secure the site, diagnose issues, and
              improve performance.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">How we use personal information</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>We use personal information to:</p>
            <ul className="list-disc space-y-2 pl-5">
              <li>create and secure accounts, including login, verification, and fraud controls</li>
              <li>process purchases, provide digital delivery, and manage buyer libraries</li>
              <li>operate creator stores, reviews, reports, moderation, and customer support</li>
              <li>analyse marketplace performance and improve the quality, safety, and reliability of the service</li>
              <li>meet legal, tax, accounting, dispute, and compliance obligations</li>
            </ul>
            <p>
              We do not sell personal information to data brokers. We only use data where
              it is reasonably necessary to operate the marketplace, support customers,
              protect the service, or comply with legal requirements.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">When we share information</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              We share limited information with service providers that help us operate the
              marketplace, including payment processors such as Stripe, infrastructure and
              storage providers, email delivery providers, analytics tools, and security
              services.
            </p>
            <p>
              We may also share information with the relevant buyer or creator where that
              is necessary to fulfil an order, investigate a dispute, respond to a refund
              or support request, or enforce our marketplace rules.
            </p>
            <p>
              We may disclose information when required by law, to respond to lawful
              requests, to protect users or the public, or to investigate fraud, abuse,
              intellectual property complaints, or security incidents.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Cookies, analytics, and security</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              PsychVault uses cookies and similar technologies to keep users signed in,
              remember preferences, measure traffic, and protect against fraud and abuse.
              Some analytics and performance tools may collect aggregated or pseudonymous
              usage data.
            </p>
            <p>
              We take reasonable technical and organisational steps to protect personal
              information, including access controls, rate limiting, secure transport,
              signed download delivery for private files, and review processes for
              suspicious activity. No online system is completely risk free, so users
              should also protect their credentials and devices.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Retention and international processing</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              We keep information for as long as it is reasonably needed to operate the
              service, maintain records, support purchases and creator accounts, prevent
              fraud, resolve disputes, and satisfy legal obligations. We may retain some
              data longer where required for tax, accounting, or platform integrity
              reasons.
            </p>
            <p>
              PsychVault and its service providers may process information in Australia
              and other countries where our infrastructure or vendors operate. Where this
              occurs, we aim to use reputable providers and reasonable safeguards for the
              type of data involved.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Your choices and rights</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              You can contact us to request access to, correction of, or deletion of your
              personal information, subject to legal, fraud-prevention, record-keeping,
              and marketplace integrity requirements. You can also update some profile and
              store information from within your account.
            </p>
            <p>
              If you no longer wish to receive marketing or support follow-ups, you can
              unsubscribe where available or contact us directly. Some operational emails,
              such as purchase confirmations, account security notices, and refund
              decisions, may still be sent where necessary.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Related policies</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            For more information about digital purchases, licensing, and refund handling,
            please also review our{" "}
            <Link href={links.terms} className="font-medium text-[var(--text)] underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href={links.refunds} className="font-medium text-[var(--text)] underline">
              Refund Policy
            </Link>
            .
          </p>
        </section>

        <PolicyContactPanel />
      </div>
    </main>
  );
}
