import Image from "next/image";
import Link from "next/link";
import { formatBlogDate, type BlogPostListItem } from "@/lib/blog";

type BlogPostCardProps = {
  post: BlogPostListItem;
  featured?: boolean;
};

export function BlogPostCard({
  post,
  featured = false,
}: BlogPostCardProps) {
  return (
    <article
      className={`group flex h-full flex-col overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
        featured ? "lg:grid lg:grid-cols-[1.15fr_0.85fr]" : ""
      }`}
    >
      <Link href={`/blog/${post.slug}`} className="relative block overflow-hidden bg-[var(--surface-alt)]" tabIndex={-1} aria-hidden="true">
        {post.coverImage ? (
          <>
            <Image
              src={post.coverImage}
              alt={post.coverImageAlt || post.title}
              fill
              sizes={
                featured
                  ? "(max-width: 1024px) 100vw, 48vw"
                  : "(max-width: 1024px) 100vw, 33vw"
              }
              className="object-cover transition duration-300 group-hover:scale-[1.02]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(63,45,31,0.12),rgba(63,45,31,0.52))]" />
          </>
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(128,80,45,0.18),transparent_44%),linear-gradient(135deg,rgba(247,239,226,1),rgba(226,205,178,0.95))]" />
        )}

        <div className="relative flex h-full min-h-[220px] flex-col justify-between p-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-[var(--card)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text)]">
              {post.category}
            </span>
            {post.featured ? (
              <span className="rounded-full border border-[var(--border-strong)] bg-[rgba(251,246,238,0.88)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-muted)]">
                Featured
              </span>
            ) : null}
          </div>

          <div>
            <div
              className={`text-sm ${
                post.coverImage ? "text-white/85" : "text-[var(--text-light)]"
              }`}
            >
              {formatBlogDate(post.publishedAt)} / {post.readingTimeMinutes} min read
            </div>
            <h2
              className={`mt-3 font-semibold tracking-tight ${
                post.coverImage ? "text-white" : "text-[var(--text)]"
              } ${featured ? "text-3xl sm:text-4xl" : "text-2xl"}`}
            >
              {post.title}
            </h2>
          </div>
        </div>
      </Link>

      <div className="flex flex-1 flex-col p-6">
        <p
          className={`text-[var(--text-muted)] ${
            featured ? "text-base leading-7" : "text-sm leading-6"
          }`}
        >
          {post.description}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          {post.tags.slice(0, featured ? 4 : 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[var(--surface-alt)] px-3 py-1 text-xs font-medium text-[var(--text-muted)]"
            >
              {tag}
            </span>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <div className="text-sm text-[var(--text-light)]">By {post.author}</div>
          <Link
            href={`/blog/${post.slug}`}
            className="mt-4 inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
          >
            Read article
          </Link>
        </div>
      </div>
    </article>
  );
}
