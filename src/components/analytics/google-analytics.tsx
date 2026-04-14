"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import { GA_MEASUREMENT_ID, isAnalyticsEnabled, trackPageView } from "@/lib/analytics";

type IdleWindow = Window & {
  requestIdleCallback?: (
    callback: IdleRequestCallback,
    options?: IdleRequestOptions
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function GoogleAnalytics() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [shouldLoadScripts, setShouldLoadScripts] = useState(false);

  useEffect(() => {
    if (!isAnalyticsEnabled()) {
      return;
    }

    let timeoutId: number | null = null;
    let idleId: number | null = null;

    const scheduleLoad = () => {
      const idleWindow = window as IdleWindow;

      if (typeof idleWindow.requestIdleCallback === "function") {
        idleId = idleWindow.requestIdleCallback(() => {
          setShouldLoadScripts(true);
        }, { timeout: 4000 });
        return;
      }

      timeoutId = window.setTimeout(() => {
        setShouldLoadScripts(true);
      }, 2500);
    };

    if (document.readyState === "complete") {
      scheduleLoad();
    } else {
      window.addEventListener("load", scheduleLoad, { once: true });
    }

    return () => {
      window.removeEventListener("load", scheduleLoad);

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }

      if (idleId !== null && typeof (window as IdleWindow).cancelIdleCallback === "function") {
        (window as IdleWindow).cancelIdleCallback!(idleId);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAnalyticsEnabled() || !pathname || !shouldLoadScripts) {
      return;
    }

    const query = searchParams?.toString();
    const url = `${window.location.origin}${pathname}${query ? `?${query}` : ""}`;
    trackPageView(url, document.title);
  }, [pathname, searchParams, shouldLoadScripts]);

  if (!isAnalyticsEnabled() || !shouldLoadScripts) {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="lazyOnload"
      />
      <Script id="google-analytics" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}', {
            send_page_view: false
          });
        `}
      </Script>
    </>
  );
}
