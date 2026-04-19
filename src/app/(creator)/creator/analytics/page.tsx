import { auth } from"@/lib/auth";
import { db } from"@/lib/db";
import { requireVerifiedEmailOrRedirect } from"@/lib/require-email-verification";
import { redirect } from"next/navigation";
import Link from"next/link";

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style:"currency",
    currency:"AUD",
  }).format(cents / 100);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-AU", {
    day:"numeric",
    month:"short",
    year:"numeric",
  }).format(date);
}

export default async function CreatorAnalyticsPage() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      store: {
        select: {
          id: true,
          followers: {
            select: { followerId: true },
          },
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  await requireVerifiedEmailOrRedirect(user.id,"/creator/analytics");

  if (!user.store) {
    redirect("/creator/store");
  }

  const [resources, purchasesAgg, recentPurchases] = await Promise.all([
    db.resource.findMany({
      where: {
        storeId: user.store.id,
      },
      orderBy: [{ salesCount:"desc" }, { createdAt:"desc" }],
      include: {
        purchases: {
          select: {
            id: true,
            amountCents: true,
            creatorShareCents: true,
            createdAt: true,
          },
        },
      },
    }),
    db.purchase.aggregate({
      where: {
        resource: {
          storeId: user.store.id,
        },
      },
      _sum: {
        amountCents: true,
        creatorShareCents: true,
        platformFeeCents: true,
      },
      _count: {
        id: true,
      },
    }),
    db.purchase.findMany({
      where: {
        resource: {
          storeId: user.store.id,
        },
      },
      orderBy: {
        createdAt:"desc",
      },
      take: 10,
      select: {
        id: true,
        createdAt: true,
        resource: {
          select: {
            id: true,
            title: true,
            slug: true,
          },
        },
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const totalResources = resources.length;
  const publishedResources = resources.filter((r) => r.status ==="PUBLISHED").length;
  const archivedResources = resources.filter((r) => r.status ==="ARCHIVED").length;
  const totalFollowers = user.store.followers.length;
  const totalSales = purchasesAgg._count.id ?? 0;
  const grossRevenue = purchasesAgg._sum.amountCents ?? 0;
  const creatorRevenue = purchasesAgg._sum.creatorShareCents ?? 0;
  const platformFees = purchasesAgg._sum.platformFeeCents ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            Creator analytics
          </span>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
            Store performance
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Track resource performance, sales, and revenue across your store.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/creator/resources"
            className="inline-flex rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Manage resources
          </Link>
          <Link
            href="/creator/store"
            className="inline-flex rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Store settings
          </Link>
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Resources</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{totalResources}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Published</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{publishedResources}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Archived</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{archivedResources}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Followers</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{totalFollowers}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Sales</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{totalSales}</div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-medium text-slate-500">Gross revenue</div>
          <div className="mt-2 text-3xl font-semibold text-[var(--text)]">{formatMoney(grossRevenue)}</div>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text)]">Revenue breakdown</h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-500">Gross</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text)]">
                {formatMoney(grossRevenue)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-500">Your share</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text)]">
                {formatMoney(creatorRevenue)}
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 p-4">
              <div className="text-sm font-medium text-slate-500">Platform fees</div>
              <div className="mt-2 text-lg font-semibold text-[var(--text)]">
                {formatMoney(platformFees)}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-[var(--text)]">Top resources</h2>

          <div className="mt-5 space-y-3">
            {resources.length === 0 ? (
              <p className="text-sm text-slate-500">No resources yet.</p>
            ) : (
              resources.slice(0, 8).map((resource) => {
                const gross = resource.purchases.reduce(
                  (sum, purchase) => sum + purchase.amountCents,
                  0
                );

                return (
                  <div
                    key={resource.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="font-medium text-[var(--text)]">{resource.title}</div>
                        <div className="mt-1 text-sm text-slate-600">
                          {resource.status} · {resource.salesCount} sales
                        </div>
                      </div>

                      <div className="text-right text-sm">
                        <div className="font-semibold text-[var(--text)]">
                          {formatMoney(gross)}
                        </div>
                        <div className="text-slate-500">gross</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      <section className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[var(--text)]">Recent sales</h2>

        <div className="mt-5 space-y-3">
          {recentPurchases.length === 0 ? (
            <p className="text-sm text-slate-500">No purchases yet.</p>
          ) : (
            recentPurchases.map((purchase) => (
              <div
                key={purchase.id}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="font-medium text-[var(--text)]">
                      {purchase.resource.title}
                    </div>
                    <div className="mt-1 text-sm text-slate-600">
                      Buyer: {purchase.buyer.name || purchase.buyer.email}
                    </div>
                  </div>

                  <div className="text-sm text-slate-500">
                    {formatDate(purchase.createdAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
