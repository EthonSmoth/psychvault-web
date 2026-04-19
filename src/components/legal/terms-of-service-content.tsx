import Link from"next/link";
import { PolicyContactPanel } from"@/components/legal/policy-contact-panel";
import { LEGAL_LAST_UPDATED } from"@/lib/legal";
import { getMarketplacePolicyLinks } from"@/lib/payments";

// Sets the core marketplace rules for buyers, creators, content, and digital purchases.
export function TermsOfServiceContent() {
  const links = getMarketplacePolicyLinks();

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-light)]">
            Last updated {LEGAL_LAST_UPDATED}
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            These terms govern access to and use of PsychVault, including marketplace
            browsing, accounts, creator stores, digital purchases, and download access.
            By using the website, you agree to these terms.
          </p>
        </div>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Marketplace use and accounts</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              PsychVault is a digital marketplace for psychology and clinician-focused
              resources. You must provide accurate information, keep your login details
              secure, and only use the platform in a lawful and professional manner.
            </p>
            <p>
              You are responsible for activity that occurs through your account. We may
              require email verification, restrict access, or suspend accounts where we
              reasonably believe there is fraud, impersonation, abuse, policy violation,
              or a material security risk.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Marketplace role and listings</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              PsychVault operates the marketplace infrastructure, checkout flow, download
              access, moderation systems, and support processes. Creators are responsible
              for the accuracy, legality, licensing authority, and quality of the content
              they publish.
            </p>
            <p>
              We may review, refuse, edit, unpublish, or remove listings where needed for
              safety, fraud prevention, intellectual property concerns, legal compliance,
              misleading content, or marketplace quality standards.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Pricing, checkout, and digital delivery</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              Unless stated otherwise, prices on PsychVault are displayed in Australian
              dollars (AUD). Orders are completed when payment succeeds through the
              marketplace checkout flow.
            </p>
            <p>
              PsychVault sells digital products only. There is no physical shipping.
              Purchased resources are generally made available through your account library
              or download access immediately after successful payment, subject to fraud
              checks, entitlement verification, and temporary technical issues.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Licences and acceptable use</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              Unless a listing says otherwise, a purchase gives the buyer a limited,
              non-exclusive, non-transferable licence to use the downloaded resource for
              their own internal professional, educational, or practice-related use.
            </p>
            <p>Buyers must not:</p>
            <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--text-muted)]">
              <li>resell, redistribute, sublicense, or publicly repost marketplace content</li>
              <li>remove creator attribution or falsely claim authorship</li>
              <li>upload malicious files, scrape the platform, or interfere with site security</li>
              <li>use the platform to infringe privacy, confidentiality, copyright, or other rights</li>
            </ul>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Creator responsibilities</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              Creators must have the rights and permissions needed to publish their
              content and any included images, branding, or third-party materials.
              Creators must not upload content that is unlawful, deceptive, harmful,
              plagiarised, or likely to mislead buyers about what is being sold.
            </p>
            <p>
              Creators are also responsible for setting clear listing descriptions,
              accurate preview materials, intended use information, and any licence limits
              that go beyond the default marketplace licence described above.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Refunds, disputes, and support</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              Because most purchases are digital and may be available immediately, refunds
              are not automatic. Refund requests are assessed under our{""}
              <Link href={links.refunds} className="font-medium text-[var(--text)] underline">
                Refund Policy
              </Link>
              .
            </p>
            <p>
              If there is a problem with a purchase, please contact PsychVault before
              lodging a payment dispute or chargeback. Early support contact gives us the
              best chance of resolving the matter quickly and reducing unnecessary bank
              dispute fees or account restrictions.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Disclaimers and legal rights</h2>
          <div className="mt-4 space-y-4 text-sm leading-7 text-[var(--text-muted)]">
            <p>
              PsychVault and its marketplace resources are intended to support learning,
              workflow, and professional practice. They do not constitute individual
              clinical advice, diagnosis, or treatment. Users must exercise their own
              professional judgement and comply with applicable laws, ethics rules, and
              workplace obligations.
            </p>
            <p>
              To the extent permitted by law, PsychVault is not liable for indirect,
              incidental, or consequential loss arising from the use of the marketplace.
              Nothing in these terms excludes or limits any rights that cannot be excluded
              under Australian Consumer Law or other mandatory laws.
            </p>
          </div>
        </section>

        <section className="card-panel">
          <h2 className="text-xl font-semibold text-[var(--text)]">Changes to these terms</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            We may update these terms from time to time to reflect product changes,
            security improvements, operational requirements, or legal obligations. The
            latest version will be published on this page with an updated revision date.
          </p>
        </section>

        <PolicyContactPanel />
      </div>
    </main>
  );
}
