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
        question: "How do I set up payouts?",
        answer:
          "Payouts use Stripe Connect for secure fund transfers. When you're ready to sell, you'll complete Stripe onboarding (usually 5–10 minutes) to verify your banking details. Earnings are transferred automatically based on your Stripe Connect schedule.",
      },
      {
        question: "How much do I earn from each sale?",
        answer:
          "PsychVault takes a 20% platform fee on each sale, meaning you keep 80% of the purchase price. Examples: Price $50 AUD → You earn $40. Price $100 AUD → You earn $80. Price $25 AUD → You earn $20. Free resources earn $0 but build your following. Prices are in AUD and payouts go directly to your connected bank account.",
      },
      {
        question: "When do I get paid?",
        answer:
          "Payouts are managed by Stripe Connect and happen on a schedule tied to your bank account setup. Most creators see earnings transferred within 2–7 business days of a sale, though timing varies by bank and country.",
      },
      {
        question: "What's the process for getting started as a seller?",
        answer:
          "1) Create an account with a verified email. 2) Apply to become a creator (usually approved within 24–48 hours). 3) Set up your public store with a profile, bio, and logo. 4) Create your first resource with title, description, pricing, and preview images. 5) Complete Stripe Connect setup (5–10 minutes) to enable payouts. 6) Publish your resource and start earning.",
      },
      {
        question: "Can I price my resources at different amounts?",
        answer:
          "Yes. You control the price for each resource individually. You can offer free resources to build trust and your audience, then price paid resources based on depth, length, and clinical value. Many creators test different price points to find what works for their audience.",
      },
      {
        question: "Can I update a listing after it goes live?",
        answer:
          "Yes. Creators can update listing details, previews, files, pricing, and publishing state from the creator dashboard.",
      },
    ],
  },
  {
    title: "User types and capabilities",
    description: "What you can do as a buyer, creator, or store owner.",
    items: [
      {
        question: "What can I do as a regular buyer?",
        answer:
          "As a buyer, you can: Browse and search resources by category, tag, or creator. Read previews, ratings, and reviews. Follow your favourite creators for new listings. Message creators to ask questions before buying. Purchase and download resources (or claim free ones). Access your library of purchases. Leave detailed reviews sharing your feedback. Report resources or creators if something feels wrong.",
      },
      {
        question: "How do I become a creator and set up my store?",
        answer:
          "Anyone with a verified email can apply to become a creator. Once approved (usually 24–48 hours), you can: Create a public storefront with your profile, bio, and branding. Upload resources with titles, descriptions, preview images, and files. Set individual pricing for each resource (free or paid). Message buyers who have questions. View analytics on resource views and sales. Manage payout details via Stripe Connect. Edit or unpublish resources anytime.",
      },
      {
        question: "What's the difference between a store owner and a regular user?",
        answer:
          "Store owners (creators) are clinicians who curate and publish resources on the marketplace. Regular buyers browse and purchase. Creators have a public storefront, earn revenue, can build a following, and access creator tools like analytics and resource management. Buyers explore listings, build a library, and can follow creators. Many creators are also buyers—you can both publish resources AND purchase from other creators.",
      },
      {
        question: "Can I be both a buyer and a creator?",
        answer:
          "Yes. Once you're approved as a creator, you keep your buyer account and can do everything—browse and buy resources from other creators, upload your own, manage your store, and earn revenue. Many clinicians do this to both discover new tools and share their own.",
      },
      {
        question: "Can I delete my account or close my store?",
        answer:
          "You can archive resources and close your store from the creator dashboard. For account deletion or other account-level changes, contact support with your request.",
      },
      {
        question: "What rights do I need before uploading a resource?",
        answer:
          "You should only upload material you created, own, or have explicit permission to share. PsychVault doesn't allow: copyrighted material without permission, plagiarised content, impersonation, or material that violates clinical or ethical standards. When in doubt, contact support before publishing.",
      },
    ],
  },
  {
    title: "Creator onboarding and strategy",
    description: "Getting started as a seller, growing your audience, and best practices.",
    items: [
      {
        question: "What types of resources do well on PsychVault?",
        answer:
          "Resources that work well: assessment templates, therapy worksheets, session planners, clinical handouts, NDIS report templates, psychoeducation materials, intake forms, progress tracking tools, and practice management guides. The best resources are practical, well-designed, immediately useful, and solve a specific clinical problem. Avoid vague or overly generic content—specificity attracts buyers.",
      },
      {
        question: "How do I write a compelling resource description?",
        answer:
          "Start with the problem: 'Therapists struggle to explain anxiety to clients.' Then the solution: 'This resource is a 5-minute psychoeducation guide with visual diagrams.' Then the proof: 'Used by 200+ clinicians, rated 4.9/5.' Include: target audience (e.g., 'For CBT practitioners'), file format and length, what's inside (list key templates), and who will benefit. Keep it under 500 words and use bullets—buyers skim, they don't read essays.",
      },
      {
        question: "How many preview images should I upload?",
        answer:
          "Upload 3–5 preview images showing actual pages or screenshots from your resource. Show: cover/title page, sample content, a completed example, and key sections. Buyers want to see exactly what they're getting. Poor previews = low conversions. Invest time here—it directly affects sales.",
      },
      {
        question: "What price should I set for my first resource?",
        answer:
          "Research similar resources on PsychVault first. Most therapy templates range $15–$50 AUD depending on depth and effort. First-time sellers often start lower ($25–$35) to build reviews and credibility, then raise prices as feedback improves. Remember: you keep 80%, so a $25 resource earns you $20. Test, measure, adjust.",
      },
      {
        question: "How do I build my audience as a new creator?",
        answer:
          "Start with quality: publish 2–3 solid resources before worrying about marketing. Encourage reviews on each purchase. Follow creators in your niche and message collaborations. Consider free resources as lead magnets. Use your bio and store description to explain your clinical specialty and why buyers should follow you. Consistency matters—publish new resources regularly to show up in recent listings.",
      },
      {
        question: "Can I offer bundle discounts or run promotions?",
        answer:
          "Currently, PsychVault supports individual pricing per resource. If you want to offer bundles, you can create a combined resource (e.g., 'CBT Bundle: 5 Templates + Guides') and price it accordingly. You can also offer free resources to build followers, then monetize later resources. Contact support if you have specific promotion questions.",
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
    "Get answers about buying, selling, earning, creator strategy, payouts, moderation, and support on PsychVault.",
  alternates: {
    canonical: `${baseUrl}/faq`,
  },
  openGraph: {
    title: "PsychVault FAQ",
    description:
      "Get answers about buying, selling, earning, creator strategy, payouts, moderation, and support on PsychVault.",
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
