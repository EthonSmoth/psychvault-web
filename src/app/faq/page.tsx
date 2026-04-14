import Link from "next/link";
import type { Metadata } from "next";
import { getAppBaseUrl, getSupportEmail } from "@/lib/env";
import { serializeJsonLd } from "@/lib/input-safety";

const baseUrl = getAppBaseUrl();
const supportEmail = getSupportEmail();

const faqSections = [
  {
    title: "Buying resources",
    description: "Common questions from buyers exploring downloads, checkout, and access.",
    items: [
      {
        question: "How do I buy a resource on PsychVault?",
        answer:
          "Open the resource page, review the preview images and details, then use the checkout button. Free listings can be claimed without payment, while paid listings are processed through Stripe.",
      },
      {
        question: "Where do I access my downloads after purchase?",
        answer:
          "After checkout, eligible resources become available from the purchase flow and your library access points. If a download is missing, contact support with your purchase email and the resource name.",
      },
      {
        question: "Do you offer refunds on digital products?",
        answer:
          "Refunds are handled under the marketplace refund policy. Because these are digital products, outcomes depend on the issue, delivery status, and whether the product materially differs from the listing.",
      },
      {
        question: "Can I message a creator before purchasing?",
        answer:
          "Yes. Where messaging is available, buyers can contact creators to ask clarifying questions about fit, format, or intended use before they buy.",
      },
    ],
  },
  {
    title: "Selling on PsychVault",
    description: "Answers for clinicians building a store, listing resources, and managing payouts.",
    items: [
      {
        question: "Who can sell resources on PsychVault?",
        answer:
          "PsychVault is designed for clinician-made and practice-adjacent resources. Sellers should upload material they have the right to publish and that meets marketplace quality and safety expectations.",
      },
      {
        question: "What do I need before publishing a listing?",
        answer:
          "You should have a clear title, concise description, pricing, preview images, and a download-ready file. A published store and payout-ready setup are also important for paid resources.",
      },
      {
        question: "How do payouts work?",
        answer:
          "Paid listings rely on Stripe Connect. Creators need to complete onboarding and keep payout details current so earnings can be transferred safely.",
      },
      {
        question: "Can I update a listing after it goes live?",
        answer:
          "Yes. Creators can update listing details, previews, files, pricing, and publishing state from the creator dashboard.",
      },
    ],
  },
  {
    title: "Trust, safety, and support",
    description: "Marketplace standards, moderation, and where to get help.",
    items: [
      {
        question: "How does PsychVault handle moderation?",
        answer:
          "Listings are expected to follow marketplace standards around safety, copyright, impersonation, and accurate representation. Moderation and reporting tools help surface issues for review.",
      },
      {
        question: "What should I do if a file or listing looks wrong?",
        answer:
          "Use the contact or feedback channels and include the resource name, URL, and a short explanation of the issue. Specific context helps the team investigate faster.",
      },
      {
        question: "How fast does support reply?",
        answer:
          "Response times vary with volume, but including the store, resource, order, or account details usually speeds things up.",
      },
      {
        question: "Where can I suggest improvements to PsychVault?",
        answer:
          "Use the feedback page if you want to suggest a new feature, report a rough edge, or share how the browsing and creator experience could improve.",
      },
    ],
  },
];

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Get answers about buying, selling, downloads, payouts, moderation, and support on PsychVault.",
  alternates: {
    canonical: `${baseUrl}/faq`,
  },
  openGraph: {
    title: "PsychVault FAQ",
    description:
      "Get answers about buying, selling, downloads, payouts, moderation, and support on PsychVault.",
    url: `${baseUrl}/faq`,
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function FaqPage() {
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqSections.flatMap((section) =>
      section.items.map((item) => ({
        "@type": "Question",
        name: item.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.answer,
        },
      }))
    ),
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqSchema) }}
      />

      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Help centre
        </p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)]">
          Answers for buyers, creators, and clinicians using PsychVault
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-muted)]">
          Start here for the most common questions about downloads, creator stores, payouts,
          moderation, and support. If you still need a hand, reach out and we will point you in
          the right direction.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {faqSections.map((section) => (
            <a
              key={section.title}
              href={`#${section.title.toLowerCase().replace(/\s+/g, "-")}`}
              className="rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)] p-5 transition hover:-translate-y-0.5 hover:border-[var(--border-strong)]"
            >
              <h2 className="text-lg font-semibold text-[var(--text)]">{section.title}</h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {section.description}
              </p>
            </a>
          ))}
        </div>
      </section>

      <div className="mt-10 space-y-6">
        {faqSections.map((section) => (
          <section
            key={section.title}
            id={section.title.toLowerCase().replace(/\s+/g, "-")}
            className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm"
          >
            <div className="max-w-3xl">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
                {section.title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                {section.description}
              </p>
            </div>

            <div className="mt-6 space-y-4">
              {section.items.map((item) => (
                <details
                  key={item.question}
                  className="group rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)] p-5"
                >
                  <summary className="cursor-pointer list-none text-base font-semibold text-[var(--text)]">
                    {item.question}
                  </summary>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
                    {item.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 rounded-[2rem] border border-[var(--border)] bg-[var(--frame)] p-8 shadow-sm">
        <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
          Still need help?
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-muted)]">
          If your question is specific to a purchase, listing, or account issue, include the link
          and the email address tied to your account so support can investigate faster.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/contact"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
          >
            Contact support
          </Link>
          <Link
            href="/feedback"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Share product feedback
          </Link>
          <a
            href={`mailto:${supportEmail}`}
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            {supportEmail}
          </a>
        </div>
      </section>
    </div>
  );
}
