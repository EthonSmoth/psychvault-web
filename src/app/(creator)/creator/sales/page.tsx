import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
import { isPaidResourcePayoutReady, isPayoutAccountReady } from "@/lib/stripe-connect";
import { redirect } from "next/navigation";
import { formatPrice } from "@/lib/utils";

export default async function CreatorSalesPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await requireVerifiedEmailOrRedirect(session.user.id, "/creator/sales");

  const resources = await db.resource.findMany({
    where: { creatorId: session.user.id },
    include: { purchases: true },
    orderBy: { createdAt: "desc" }
  });
  const payoutAccount = await db.payoutAccount.findUnique({
    where: { userId: session.user.id },
  });
  const payoutReady = isPayoutAccountReady(payoutAccount);
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  const paidResourcePayoutReady = isPaidResourcePayoutReady({
    role: user?.role,
    payoutReady,
  });

  const totalRevenue = resources.flatMap((r) => r.purchases).reduce((sum, purchase) => sum + purchase.creatorShareCents, 0);
  const publishedPaidResources = resources.filter((resource) => resource.status === "PUBLISHED" && resource.priceCents > 0).length;

  return (
    <main className="page">
      <div className="container stack">
        {!paidResourcePayoutReady ? (
          <div className="card" style={{ padding: 20 }}>
            <h2 style={{ marginBottom: 8 }}>Payout setup required</h2>
            <p className="muted" style={{ margin: 0 }}>
              {publishedPaidResources > 0
                ? `${publishedPaidResources} paid resource${publishedPaidResources === 1 ? "" : "s"} from older creator accounts now need Stripe payout onboarding before they can stay sale-ready.`
                : "Complete Stripe payout onboarding before you publish paid resources."}
            </p>
            <a href="/creator/payouts" className="btn btn-primary" style={{ marginTop: 12 }}>
              Finish payout setup
            </a>
          </div>
        ) : null}

        <div className="card" style={{ padding: 20 }}>
          <h1 style={{ marginBottom: 8 }}>Sales</h1>
          <p className="muted" style={{ margin: 0 }}>Creator share earned: {formatPrice(totalRevenue)}</p>
        </div>
      </div>
    </main>
  );
}
