import type { Metadata } from "next";
import ContactForm from "@/components/forms/contact-form";
import { getAppBaseUrl } from "@/lib/env";

const baseUrl = getAppBaseUrl();

const feedbackTopics = [
  "Search and discovery",
  "Resource pages",
  "Creator dashboard",
  "Uploads and previews",
  "Checkout and downloads",
  "Trust and moderation",
];

export const metadata: Metadata = {
  title: "Feedback",
  description:
    "Share product feedback, feature requests, and bug reports to help improve PsychVault.",
  alternates: {
    canonical: `${baseUrl}/feedback`,
  },
  openGraph: {
    title: "PsychVault Feedback",
    description:
      "Share product feedback, feature requests, and bug reports to help improve PsychVault.",
    url: `${baseUrl}/feedback`,
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FeedbackPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
            Product feedback
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--text)]">
            Tell us what is working, missing, or getting in your way
          </h1>
          <p className="mt-4 text-sm leading-7 text-[var(--text-muted)]">
            This page is for ideas, rough edges, and feature requests across the buyer,
            creator, and marketplace experience. Honest specifics are the most helpful.
          </p>

          <div className="mt-8 rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)] p-5">
            <h2 className="text-lg font-semibold text-[var(--text)]">Useful things to include</h2>
            <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--text-muted)]">
              <li>What you were trying to do</li>
              <li>What happened instead</li>
              <li>Which page or workflow you were on</li>
              <li>Whether this affected buying, selling, or trust in the listing</li>
            </ul>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-[var(--text)]">Common feedback areas</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {feedbackTopics.map((topic) => (
                <div
                  key={topic}
                  className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-sm text-[var(--text-muted)]"
                >
                  {topic}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Send feedback
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
            Feedback goes straight to the PsychVault team. Use a short subject line and put the
            detailed context in the message field.
          </p>

          <div className="mt-8">
            <ContactForm
              defaultSubject="Product feedback"
              submitLabel="Send feedback"
              successMessage="Thanks for the feedback. We've received it and will review it with the team."
              subjectPlaceholder="e.g. Search filters are hard to trust"
              messagePlaceholder="Tell us what you expected, what happened, and which page or workflow this affected."
            />
          </div>
        </section>
      </div>
    </div>
  );
}
