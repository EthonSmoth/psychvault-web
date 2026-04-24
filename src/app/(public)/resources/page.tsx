import type { Metadata } from"next";
import { Suspense } from"react";
import { getAppBaseUrl } from"@/lib/env";
import { ResourcesBrowseClient } from"@/components/resources/resources-browse-client";
import {
  getPublishedResourcesBrowseData,
  getResourceBrowseFacets,
} from"@/server/queries/public-content";

export const revalidate = 300;

const baseUrl = getAppBaseUrl();

type ResourcesPageProps = {
  searchParams: Promise<{ category?: string; [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: ResourcesPageProps): Promise<Metadata> {
  const { category } = await searchParams;

  return {
    title: "Browse Psychology Resources | PsychVault Australia",
    description:
      "Discover psychology templates, therapy worksheets, psychoeducation handouts, and NDIS tools made for Australian clinicians. Free and paid resources available.",
    alternates: {
      // If a category param is present, tell crawlers the canonical is the clean path.
      canonical: category ? `${baseUrl}/resources/${category}` : `${baseUrl}/resources`,
    },
    robots: { index: true, follow: true },
    openGraph: {
      title: "Browse Psychology Resources | PsychVault Australia",
      description:
        "Discover psychology templates, therapy worksheets, psychoeducation handouts, and NDIS tools made for Australian clinicians. Free and paid resources available.",
      url: `${baseUrl}/resources`,
      type: "website",
      locale: "en_AU",
    },
    twitter: {
      card: "summary_large_image",
      title: "Browse Psychology Resources | PsychVault Australia",
      description:
        "Discover psychology templates, therapy worksheets, psychoeducation handouts, and NDIS tools made for Australian clinicians. Free and paid resources available.",
    },
  };
}

function ResourcesLoadingSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-9 w-52 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          <div className="mt-2 h-4 w-full max-w-80 animate-pulse rounded-full bg-[var(--surface-alt)]" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--surface-alt)]" />
      </div>
      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[62px] animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          ))}
          <div className="h-[62px] w-24 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)]"
          />
        ))}
      </div>
    </main>
  );
}

export default async function ResourcesPage() {
  const [{ categories, tags }, browseData] = await Promise.all([
    getResourceBrowseFacets(),
    getPublishedResourcesBrowseData({ sort:"newest" }),
  ]);

  return (
    <>
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
          Psychology Resources for Australian Clinicians
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          PsychVault is a marketplace of clinical resources designed for psychologists and allied
          health professionals in Australia. Browse therapy worksheets, NDIS documentation tools,
          psychoeducation handouts, and more — all made by practising clinicians.
        </p>
      </div>
      <Suspense fallback={<ResourcesLoadingSkeleton />}>
        <ResourcesBrowseClient
          categories={categories}
          tags={tags}
          initialResources={browseData.resources}
          initialPageInfo={browseData.pageInfo}
        />
      </Suspense>
    </>
  );
}


const CATEGORY_SEO: Record<string, CategorySeoData> = {
  "therapy-worksheets": {
    title: "Therapy Worksheets for Australian Clinicians | PsychVault",
    description:
      "Printable therapy worksheets designed for Australian psychologists and counsellors. Evidence-based, clinician-ready, instant download.",
    h1: "Therapy Worksheets for Australian Clinicians",
    intro:
      "Browse printable therapy worksheets designed for use in Australian psychology and allied health practice. Resources are built by practising clinicians and cover CBT, ACT, DBT, behaviour support, and more — ready to download and use in session.",
  },
  "ndis-resources": {
    title: "NDIS Resources for Psychologists | PsychVault",
    description:
      "Templates and wording tools for NDIS reports, functional impact statements, and support justification — built for Australian allied health.",
    h1: "NDIS Resources for Australian Psychologists",
    intro:
      "Browse NDIS documentation resources designed for Australian allied health professionals. Templates cover functional impact wording, support justification, plan review reports, and more — all aligned with NDIS Act criteria and NDIA decision-making frameworks.",
  },
  psychoeducation: {
    title: "Psychoeducation Handouts Australia | PsychVault",
    description:
      "Clinician-designed psychoeducation resources for Australian practice. Clear, printable, and ready to use with clients.",
    h1: "Psychoeducation Handouts for Australian Practice",
    intro:
      "Browse psychoeducation resources designed for Australian clinicians. Handouts cover anxiety, depression, regulation, trauma, neurodiversity, and more — plain language, evidence-informed, and ready to use in session.",
  },
  "report-templates": {
    title: "Psychology Report Templates Australia | PsychVault",
    description:
      "Structured report templates for NDIS, school, and clinical psychology reports. Written for Australian documentation requirements.",
    h1: "Psychology Report Templates for Australian Practice",
    intro:
      "Browse psychology report templates structured for Australian documentation requirements. Covers NDIS, school psychology, clinical, and forensic reports — with functional impact wording, recommendations, and clear formatting built in.",
  },
  "emotional-regulation-tools": {
    title: "Emotional Regulation Tools for Clinicians | PsychVault",
    description:
      "Printable emotional regulation worksheets and tools for Australian psychologists working with children, adolescents, and adults.",
    h1: "Emotional Regulation Tools for Australian Clinicians",
    intro:
      "Browse emotional regulation resources designed for use in Australian psychology practice. Includes worksheets, tracking tools, and psychoeducation for children, adolescents, and adults across CBT, ACT, and DBT frameworks.",
  },
  "parent-handouts": {
    title: "Parent Handouts for Allied Health | PsychVault",
    description:
      "Plain-language parent handouts for Australian clinicians. Evidence-informed, ready to give families after sessions.",
    h1: "Parent Handouts for Australian Allied Health",
    intro:
      "Browse parent handouts designed for Australian allied health practice. Resources use plain language, evidence-informed content, and are structured to support what families need between sessions.",
  },
  "assessment-tools": {
    title: "Assessment Tools for Australian Psychologists | PsychVault",
    description:
      "Checklists, screeners, and structured assessment tools aligned with Australian clinical standards.",
    h1: "Assessment Tools for Australian Psychologists",
    intro:
      "Browse clinical assessment tools designed for use in Australian psychology practice. Includes structured checklists, screeners, and observational tools aligned with Australian clinical standards and diagnostic frameworks.",
  },
};

type ResourcesPageProps = {
  searchParams: Promise<{ category?: string; [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata({ searchParams }: ResourcesPageProps): Promise<Metadata> {
  const { category } = await searchParams;
  const categorySeo = category ? CATEGORY_SEO[category] : null;

  if (categorySeo) {
    return {
      title: categorySeo.title,
      description: categorySeo.description,
      alternates: {
        canonical: `${baseUrl}/resources?category=${category}`,
      },
      robots: { index: true, follow: true },
      openGraph: {
        title: categorySeo.title,
        description: categorySeo.description,
        url: `${baseUrl}/resources?category=${category}`,
        type: "website",
        locale: "en_AU",
      },
      twitter: {
        card: "summary_large_image",
        title: categorySeo.title,
        description: categorySeo.description,
      },
    };
  }

  return {
    title: "Browse Psychology Resources | PsychVault Australia",
    description:
      "Discover psychology templates, therapy worksheets, psychoeducation handouts, and NDIS tools made for Australian clinicians. Free and paid resources available.",
    alternates: {
      canonical: `${baseUrl}/resources`,
    },
    robots: {
      index: true,
      follow: true,
    },
    openGraph: {
      title: "Browse Psychology Resources | PsychVault Australia",
      description:
        "Discover psychology templates, therapy worksheets, psychoeducation handouts, and NDIS tools made for Australian clinicians. Free and paid resources available.",
      url: `${baseUrl}/resources`,
      type: "website",
      locale: "en_AU",
    },
    twitter: {
      card: "summary_large_image",
      title: "Browse Psychology Resources | PsychVault Australia",
      description:
        "Discover psychology templates, therapy worksheets, psychoeducation handouts, and NDIS tools made for Australian clinicians. Free and paid resources available.",
    },
  };
}

function ResourcesLoadingSkeleton() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="h-9 w-52 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          <div className="mt-2 h-4 w-full max-w-80 animate-pulse rounded-full bg-[var(--surface-alt)]" />
        </div>
        <div className="h-4 w-24 animate-pulse rounded-full bg-[var(--surface-alt)]" />
      </div>
      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-[62px] animate-pulse rounded-xl bg-[var(--surface-alt)]" />
          ))}
          <div className="h-[62px] w-24 animate-pulse rounded-xl bg-[var(--surface-alt)]" />
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className="h-64 animate-pulse rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)]"
          />
        ))}
      </div>
    </main>
  );
}

export default async function ResourcesPage({ searchParams }: ResourcesPageProps) {
  const { category } = await searchParams;
  const [{ categories, tags }, browseData] = await Promise.all([
    getResourceBrowseFacets(),
    getPublishedResourcesBrowseData({ sort:"newest" }),
  ]);

  const categorySeo = category ? CATEGORY_SEO[category] : null;

  return (
    <>
      {categorySeo ? (
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            {categorySeo.h1}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            {categorySeo.intro}
          </p>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-semibold tracking-tight text-[var(--text)]">
            Psychology Resources for Australian Clinicians
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
            PsychVault is a marketplace of clinical resources designed for psychologists and allied
            health professionals in Australia. Browse therapy worksheets, NDIS documentation tools,
            psychoeducation handouts, and more — all made by practising clinicians.
          </p>
        </div>
      )}
      <Suspense fallback={<ResourcesLoadingSkeleton />}>
        <ResourcesBrowseClient
          categories={categories}
          tags={tags}
          initialResources={browseData.resources}
          initialPageInfo={browseData.pageInfo}
        />
      </Suspense>
    </>
  );
}
