import Link from"next/link";
import { redirect } from"next/navigation";
import { auth } from"@/lib/auth";
import { db } from"@/lib/db";
import { getPubliclyVisiblePublishedResourceWhere } from"@/lib/public-resource-visibility";
import { ResourceGrid } from"@/components/resources/resource-grid";
import { VerifiedBadge } from"@/components/ui/verified-badge";
import type { PublicResourceCard } from"@/types/public";

export const dynamic ="force-dynamic";

export default async function FollowingFeedPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?redirectTo=/following");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      name: true,
      follows: {
        select: {
          storeId: true,
          store: {
            select: {
              id: true,
              name: true,
              slug: true,
              isVerified: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login?redirectTo=/following");
  }

  const followedStoreIds = user.follows.map((follow) => follow.storeId);

  const resources: PublicResourceCard[] =
    followedStoreIds.length > 0
      ? (
          await db.resource.findMany({
            where: getPubliclyVisiblePublishedResourceWhere({
              storeId: {
                in: followedStoreIds,
              },
            }),
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              thumbnailUrl: true,
              previewImageUrl: true,
              priceCents: true,
              isFree: true,
              hasMainFile: true,
              averageRating: true,
              reviewCount: true,
              store: {
                select: {
                  name: true,
                  slug: true,
                  isVerified: true,
                },
              },
              creator: {
                select: {
                  name: true,
                },
              },
              categories: {
                select: {
                  category: {
                    select: {
                      id: true,
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
            orderBy: [{ createdAt:"desc" }, { salesCount:"desc" }],
            take: 24,
          })
        ).map((resource) => ({
          id: resource.id,
          slug: resource.slug,
          title: resource.title,
          shortDescription: resource.shortDescription,
          thumbnailUrl: resource.thumbnailUrl,
          previewImageUrl: resource.previewImageUrl || resource.thumbnailUrl,
          priceCents: resource.priceCents,
          isFree: resource.isFree,
          averageRating: resource.averageRating,
          reviewCount: resource.reviewCount,
          downloadReady: resource.hasMainFile,
          store: resource.store
            ? {
                name: resource.store.name,
                slug: resource.store.slug,
                isVerified: resource.store.isVerified,
              }
            : null,
          creator: resource.creator
            ? {
                name: resource.creator.name,
              }
            : null,
          categories: resource.categories.map((item) => item.category),
        }))
      : [];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Following feed
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Latest from creators you follow
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Stay up to date with newly published resources from your followed stores.
          </p>
        </div>

        <Link
          href="/resources"
          className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          Browse all resources
        </Link>
      </div>

      {user.follows.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <h2 className="text-xl font-semibold text-[var(--text)]">
            You are not following any stores yet
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Follow creators you like to build a personalised feed.
          </p>
          <div className="mt-6">
            <Link
              href="/resources"
              className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Discover creators
            </Link>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[var(--text)]">Following</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {user.follows.map((follow) => (
                <Link
                  key={follow.store.id}
                  href={`/stores/${follow.store.slug}`}
                  className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-200"
                >
                  <span>{follow.store.name}</span>
                  {follow.store.isVerified ? <VerifiedBadge size="sm" /> : null}
                </Link>
              ))}
            </div>
          </div>

          {resources.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
              <h2 className="text-xl font-semibold text-[var(--text)]">
                No recent resources yet
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                The creators you follow have not published anything recently.
              </p>
            </div>
          ) : (
            <ResourceGrid resources={resources} />
          )}
        </>
      )}
    </div>
  );
}
