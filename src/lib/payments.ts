import { getAppBaseUrl, parseBooleanEnv } from "@/lib/env";

// Returns whether paid checkout should be available to buyers right now.
export function getPaymentsAvailability() {
  const enabled = parseBooleanEnv("PAYMENTS_AVAILABLE", true);

  return {
    enabled,
    reason: enabled
      ? null
      : "Paid checkout is temporarily unavailable while payment activation is being finalised. Free resources still work normally.",
  };
}

// Centralizes storefront links used in legal copy and commerce callouts.
export function getMarketplacePolicyLinks() {
  return {
    appUrl: getAppBaseUrl(),
    privacy: "/privacy-policy",
    terms: "/terms-of-service",
    refunds: "/refund-policy",
  };
}
