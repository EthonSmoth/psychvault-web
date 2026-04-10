"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { verifyCSRFToken } from "@/lib/csrf";

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
  const body = String(formData.get("body") ?? "").trim();

  if (!resourceId || !resourceSlug) {
    return { error: "Missing resource information." };
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Please choose a rating from 1 to 5." };
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

  const reviews = await db.review.findMany({
    where: { resourceId },
    select: { rating: true },
  });

  const reviewCount = reviews.length;
  const averageRating =
    reviewCount > 0
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviewCount
      : 0;

  await db.resource.update({
    where: { id: resourceId },
    data: {
      averageRating,
      reviewCount,
    },
  });

  revalidatePath(`/resources/${resourceSlug}`);
  revalidatePath("/resources");
  revalidatePath("/library");

  return { success: "Review saved successfully." };
}
