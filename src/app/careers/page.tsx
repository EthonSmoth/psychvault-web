import Link from "next/link";
import type { Metadata } from "next";
import { getAppBaseUrl, getSupportEmail } from "@/lib/env";

const baseUrl = getAppBaseUrl();
const supportEmail = getSupportEmail();

const values = [
  {
    title: "Build for real clinical work",
    body: "We care about tools that save time, sharpen reasoning, and help clinicians trust what they are buying or publishing.",
  },
  {
    title: "Move with care",
    body: "Safety, copyright, moderation, and accurate representation matter here. Shipping fast only works when the foundation stays trustworthy.",
  },
  {
    title: "Prefer practical over performative",
    body: "We like sharp product thinking, clear writing, and people who can turn fuzzy workflow problems into something useful.",
  },
];

const perks = [
  "Small-team ownership and broad product impact",
  "Work close to clinicians, creators, and real marketplace behaviour",
  "Flexible scope for product, operations, and growth-minded roles",
  "Thoughtful asynchronous collaboration with room for deep work",
];

export const metadata: Metadata = {
  title: "Join the Team",
  description:
    "Learn how PsychVault works, what we value, and how to express interest in joining the team.",
  alternates: {
    canonical: `${baseUrl}/careers`,
  },
  openGraph: {
    title: "Join the Team at PsychVault",
    description:
      "Learn how PsychVault works, what we value, and how to express interest in joining the team.",
    url: `${baseUrl}/careers`,
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CareersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Careers
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)]">
          Join the team building a more useful marketplace for clinician-made resources
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-muted)]">
          PsychVault sits at the intersection of product, trust, clinician workflow, and creator
          commerce. We want the marketplace to feel practical, credible, and genuinely helpful to
          the people using it.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href={`mailto:${supportEmail}?subject=Careers%20at%20PsychVault`}
            className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
          >
            Express interest
          </a>
          <Link
            href="/about"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Learn about PsychVault
          </Link>
        </div>
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-3">
        {values.map((value) => (
          <div
            key={value.title}
            className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold tracking-tight text-[var(--text)]">
              {value.title}
            </h2>
            <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">{value.body}</p>
          </div>
        ))}
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Life at a small product team
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            We are building in a category where quality, trust, and user judgment matter. That
            means the work spans product detail, marketplace systems, support thinking, and a fair
            amount of writing and synthesis.
          </p>
          <ul className="mt-6 space-y-3 text-sm leading-6 text-[var(--text-muted)]">
            {perks.map((perk) => (
              <li key={perk} className="rounded-2xl bg-[var(--surface-alt)] px-4 py-3">
                {perk}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Current openings
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            We do not have public role listings on this page right now. If your background fits
            product engineering, marketplace operations, growth, or clinician-first content
            systems, you can still introduce yourself.
          </p>

          <div className="mt-6 rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--surface-alt)] p-5">
            <p className="text-sm font-semibold text-[var(--text)]">Good signal in an intro</p>
            <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
              Tell us what you build well, which part of PsychVault feels interesting to you, and
              one concrete way you think the marketplace could get stronger.
            </p>
          </div>

          <a
            href={`mailto:${supportEmail}?subject=Careers%20at%20PsychVault`}
            className="mt-6 inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Email the team
          </a>
        </div>
      </section>
    </div>
  );
}
