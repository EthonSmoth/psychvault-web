"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCSRFToken } from "@/lib/csrf";
import { sanitizeUserText } from "@/lib/input-safety";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { revalidatePublicResources } from "@/server/cache/public-cache";
import { refreshResourceRating } from "@/server/services/reviews";

export type ReviewFormState = {
  error?: string;
  success?: string;
};

// Creates or updates a buyer review, then refreshes the resource rating aggregates.
export async function saveReviewAction(
  _prev: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You must be logged in to leave a review." };
  }

  const csrfToken = formData.get("_csrf") as string;
  if (!csrfToken || !verifyCSRFToken(csrfToken, session.user.id)) {
    return { error: "Invalid CSRF token" };
  }

  const buyerId = session.user.id;
  const resourceId = String(formData.get("resourceId") ?? "").trim();
  const resourceSlug = String(formData.get("resourceSlug") ?? "").trim();
  const rating = Number(formData.get("rating") ?? 0);
  const body = sanitizeUserText(formData.get("body"), {
    maxLength: 2000,
    preserveNewlines: true,
  });

  if (!resourceId || !resourceSlug) {
    return { error: "Missing resource information." };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Please choose a rating from 1 to 5." };
  }

  const rateLimitResult = await checkRateLimit(
    `review:${buyerId}`,
    RATE_LIMITS.review.max,
    RATE_LIMITS.review.window
  );

  if (!rateLimitResult.success) {
    return {
      error: `Too many review updates. Please wait ${rateLimitResult.resetInSeconds} seconds and try again.`,
    };
  }

  const purchase = await db.purchase.findUnique({
    where: {
      buyerId_resourceId: {
        buyerId,
        resourceId,
      },
    },
    select: { id: true },
  });

  if (!purchase) {
    return { error: "Only customers who purchased this resource can leave a review." };
  }

  await db.review.upsert({
    where: {
      buyerId_resourceId: {
        buyerId,
        resourceId,
      },
    },
    update: {
      rating,
      body: body || null,
    },
    create: {
      buyerId,
      resourceId,
      rating,
      body: body || null,
    },
  });

  await refreshResourceRating(resourceId);

  revalidatePublicResources(resourceSlug);

  return { success: "Review saved successfully." };
}
