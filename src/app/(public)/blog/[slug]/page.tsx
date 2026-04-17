import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppBaseUrl } from "@/lib/env";
import { serializeJsonLd } from "@/lib/input-safety";
import {
  formatBlogDate,
  getBlogPostBySlug,
  getRelatedBlogPosts,
} from "@/lib/blog";
import { auth } from "@/lib/auth";
import { BlogPostCard } from "@/components/blog/blog-post-card";
import { BlogTableOfContents, MarkdownRenderer } from "@/components/blog/markdown-renderer";
import { BlogCommentForm } from "@/components/blog/blog-comment-form";
import { BlogCommentList } from "@/components/blog/blog-comment-list";

export const revalidate = 300;

type BlogPostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return [];
}

function resolveBlogImageUrl(baseUrl: string, src?: string | null) {
  if (!src) {
    return `${baseUrl}/opengraph-image`;
  }

  if (/^https?:\/\//i.test(src)) {
    return src;
  }

  return src.startsWith("/") ? `${baseUrl}${src}` : `${baseUrl}/${src}`;
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);

  if (!post) {
    return {
      title: "Article not found | PsychVault",
      description: "The requested article could not be found.",
      robots: {
        index: false,
        follow: false,
      },
    };
  }

  const baseUrl = getAppBaseUrl();
  const url = `${baseUrl}/blog/${post.slug}`;
  const imageUrl = resolveBlogImageUrl(baseUrl, post.coverImage);

  return {
    title: post.title,
    description: post.description,
    keywords: post.tags,
    authors: [{ name: post.author }],
    alternates: {
      canonical: url,
    },
    openGraph: {
      type: "article",
      url,
      title: post.title,
      description: post.description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: post.coverImageAlt || post.title,
        },
      ],
      publishedTime: post.publishedAt.toISOString(),
      modifiedTime: (post.updatedAt ?? post.publishedAt).toISOString(),
      authors: [post.author],
      section: post.category,
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
      images: [imageUrl],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  const session = await auth();

  if (!post) {
    notFound();
  }

  const [relatedPosts] = await Promise.all([getRelatedBlogPosts(post.slug, 3)]);
  const baseUrl = getAppBaseUrl();
  const postUrl = `${baseUrl}/blog/${post.slug}`;
  const imageUrl = resolveBlogImageUrl(baseUrl, post.coverImage);
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${baseUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: postUrl,
      },
    ],
  };
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    articleSection: post.category,
    keywords: post.tags,
    datePublished: post.publishedAt.toISOString(),
    dateModified: (post.updatedAt ?? post.publishedAt).toISOString(),
    wordCount: post.wordCount,
    timeRequired: `PT${post.readingTimeMinutes}M`,
    mainEntityOfPage: postUrl,
    url: postUrl,
    image: imageUrl,
    inLanguage: "en-AU",
    author: {
      "@type": "Person",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "PsychVault",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/logo-PNG.png`,
      },
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(articleSchema) }}
      />

      <article className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div>
            <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[var(--text-light)]">
              <Link href="/" className="transition hover:text-[var(--accent)]">
                Home
              </Link>
              <span>/</span>
              <Link href="/blog" className="transition hover:text-[var(--accent)]">
                Blog
              </Link>
              <span>/</span>
              <span className="text-[var(--text)]">{post.title}</span>
            </nav>

            <header className="overflow-hidden rounded-[2rem] border border-[var(--border)] bg-[var(--card)] shadow-sm">
              {post.coverImage ? (
                <div className="relative aspect-[16/8] overflow-hidden border-b border-[var(--border)] bg-[var(--surface-alt)]">
                  <Image
                    src={post.coverImage}
                    alt={post.coverImageAlt || post.title}
                    fill
                    priority
                    sizes="(max-width: 1280px) 100vw, 1100px"
                    className="object-cover"
                  />
                </div>
              ) : null}
              <div className="bg-[radial-gradient(circle_at_top_left,rgba(128,80,45,0.18),transparent_38%),linear-gradient(135deg,rgba(251,246,238,1),rgba(237,220,197,0.92))] px-6 py-10 sm:px-8 lg:px-10">
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-[var(--card)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text)]">
                    {post.category}
                  </span>
                  {post.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-[var(--border)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <h1 className="mt-5 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
                  {post.title}
                </h1>
                <p className="mt-5 max-w-3xl text-lg leading-8 text-[var(--text-muted)]">
                  {post.description}
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-[var(--text-light)]">
                  <span>By {post.author}</span>
                  <span>{formatBlogDate(post.publishedAt)}</span>
                  <span>{post.readingTimeMinutes} min read</span>
                  <span>{post.wordCount} words</span>
                  {post.updatedAt ? (
                    <span>Updated {formatBlogDate(post.updatedAt)}</span>
                  ) : null}
                </div>
              </div>
            </header>

            <div className="mt-8 rounded-[2rem] border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8 lg:p-10">
              <MarkdownRenderer content={post.content} headings={post.headings} />
            </div>

            {/* Comments Section */}
            <section className="mt-14 space-y-8">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">
                  Discussion
                </h2>
                <p className="mt-2 text-[var(--text-muted)]">
                  Share your thoughts and experiences with this resource.
                </p>
              </div>

              <BlogCommentForm
                slug={post.slug}
                isLoggedIn={!!session?.user?.id}
              />

              <div>
                <h3 className="mb-4 text-lg font-semibold text-[var(--text)]">
                  Comments
                </h3>
                <BlogCommentList
                  slug={post.slug}
                  currentUserId={session?.user?.id}
                  currentUserRole={session?.user?.role}
                />
              </div>
            </section>

            <section className="mt-10 grid gap-5 md:grid-cols-2">
              <Link
                href="/resources"
                className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
                  Next step
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text)]">
                  Browse real clinician-made resources
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  Move from strategy into implementation with templates, handouts, and
                  psychoeducation tools already live on the marketplace.
                </p>
              </Link>

              <Link
                href="/creator"
                className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
                  For creators
                </div>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text)]">
                  Turn your own resources into a polished store
                </h2>
                <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
                  Publish clinician-grade templates, build trust signals, and start
                  growing an evergreen library under your own brand.
                </p>
              </Link>
            </section>

            {relatedPosts.length > 0 ? (
              <section className="mt-14">
                <div className="mb-6">
                  <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
                    Related reading
                  </div>
                  <h2 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">
                    Keep the topic cluster growing
                  </h2>
                </div>
                <div className="grid gap-5 lg:grid-cols-3">
                  {relatedPosts.map((relatedPost) => (
                    <BlogPostCard key={relatedPost.slug} post={relatedPost} />
                  ))}
                </div>
              </section>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-28">
            <BlogTableOfContents headings={post.headings} />

            <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--text-light)]">
                Article details
              </div>
              <div className="mt-4 space-y-3 text-sm text-[var(--text-muted)]">
                <div>
                  <span className="font-semibold text-[var(--text)]">Category:</span> {post.category}
                </div>
                <div>
                  <span className="font-semibold text-[var(--text)]">Published:</span>{" "}
                  {formatBlogDate(post.publishedAt)}
                </div>
                <div>
                  <span className="font-semibold text-[var(--text)]">Reading time:</span>{" "}
                  {post.readingTimeMinutes} min
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[var(--surface-alt)] px-3 py-1 text-xs font-medium text-[var(--text)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </article>
    </>
  );
}
