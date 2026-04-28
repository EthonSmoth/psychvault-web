"use client";

import { useEffect } from "react";
import { trackPurchase, type PurchaseEventData } from "@/lib/analytics";

/**
 * Fires a GA4 purchase conversion event once per purchase.
 * Deduplication is via sessionStorage so a hard refresh on the library page
 * doesn't fire a duplicate event.
 *
 * Rendered server-side as null — only fires the gtag call on the client.
 */
export function PurchaseTracker({ purchase }: { purchase: PurchaseEventData }) {
  useEffect(() => {
    const key = `pv_tracked_${purchase.transactionId}`;

    if (sessionStorage.getItem(key)) {
      return;
    }

    trackPurchase(purchase);
    sessionStorage.setItem(key, "1");
  }, [purchase.transactionId]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
