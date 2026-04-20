import Link from"next/link";
import type { Metadata } from"next";
import { getAppBaseUrl } from"@/lib/env";
import { serializeJsonLd } from"@/lib/input-safety";
import { getAllBlogPosts, getFeaturedBlogPosts } from"@/lib/blog";
import { BlogPostCard } from"@/components/blog/blog-post-card";

export const revalidate = 300;

const baseUrl = getAppBaseUrl();
const blogUrl = `${baseUrl}/blog`;
const feedUrl = `${baseUrl}/feed.xml`;

function resolveBlogImageUrl(src?: string | null) {
  if (!src) {
    return `${baseUrl}/opengraph-image`;
  }

  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  return src.startsWith("/") ? `${baseUrl}${src}` : `${baseUrl}/${src}`;
}

export const metadata: Metadata = {
  title:"PsychVault Blog",
  description:
"Read practical articles on psychology resources, NDIS workflows, report writing, psychoeducation, and selling clinician-designed tools online.",
  keywords: [
"psychology blog",
"NDIS report writing",
"psychoeducation resources",
"therapy worksheet tips",
"sell psychology resources",
"clinical templates",
  ],
  alternates: {
    canonical: blogUrl,
    types: {
"application/rss+xml": feedUrl,
    },
  },
  openGraph: {
    type:"website",
    url: blogUrl,
    title:"PsychVault Blog",
    description:
"Practical articles on psychology resources, workflows, templates, and digital products for clinicians.",
    images: [
      {
        url:"/opengraph-image",
        width: 1200,
        height: 630,
        alt:"PsychVault Blog",
      },
    ],
  },
  twitter: {
    card:"summary_large_image",
    title:"PsychVault Blog",
    description:
"Practical articles on psychology resources, workflows, templates, and digital products for clinicians.",
    images: ["/opengraph-image"],
  },
};

export default async function BlogIndexPage() {
  const [posts, featuredPosts] = await Promise.all([
    getAllBlogPosts(),
    getFeaturedBlogPosts(4),
  ]);

  const leadPost = featuredPosts[0] ?? posts[0] ?? null;
  const secondaryPosts = featuredPosts
    .filter((post) => post.slug !== leadPost?.slug)
    .slice(0, 3);
  const remainingPosts = posts.filter(
    (post) => post.slug !== leadPost?.slug && !secondaryPosts.some((item) => item.slug === post.slug)
  );
  const categories = Array.from(new Set(posts.map((post) => post.category))).slice(0, 6);

  const blogSchema = {
"@context":"https://schema.org",
"@type":"Blog",
    name:"PsychVault Blog",
    description:
"Practical articles on psychology resources, NDIS workflows, clinical templates, and creator growth.",
    url: blogUrl,
    publisher: {
"@type":"Organization",
      name:"PsychVault",
      url: baseUrl,
      logo: `${baseUrl}/logo-PNG.png`,
    },
    inLanguage:"en-AU",
    blogPost: posts.slice(0, 12).map((post) => ({
"@type":"BlogPosting",
      headline: post.title,
      description: post.description,
      datePublished: post.publishedAt.toISOString(),
      dateModified: (post.updatedAt ?? post.publishedAt).toISOString(),
      url: `${blogUrl}/${post.slug}`,
      image: resolveBlogImageUrl(post.coverImage),
      keywords: post.tags,
      articleSection: post.category,
      author: {
"@type":"Person",
        name: post.author,
      },
    })),
  };

  const breadcrumbSchema = {
"@context":"https://schema.org",
"@type":"BreadcrumbList",
    itemListElement: [
      {
"@type":"ListItem",
        position: 1,
        name:"Home",
        item: baseUrl,
      },
      {
"@type":"ListItem",
        position: 2,
        name:"Blog",
        item: blogUrl,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <div className="grid gap-10 px-6 py-10 lg:grid-cols-[1.15fr_0.85fr] lg:px-10 lg:py-12">
            <div>
              <span className="inline-flex rounded-full border border-[var(--border-strong)] bg-[var(--surface-alt)] px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text)]">
                For Clinicians
              </span>
              <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
                Practical reading for clinicians who want clearer tools and calmer workflows.
              </h1>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--text-muted)]">
                Read concise articles on report writing, psychoeducation, NDIS documentation,
                neurodiversity-affirming practice, and the everyday systems that make
                clinical work easier.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={leadPost ? `/blog/${leadPost.slug}` :"#latest-posts"}
                  className="inline-flex rounded-xl bg-[var(--primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
                >
                  Start reading
                </Link>
                <Link
                  href={feedUrl}
                  className="inline-flex rounded-xl border border-[var(--border-strong)] bg-[var(--surface-alt)] px-5 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)]"
                >
                  Subscribe via RSS
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl bg-[var(--surface-alt)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Practical and readable</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Short, skimmable articles grounded in the kinds of questions clinicians ask every week.
                </p>
              </div>
              <div className="rounded-3xl bg-[var(--surface-alt)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Clinically relevant topics</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Expect report writing, psychoeducation, templates, NDIS wording, and resource ideas.
                </p>
              </div>
              <div className="rounded-3xl bg-[var(--surface-alt)] p-5">
                <div className="text-sm font-semibold text-[var(--text)]">Made for busy readers</div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  Clear headings, useful examples, and takeaways you can bring into practice quickly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {leadPost ? (
          <section className="mt-12">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
                  Featured article
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
                  Start here
                </h2>
              </div>
            </div>

            <BlogPostCard post={leadPost} featured />
          </section>
        ) : null}

        {secondaryPosts.length > 0 ? (
          <section className="mt-8 grid gap-5 lg:grid-cols-3">
            {secondaryPosts.map((post) => (
              <BlogPostCard key={post.slug} post={post} />
            ))}
          </section>
        ) : null}

        <section id="latest-posts" className="mt-14 grid gap-8 lg:grid-cols-[0.72fr_1.28fr]">
          <aside className="card-section">
            <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
              What You&apos;ll Find
            </div>
            <h2 className="heading-2xl mt-3">
              Topics clinicians actually come looking for
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
              From report templates and psychoeducation to NDIS wording and client-facing
              resources, the blog focuses on practical issues that show up in real work.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-[var(--surface-alt)] px-3 py-1.5 text-xs font-medium text-[var(--text)]"
                >
                  {category}
                </span>
              ))}
            </div>
          </aside>

          <div>
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
                  Latest posts
                </div>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
                  More recent reads
                </h2>
              </div>
            </div>

            {remainingPosts.length > 0 ? (
              <div className="grid gap-5 md:grid-cols-2">
                {remainingPosts.map((post) => (
                  <BlogPostCard key={post.slug} post={post} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-[var(--border-strong)] bg-[var(--card)] p-8 text-sm text-[var(--text-muted)]">
                More articles are on the way.
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
