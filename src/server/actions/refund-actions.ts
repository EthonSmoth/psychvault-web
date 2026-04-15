"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCSRFToken } from "@/lib/csrf";
import { sanitizeUserText } from "@/lib/sanitize";
import { trySendRefundRequestAdminEmail } from "@/lib/email";
import { getAppBaseUrl } from "@/lib/env";
import { revalidatePath } from "next/cache";

export type RefundFormState = {
  error?: string;
  success?: string;
};

const REFUND_REASONS = [
  "Resource not as described",
  "Duplicate purchase",
  "Technical issue — file could not be downloaded",
  "Purchased by mistake",
  "Other",
] as const;

export async function submitRefundRequestAction(
  _prevState: RefundFormState,
  formData: FormData
): Promise<RefundFormState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to request a refund." };
    }

    const csrfToken = String(formData.get("_csrf") ?? "");
    if (!verifyCSRFToken(csrfToken, session.user.id)) {
      return { error: "Invalid request. Please refresh and try again." };
    }

    const purchaseId = String(formData.get("purchaseId") ?? "").trim();
    const reason = String(formData.get("reason") ?? "").trim();
    const message = sanitizeUserText(String(formData.get("message") ?? ""), {
      maxLength: 1000,
    });

    if (!purchaseId) {
      return { error: "Missing purchase reference." };
    }

    if (!REFUND_REASONS.includes(reason as (typeof REFUND_REASONS)[number])) {
      return { error: "Please select a valid reason." };
    }

    // Confirm this purchase belongs to the user and is a paid purchase
    const purchase = await db.purchase.findUnique({
      where: { id: purchaseId },
      include: {
        resource: { select: { title: true, slug: true } },
        buyer: { select: { id: true, name: true, email: true } },
        refundRequest: { select: { id: true } },
      },
    });

    if (!purchase || purchase.buyerId !== session.user.id) {
      return { error: "Purchase not found." };
    }

    if (purchase.amountCents === 0) {
      return { error: "Free resources are not eligible for refunds." };
    }

    if (purchase.refundRequest) {
      return { error: "A refund request for this purchase has already been submitted." };
    }

    await db.refundRequest.create({
      data: {
        purchaseId,
        buyerId: session.user.id,
        reason,
        message: message || null,
      },
    });

    // Alert admin — fire and forget
    trySendRefundRequestAdminEmail({
      buyerEmail: purchase.buyer.email,
      buyerName: purchase.buyer.name ?? purchase.buyer.email,
      resourceTitle: purchase.resource.title,
      reason,
      message: message || null,
      purchaseId,
      appBaseUrl: getAppBaseUrl(),
    });

    revalidatePath("/library");
    return { success: "Refund request submitted. We'll review it within 2 business days." };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
