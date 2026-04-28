export const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "";

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

type AnalyticsEventParams = Record<string, string | number | boolean | null | undefined>;

export function isAnalyticsEnabled() {
  return Boolean(GA_MEASUREMENT_ID);
}

export function trackPageView(url: string, title?: string) {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", "page_view", {
    page_location: url,
    page_title: title,
    page_path: new URL(url).pathname + new URL(url).search,
  });
}

export function trackEvent(eventName: string, params: AnalyticsEventParams = {}) {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  window.gtag("event", eventName, params);
}

export type PurchaseEventData = {
  /** Unique purchase ID from the database — used as GA transaction_id */
  transactionId: string;
  /** Resource ID — used as GA item_id */
  resourceId: string;
  /** Resource title — used as GA item_name */
  resourceTitle: string;
  /** Creator / store name — used as GA item_category */
  storeName: string;
  /** Purchase amount in AUD cents (0 for free resources) */
  amountCents: number;
};

/**
 * Fires a GA4 purchase ecommerce event.
 * Call this on the client after a confirmed purchase — for both free ($0) and paid resources.
 * Uses GA4 ecommerce schema so it works with Google Ads conversion tracking.
 */
export function trackPurchase(data: PurchaseEventData) {
  if (!isAnalyticsEnabled() || typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }

  const value = data.amountCents / 100;

  window.gtag("event", "purchase", {
    transaction_id: data.transactionId,
    value,
    currency: "AUD",
    items: [
      {
        item_id: data.resourceId,
        item_name: data.resourceTitle,
        item_category: data.storeName,
        price: value,
        quantity: 1,
      },
    ],
  });
}

type ConsentState = "granted" | "denied";

interface ConsentParams {
  ad_storage: ConsentState;
  ad_user_data: ConsentState;
  ad_personalization: ConsentState;
  analytics_storage: ConsentState;
}

/**
 * Call this from a cookie banner when the user accepts or rejects tracking.
 *
 * Accept all:
 *   updateConsent({ ad_storage: "granted", ad_user_data: "granted",
 *                   ad_personalization: "granted", analytics_storage: "granted" })
 *
 * Reject (analytics-only — analytics stays granted):
 *   updateConsent({ ad_storage: "denied", ad_user_data: "denied",
 *                   ad_personalization: "denied", analytics_storage: "granted" })
 */
export function updateConsent(params: ConsentParams) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") {
    return;
  }
  window.gtag("consent", "update", params as unknown as Record<string, unknown>);
}

