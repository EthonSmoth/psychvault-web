import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
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

  const totalRevenue = resources.flatMap((r) => r.purchases).reduce((sum, purchase) => sum + purchase.creatorShareCents, 0);

  return (
    <main className="page">
      <div className="container stack">
        <div className="card" style={{ padding: 20 }}>
          <h1 style={{ marginBottom: 8 }}>Sales</h1>
          <p className="muted" style={{ margin: 0 }}>Creator share earned: {formatPrice(totalRevenue)}</p>
        </div>
      </div>
    </main>
  );
}
