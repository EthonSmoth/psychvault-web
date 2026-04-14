import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResourceGrid } from "@/components/resources/resource-grid";
import { getAppBaseUrl } from "@/lib/env";
import { serializeJsonLd } from "@/lib/input-safety";
import {
  TEMPLATE_LANDING_PAGES,
  getTemplateLandingPage,
} from "@/lib/template-landing-pages";
import { getPublishedTemplateLandingResources } from "@/server/queries/public-content";

type TemplateLandingPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

const baseUrl = getAppBaseUrl();

export const revalidate = 300;

export function generateStaticParams() {
  return TEMPLATE_LANDING_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({
  params,
}: TemplateLandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getTemplateLandingPage(slug);

  if (!page) {
    return {
      title: "Template page not found | PsychVault",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const resources = await getPublishedTemplateLandingResources({
    query: page.query,
    categorySlugs: page.categorySlugs,
    tagSlugs: page.tagSlugs,
    price: page.price,
    sort: page.sort,
    limit: 12,
  });

  const url = `${baseUrl}/templates/${page.slug}`;

  return {
    title: page.metaTitle,
    description: page.metaDescription,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: page.metaTitle,
      description: page.metaDescription,
      url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: page.metaTitle,
      description: page.metaDescription,
    },
    robots: {
      index: resources.length > 0,
      follow: resources.length > 0,
    },
  };
}

export default async function TemplateLandingPage({ params }: TemplateLandingPageProps) {
  const { slug } = await params;
  const page = getTemplateLandingPage(slug);

  if (!page) {
    notFound();
  }

  const resources = await getPublishedTemplateLandingResources({
    query: page.query,
    categorySlugs: page.categorySlugs,
    tagSlugs: page.tagSlugs,
    price: page.price,
    sort: page.sort,
    limit: 12,
  });

  const url = `${baseUrl}/templates/${page.slug}`;
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: page.metaTitle,
    description: page.metaDescription,
    url,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: resources.map((resource, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: `${baseUrl}/resources/${resource.slug}`,
        name: resource.title,
      })),
    },
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionSchema) }}
      />

      <section className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          {page.eyebrow}
        </p>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text)]">
          {page.title}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--text-muted)]">
          {page.intro}
        </p>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
          {page.supportingCopy}
        </p>

        <div className="mt-8 flex flex-wrap gap-2">
          {page.audience.map((item) => (
            <div
              key={item}
              className="rounded-full border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-2 text-sm text-[var(--text-muted)]"
            >
              {item}
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/resources"
            className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
          >
            Browse all resources
          </Link>
          <Link
            href="/creator"
            className="inline-flex items-center justify-center rounded-xl border border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Sell on PsychVault
          </Link>
        </div>
      </section>

      <section className="mt-10 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
              Filtered results
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
              These listings are selected from the live marketplace using category, tag, keyword,
              and pricing rules specific to this topic page.
            </p>
          </div>
          <div className="text-sm text-[var(--text-light)]">
            {resources.length} resource{resources.length === 1 ? "" : "s"} shown
          </div>
        </div>

        <ResourceGrid resources={resources} />
      </section>

      <section className="mt-10 grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Why this page exists
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            Template topic pages give buyers a clearer entry point than broad browse results while
            still sending them to the underlying resource detail pages for previews, reviews, and
            purchase decisions.
          </p>
        </div>

        <div className="rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-8 shadow-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
            Canonical and indexing rules
          </h2>
          <p className="mt-3 text-sm leading-7 text-[var(--text-muted)]">
            This landing page is canonically indexed at its own URL. Internal search pages stay
            noindexed, and filtered browse states continue to resolve back to the main browse
            surface so these topic pages do not compete with your faceted navigation.
          </p>
        </div>
      </section>
    </div>
  );
}
