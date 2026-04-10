import Stripe from "stripe";
import { getRequiredServerEnv, parsePositiveIntEnv } from "@/lib/env";

const stripeSecret = getRequiredServerEnv("STRIPE_SECRET_KEY");
export const stripe = new Stripe(stripeSecret, {
  apiVersion: "2025-08-27.basil"
});

export function getPlatformFeeBps() {
  return parsePositiveIntEnv("PLATFORM_FEE_BPS", 2000);
}
