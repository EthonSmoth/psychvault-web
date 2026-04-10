import Link from "next/link";
import { getMarketplacePolicyLinks } from "@/lib/payments";

// Sets the core marketplace rules for buyers, creators, content, and digital purchases.
export function TermsOfServiceContent() {
  const links = getMarketplacePolicyLinks();

  return (
    <main className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            These terms govern your use of PsychVault. By using this website, you agree to
            our terms and conditions.
          </p>
        </div>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Using the platform</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            PsychVault is provided as a marketplace for buying and selling digital
            psychology resources. Users must comply with all applicable laws and respect
            creator rights, platform rules, and moderation decisions.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Creator content</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Creators are responsible for the content they upload and must ensure it is
            appropriate for professional use. Buyers purchase content subject to the
            creator&apos;s licensing terms, any listing-specific usage limits, and the
            marketplace&apos;s moderation standards.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Digital licenses and downloads</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Unless a listing says otherwise, purchases grant the buyer a limited,
            non-transferable license to use the downloaded material for their own
            professional, educational, or internal practice workflow. Buyers must not
            resell, redistribute, publicly repost, or falsely claim authorship of paid
            or free marketplace content.
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Payments and refunds</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            Paid purchases are processed through the marketplace checkout flow. Because
            most products are digital and may be available instantly, refunds are not
            automatic and are assessed under the
            {" "}
            <Link href={links.refunds} className="font-medium text-[var(--text)] underline">
              Refund Policy
            </Link>
            .
          </p>
        </section>

        <section className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">Limitations</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            PsychVault does not provide clinical advice. Resources are intended as
            educational and practice support materials; clinicians should exercise their
            professional judgment. We may remove content, pause payouts, or suspend
            access where required for safety, fraud prevention, legal compliance, or
            moderation review.
          </p>
        </section>
      </div>
    </main>
  );
}
