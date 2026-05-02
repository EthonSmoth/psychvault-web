import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { stripe } from "@/lib/stripe";
import { getAppBaseUrl } from "@/lib/env";
import { ensureAllowedOrigin } from "@/lib/request-security";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const CREDIT_OPTIONS: Record<number, { label: string; amountCents: number }> = {
  1: { label: "1 parse credit", amountCents: 200 },
  3: { label: "3 parse credits", amountCents: 600 },
  5: { label: "5 parse credits", amountCents: 1000 },
};

export async function POST(request: Request) {
  const originError = ensureAllowedOrigin(request);
  if (originError) return originError;

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  const clientIP = getClientIP(request);
  const rateLimitResult = await checkRateLimit(
    `logbook-checkout:${clientIP}`,
    RATE_LIMITS.checkout.max,
    RATE_LIMITS.checkout.window
  );
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const quantity =
    body && typeof body === "object" && "quantity" in body
      ? Number((body as Record<string, unknown>).quantity)
      : NaN;

  if (!CREDIT_OPTIONS[quantity]) {
    return NextResponse.json(
      { error: "Invalid quantity. Must be 1, 3, or 5." },
      { status: 400 }
    );
  }

  const option = CREDIT_OPTIONS[quantity];
  const baseUrl = getAppBaseUrl();

  try {
    const checkoutSession = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "aud",
            unit_amount: option.amountCents,
            product_data: {
              name: "PsychVault Logbook Parse",
              description: option.label,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        purchase_type: "logbook_credit",
        userId: session.user.id,
        quantity: String(quantity),
      },
      success_url: `${baseUrl}/logbook/dashboard?credits=purchased`,
      cancel_url: `${baseUrl}/logbook/dashboard`,
    });

    if (!checkoutSession.url) {
      logger.error("[logbook/checkout] Stripe session created but no URL returned");
      return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
    }

    return NextResponse.json({ url: checkoutSession.url });
  } catch (err) {
    logger.error("[logbook/checkout] Stripe error", err);
    return NextResponse.json({ error: "Could not create checkout session." }, { status: 500 });
  }
}
