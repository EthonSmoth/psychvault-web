"use server";

import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCSRFToken } from "@/lib/csrf";
import { sanitizeUserText } from "@/lib/input-safety";
import { logger } from "@/lib/logger";
import { checkRateLimit, getClientIPFromHeaders, RATE_LIMITS } from "@/lib/rate-limit";
import { revalidatePublicResources } from "@/server/cache/public-cache";
import { refreshResourceRating } from "@/server/services/reviews";
import { analyseReviewCompliance, isLikelyFirstReview } from "@/lib/review-compliance";

export type ReviewFormState = {
  error?: string;
  success?: string;
  warning?: string;
  complianceFeedback?: string;
  isFlagged?: boolean;
  isFirstReview?: boolean;
};

// Creates or updates a buyer review, then refreshes the resource rating aggregates.
export async function saveReviewAction(
  _prev: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { error: "You must be logged in to leave a review." };
    }

    const csrfToken = formData.get("_csrf") as string;
    if (!csrfToken || !verifyCSRFToken(csrfToken, session.user.id)) {
      return { error: "Invalid CSRF token" };
    }

    const buyerId = session.user.id;
    const requestHeaders = await headers();
    const clientIP = getClientIPFromHeaders(requestHeaders);
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

    const [userRateLimit, ipRateLimit, existingReview] = await Promise.all([
      checkRateLimit(`review:${buyerId}`, RATE_LIMITS.review.max, RATE_LIMITS.review.window),
      checkRateLimit(
        `review:${clientIP}`,
        RATE_LIMITS.review.max,
        RATE_LIMITS.review.window
      ),
      db.review.findUnique({
        where: {
          buyerId_resourceId: {
            buyerId,
            resourceId,
          },
        },
        select: { rating: true, body: true },
      }),
    ]);

    if (!userRateLimit.success || !ipRateLimit.success) {
      const retryAfter = Math.max(
        userRateLimit.resetInSeconds,
        ipRateLimit.resetInSeconds
      );

      return {
        error: `Too many review updates. Please wait ${retryAfter} seconds and try again.`,
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

    // AHPRA compliance check
    const complianceResult = analyseReviewCompliance(body || "");

    if (complianceResult.status === "reject") {
      // Clear breach - block submission
      return {
        error: complianceResult.feedback || "Your review contains content that doesn't comply with platform guidelines. Please revise and try again.",
        complianceFeedback: complianceResult.feedback,
      };
    }

    // Determine if this is the user's first review
    const userReviewCount = await db.review.count({
      where: { buyerId },
    });

    const isFirstReview = userReviewCount === 0;

    // Save the review (flagged or not)
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

    // Determine success/warning message
    let successMessage = "Review saved successfully.";
    const isFlagged = complianceResult.status === "flag";

    if (isFlagged) {
      successMessage = "Review submitted. Thanks for your feedback!";
    }

    return {
      success: successMessage,
      warning: isFlagged
        ? "Your review was flagged for manual review and may take longer to appear."
        : undefined,
      complianceFeedback: complianceResult.feedback,
      isFlagged,
      isFirstReview,
    };
  } catch (error) {
    logger.error("saveReviewAction failed.", error);
    return { error: "Something went wrong. Please try again." };
  }
}

export type FlagReviewFormState = {
  error?: string;
  success?: string;
};

// Flags a review for admin attention. One flag per user per review.
export async function flagReviewAction(
  _prev: FlagReviewFormState,
  formData: FormData
): Promise<FlagReviewFormState> {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return { error: "You must be logged in to flag a review." };
    }

    const csrfToken = formData.get("_csrf") as string;
    if (!csrfToken || !verifyCSRFToken(csrfToken, session.user.id)) {
      return { error: "Invalid CSRF token." };
    }

    const reporterId = session.user.id;
    const reviewId = String(formData.get("reviewId") ?? "").trim();
    const reason = sanitizeUserText(formData.get("reason"), { maxLength: 100 });

    if (!reviewId) return { error: "Missing review ID." };
    if (!reason) return { error: "Please select a reason." };

    const review = await db.review.findUnique({
      where: { id: reviewId },
      select: { id: true, buyerId: true },
    });

    if (!review) return { error: "Review not found." };
    if (review.buyerId === reporterId) return { error: "You cannot flag your own review." };

    await db.reviewReport.upsert({
      where: { reviewId_reporterId: { reviewId, reporterId } },
      update: { reason },
      create: { reviewId, reporterId, reason },
    });

    return { success: "Review flagged. Our team will take a look." };
  } catch (error) {
    logger.error("flagReviewAction failed.", error);
    return { error: "Something went wrong. Please try again." };
  }
}
