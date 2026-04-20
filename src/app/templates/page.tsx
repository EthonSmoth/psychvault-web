import Link from"next/link";
import type { Metadata } from"next";
import { getAppBaseUrl } from"@/lib/env";
import { TEMPLATE_LANDING_PAGES } from"@/lib/template-landing-pages";

const baseUrl = getAppBaseUrl();

export const metadata: Metadata = {
  title:"Template Library",
  description:
"Browse PsychVault template landing pages for therapy worksheets, report templates, intake forms, and more.",
  alternates: {
    canonical: `${baseUrl}/templates`,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function TemplatesIndexPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Template library
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)]">
          Explore high-intent template topics across therapy, reports, documentation, and intake
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-muted)]">
          These landing pages group together clinician-designed resources around focused workflows and
          search intents, from CBT thought records to NDIS reports and treatment planning.
        </p>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {TEMPLATE_LANDING_PAGES.map((page) => (
          <Link
            key={page.slug}
            href={`/templates/${page.slug}`}
            className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
              {page.eyebrow}
            </p>
            <h2 className="heading-2xl mt-3">
              {page.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{page.intro}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
