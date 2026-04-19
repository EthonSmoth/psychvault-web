import Image from"next/image";
import Link from"next/link";
import { VerifiedBadge } from"@/components/ui/verified-badge";
import type { PublicResourceCard } from"@/types/public";

type ResourceCardProps = {
  resource: PublicResourceCard;
  preferThumbnail?: boolean;
  imageQuality?: number;
  imageSizes?: string;
  priority?: boolean;
};

function formatPrice(priceCents: number, isFree?: boolean) {
  if (isFree || priceCents === 0) return"Free";

  return new Intl.NumberFormat("en-AU", {
    style:"currency",
    currency:"AUD",
  }).format(priceCents / 100);
}

export default function ResourceCard({
  resource,
  preferThumbnail = false,
  imageQuality,
  imageSizes ="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px",
  priority = false,
}: ResourceCardProps) {
  const previewImage = preferThumbnail
    ? resource.thumbnailUrl || resource.previewImageUrl
    : resource.previewImageUrl || resource.thumbnailUrl;
  const isFree = resource.isFree || resource.priceCents === 0;

  return (
    <Link
      href={`/resources/${resource.slug}`}
      className="group overflow-hidden rounded-3xl border border-soft bg-[var(--card)] shadow-soft transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[var(--surface)]">
        {previewImage ? (
          <Image
            src={previewImage}
            alt={resource.title}
            fill
            sizes={imageSizes}
            quality={imageQuality}
            priority={priority}
            className="object-cover transition group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-[var(--text-muted)]">
            No preview available
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="mb-2 flex flex-wrap gap-2">
          {resource.categories.slice(0, 2).map((category) => (
            <span
              key={category.id}
              className="rounded-full bg-[var(--accent)] px-2.5 py-1 text-[11px] font-semibold text-white"
            >
              {category.name}
            </span>
          ))}
        </div>

        <div className="mb-3 flex flex-wrap items-center gap-2">
          {resource.store?.isVerified ? <VerifiedBadge size="sm" /> : null}

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
              resource.downloadReady
                ?"bg-[var(--primary)] border-[var(--primary)] text-white"
                :"bg-[var(--surface)] border-[var(--border)] text-[var(--text-muted)]"
            }`}
          >
            {resource.downloadReady ?"Download ready" :"No download attached"}
          </span>

          <span
            className={`rounded-full px-2.5 py-1 text-[11px] font-semibold border ${
              isFree
                ?"bg-[var(--primary)] border-[var(--primary)] text-white"
                :"bg-[var(--accent)] border-[var(--accent)] text-white"
            }`}
          >
            {isFree ?"Free" :"Paid"}
          </span>
        </div>

        <h3 className="line-clamp-2 text-lg font-semibold tracking-tight text-[var(--text)]">
          {resource.title}
        </h3>

        {resource.shortDescription ? (
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[var(--text-muted)]">
            {resource.shortDescription}
          </p>
        ) : null}

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-[var(--muted)]">
              {resource.store?.name || resource.creator?.name ||"Unknown creator"}
            </p>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {"\u2605"} {resource.averageRating?.toFixed?.(1) ??"New"} {"\u00b7"}{""}
              {resource.reviewCount ?? 0} reviews
            </p>
            {!isFree ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Secure Stripe checkout available
              </p>
            ) : null}
          </div>

          <div className="shrink-0 text-base font-semibold text-[var(--text)]">
            {formatPrice(resource.priceCents, resource.isFree)}
          </div>
        </div>
      </div>
    </Link>
  );
}
