import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireVerifiedEmailOrRedirect } from "@/lib/require-email-verification";
import { redirect } from "next/navigation";

export default async function CreatorPayoutsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  await requireVerifiedEmailOrRedirect(session.user.id, "/creator/payouts");

  const payout = await db.payoutAccount.findUnique({ where: { userId: session.user.id } });

  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 720 }}>
        <div className="card" style={{ padding: 24 }}>
          <h1>Payouts</h1>
          {payout ? (
            <div className="stack">
              <p className="muted" style={{ margin: 0 }}>Stripe account connected.</p>
              <div className="row">
                <span className="badge">Charges: {String(payout.chargesEnabled)}</span>
                <span className="badge">Payouts: {String(payout.payoutsEnabled)}</span>
                <span className="badge">Details submitted: {String(payout.detailsSubmitted)}</span>
              </div>
            </div>
          ) : (
            <p className="muted">Connect Stripe Connect onboarding here next.</p>
          )}
        </div>
      </div>
    </main>
  );
}
