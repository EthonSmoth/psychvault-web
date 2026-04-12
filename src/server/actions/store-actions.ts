"use server";

import { requireAuth } from "@/lib/auth-guards";
import { getCreatorTrustProfile, shouldForceTrustReview } from "@/lib/creator-trust";
import { db } from "@/lib/db";
import { logModerationEvent } from "@/lib/moderation-events";
import { logger } from "@/lib/logger";
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/email-verification";
import { sanitizeUserText } from "@/lib/input-safety";
import { revalidatePath } from "next/cache";
import {
  ModerationActionType,
  ModerationTargetType,
} from "@prisma/client";
import { verifyCSRFToken } from "@/lib/csrf";
import { moderateStoreText } from "@/lib/resource-moderation";
import { revalidateMarketplaceSurface } from "@/server/cache/public-cache";

export type StoreFormState = {
  error?: string;
  success?: string;
};

// Normalizes store slugs so creator storefront URLs stay clean and predictable.
function normaliseSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Creates or updates a creator store and promotes buyers to creators on first store creation.
export async function saveStoreAction(
  _prevState: StoreFormState,
  formData: FormData
): Promise<StoreFormState> {
  try {
    let session;
    try {
      session = await requireAuth();
    } catch {
      return { error: "You must be logged in." };
    }

    const csrfToken = String(formData.get("_csrf") || "").trim();
    if (!csrfToken || !verifyCSRFToken(csrfToken, session.id)) {
      return { error: "Invalid security token. Please refresh the page and try again." };
    }

    const bannerUrl = sanitizeUserText(formData.get("bannerUrl"), { maxLength: 2048 });
    const logoUrl = sanitizeUserText(formData.get("logoUrl"), { maxLength: 2048 });
    const name = sanitizeUserText(formData.get("name"), { maxLength: 120 });
    const slug = normaliseSlug(String(formData.get("slug") || ""));
    const location = sanitizeUserText(formData.get("location"), { maxLength: 120 });
    const bio = sanitizeUserText(formData.get("bio"), {
      maxLength: 5000,
      preserveNewlines: true,
    });
    const isPublished = formData.get("isPublished") === "on";
    const moderation = moderateStoreText({
      name,
      bio,
      location,
    });

    if (!name) {
      return { error: "Store name is required." };
    }

    if (!slug) {
      return { error: "Store slug is required." };
    }

    if (slug.length < 2 || slug.length > 120) {
      return { error: "Store slug must be between 2 and 120 characters." };
    }

    if (moderation.decision === "block") {
      return {
        error:
          "This store could not be saved because it appears to contain prohibited or unsafe material.",
      };
    }

    const user = await db.user.findUnique({
      where: { id: session.id },
      include: { store: true },
    });

    if (!user) {
      return { error: "User not found." };
    }

    if (!user.emailVerified) {
      return { error: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
    }

    const trustProfile = await getCreatorTrustProfile(user.id);
    const trustReview = shouldForceTrustReview(trustProfile);

    const existingSlug = await db.store.findFirst({
      where: {
        slug,
        NOT: user.store ? { id: user.store.id } : undefined,
      },
    });

    if (existingSlug) {
      return { error: "That store slug is already in use." };
    }

    let finalStoreSlug = slug;
    const shouldPublish =
      isPublished && moderation.decision !== "warn" && !trustReview.shouldReview;
    const moderationReason =
      moderation.decision === "warn"
        ? "Automatically flagged by store moderation. Review required before publishing."
        : trustReview.reason;
    let storeId = user.store?.id ?? "";

    if (user.store) {
      const updated = await db.store.update({
        where: { id: user.store.id },
        data: {
          name,
          slug,
          location: location || null,
          bio: bio || null,
          isPublished: shouldPublish,
          bannerUrl: bannerUrl || null,
          logoUrl: logoUrl || null,
          moderationStatus: moderation.decision === "warn" ? "PENDING_REVIEW" : "APPROVED",
          moderationReason,
          moderatedAt: moderation.decision === "warn" ? null : new Date(),
          moderatedById: null,
        },
      });

      finalStoreSlug = updated.slug;
      storeId = updated.id;
    } else {
      const created = await db.store.create({
        data: {
          ownerId: user.id,
          name,
          slug,
          location: location || null,
          bio: bio || null,
          isPublished: shouldPublish,
          bannerUrl: bannerUrl || null,
          logoUrl: logoUrl || null,
          moderationStatus: moderation.decision === "warn" ? "PENDING_REVIEW" : "APPROVED",
          moderationReason,
          moderatedAt: moderation.decision === "warn" ? null : new Date(),
          moderatedById: null,
        },
      });

      finalStoreSlug = created.slug;
      storeId = created.id;

      if (user.role === "BUYER") {
        await db.user.update({
          where: { id: user.id },
          data: { role: "CREATOR" },
        });
      }
    }

    revalidatePath("/creator");
    revalidatePath("/creator/store");
    revalidateMarketplaceSurface({ storeSlug: finalStoreSlug });

    await logModerationEvent({
      targetType: ModerationTargetType.STORE,
      targetId: storeId,
      action:
        moderation.decision === "warn" || trustReview.shouldReview
          ? ModerationActionType.AUTO_FLAGGED
          : ModerationActionType.AUTO_APPROVED,
      message: moderationReason,
      actorUserId: null,
    });

    return {
      success:
        moderation.decision === "warn" || trustReview.shouldReview
          ? "Store saved, but publishing is paused until it passes moderation review."
          : "Store saved successfully.",
    };
  } catch (error) {
    logger.error("saveStoreAction failed.", error);
    return { error: "Something went wrong. Please try again." };
  }
}
