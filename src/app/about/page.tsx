import Link from"next/link";
import type { Metadata } from"next";
import { getAppBaseUrl } from"@/lib/env";

const baseUrl = getAppBaseUrl();

export const metadata: Metadata = {
  title:"About PsychVault",
  description:
"PsychVault is a clinician-built marketplace for psychology resources — templates, handouts, report tools, and more, made by practitioners for real clinical work.",
  alternates: {
    canonical: `${baseUrl}/about`,
  },
  openGraph: {
    title:"About PsychVault",
    description:
"PsychVault is a clinician-built marketplace for psychology resources — templates, handouts, report tools, and more, made by practitioners for real clinical work.",
    url: `${baseUrl}/about`,
    type:"website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

// Explains what PsychVault is, who it serves, and how the marketplace operates.
export default function AboutPage() {
  const supportEmail = process.env.SUPPORT_EMAIL ||"hello@psychvault.com.au";

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--text-light)]">
            About PsychVault
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
            The psychology marketplace for clinicians and creators.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[var(--text-muted)]">
            PsychVault connects clinicians with evidence-informed resources,
            worksheets, templates, and tools created by trusted practitioners.
            We make it easy to discover, license, and deliver clinical materials
            in one secure marketplace.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
            Based in Australia, PsychVault is designed to give creators a clear
            public storefront and give buyers a transparent place to browse,
            purchase, and manage digital downloads with confidence.
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-2">
          <section className="card-panel">
            <h2 className="text-2xl font-semibold text-[var(--text)]">For buyers</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
              Browse clinician-designed psychology resources, access downloads
              instantly, and keep everything in your library. PsychVault helps
              you save time and keep your practice materials professional.
            </p>
          </section>

          <section className="card-panel">
            <h2 className="text-2xl font-semibold text-[var(--text)]">For creators</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
              Create your own store, publish resources, and reach clinicians who
              need ready-made worksheets, assessments, guides, and templates. We
              handle digital delivery, marketplace moderation, and purchase
              workflow support.
            </p>
          </section>
        </div>

        <section className="card-panel">
          <h2 className="text-2xl font-semibold text-[var(--text)]">Our mission</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            We believe that quality psychology resources should be easy to find
            and safe to purchase. By supporting creators with a secure
            marketplace and helping clinicians discover ready-to-use materials,
            we aim to make clinical practice more efficient and evidence-based.
          </p>
        </section>

        <section className="card-panel">
          <h2 className="text-2xl font-semibold text-[var(--text)]">Marketplace trust</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-[var(--surface-alt)] p-5">
              <div className="font-semibold text-[var(--text)]">Transparent digital delivery</div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Buyers can see previews, creator profiles, legal policies, and
                refund information before committing to a digital purchase.
              </p>
            </div>
            <div className="rounded-2xl bg-[var(--surface-alt)] p-5">
              <div className="font-semibold text-[var(--text)]">Moderated marketplace</div>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                Resources and stores can be reviewed, reported, or paused when
                content raises safety, copyright, impersonation, or quality
                concerns.
              </p>
            </div>
          </div>
        </section>

        <div className="card-panel">
          <h2 className="text-2xl font-semibold text-[var(--text)]">Want to know more?</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            If you have questions about how PsychVault works, creator
            partnerships, or support, please visit our{""}
            <Link
              href="/contact"
              className="font-semibold text-[var(--text)] underline hover:text-[var(--accent)]"
            >
              Contact page
            </Link>
            .
          </p>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            Support email:{""}
            <a
              href={`mailto:${supportEmail}`}
              className="font-semibold text-[var(--text)] underline hover:text-[var(--accent)]"
            >
              {supportEmail}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
