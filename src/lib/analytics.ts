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
