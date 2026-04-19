import Link from"next/link";
import type { Metadata } from"next";
import { auth } from"@/lib/auth";
import { db } from"@/lib/db";
import { stripe } from"@/lib/stripe";
import { redirect } from"next/navigation";
import { CheckoutSuccessPending } from"@/components/resources/checkout-success-pending";
import { fulfillCheckoutSessionPurchase } from"@/server/services/purchase-fulfillment";

export const metadata: Metadata = {
  title:"Payment successful — PsychVault",
  robots: { index: false, follow: false },
};

type CheckoutSuccessPageProps = {
  searchParams: Promise<{
    session_id?: string;
    resource?: string;
  }>;
};

function isValidSlug(value: string) {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value);
}

function formatPrice(cents: number) {
  return new Intl.NumberFormat("en-AU", {
    style:"currency",
    currency:"AUD",
  }).format(cents / 100);
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const sessionId = String(resolvedSearchParams.session_id ||"").trim();
  const fallbackResourceSlug =
    typeof resolvedSearchParams.resource ==="string" &&
    isValidSlug(resolvedSearchParams.resource)
      ? resolvedSearchParams.resource
      : null;

  const session = await auth();

  if (sessionId && session?.user?.id) {
    try {
      const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
      const checkoutBuyerId = checkoutSession.metadata?.buyerId;

      if (checkoutBuyerId === session.user.id) {
        const fulfillmentResult = await fulfillCheckoutSessionPurchase(checkoutSession);
        const resourceSlug = fulfillmentResult.resourceSlug ?? fallbackResourceSlug;

        if (
          fulfillmentResult.status ==="created" ||
          fulfillmentResult.status ==="existing"
        ) {
          const libraryUrl = resourceSlug
            ? `/library?purchase=success&resource=${encodeURIComponent(resourceSlug)}`
            :"/library?purchase=success";
          redirect(libraryUrl);
        }

        if (
          checkoutSession.payment_status ==="paid" ||
          checkoutSession.status ==="complete"
        ) {
          return <CheckoutSuccessPending resourceSlug={resourceSlug} />;
        }
      }
    } catch {
      // Non-fatal — fall back to the generic success page below.
    }
  }

  // Best-effort: show the user's most recently created purchase so they
  // have confirmation of what they just bought. Not shown if unauthenticated.
  let recentPurchase: {
    resource: { title: string; slug: string; isFree: boolean; priceCents: number };
    amountCents: number;
  } | null = null;

  try {
    if (session?.user?.email) {
      const user = await db.user.findUnique({
        where: { email: session.user.email },
        select: { id: true },
      });
      if (user) {
        recentPurchase = await db.purchase.findFirst({
          where: { buyerId: user.id },
          orderBy: { createdAt:"desc" },
          select: {
            amountCents: true,
            resource: {
              select: {
                title: true,
                slug: true,
                isFree: true,
                priceCents: true,
              },
            },
          },
        });
      }
    }
  } catch {
    // Non-fatal — page still works without purchase context
  }

  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center sm:px-6">
      <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
        ✅
      </div>
      <h1 className="heading-2xl">
        Payment successful
      </h1>
      <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
        Your purchase is confirmed. A confirmation email is on its way. Your resource
        is in your library and ready to download.
      </p>

      {recentPurchase ? (
        <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4 text-left shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">
            Order summary
          </p>
          <div className="mt-3 flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-[var(--text)]">
              {recentPurchase.resource.title}
            </p>
            <p className="shrink-0 text-sm font-semibold text-[var(--text)]">
              {recentPurchase.amountCents === 0 || recentPurchase.resource.isFree
                ?"Free"
                : formatPrice(recentPurchase.amountCents)}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-8 flex flex-col items-center gap-3">
        <Link
          href="/library"
          className="inline-flex rounded-xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)]"
        >
          Go to my library
        </Link>
        {recentPurchase ? (
          <Link
            href={`/resources/${recentPurchase.resource.slug}`}
            className="text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
          >
            View resource page
          </Link>
        ) : (
          <Link
            href="/resources"
            className="text-sm text-[var(--text-muted)] transition hover:text-[var(--text)]"
          >
            Browse more resources
          </Link>
        )}
      </div>
    </div>
  );
}
