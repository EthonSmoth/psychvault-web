"use server";

import {
  ModerationActionType,
  ModerationStatus,
  ModerationTargetType,
  ResourceReportReason,
  ResourceReportStatus,
  ResourceStatus,
} from "@prisma/client";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/email-verification";
import { verifyCSRFToken } from "@/lib/csrf";
import { db } from "@/lib/db";
import { sanitizeUserText } from "@/lib/input-safety";
import { logModerationEvent } from "@/lib/moderation-events";
import { checkRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import {
  revalidatePublicResources,
  revalidatePublicStores,
} from "@/server/cache/public-cache";

export type ReportResourceFormState = {
  error?: string;
  success?: string;
};

const ALLOWED_REASONS = new Set<string>([
  ResourceReportReason.INAPPROPRIATE_CONTENT,
  ResourceReportReason.COPYRIGHT,
  ResourceReportReason.MISLEADING_OR_UNSAFE,
  ResourceReportReason.SPAM,
  ResourceReportReason.IMPERSONATION,
]);
const AUTO_HIDE_REPORT_THRESHOLD = 3;
const AUTO_HIDE_STORE_REPORT_THRESHOLD = 3;

export type ReportStoreFormState = {
  error?: string;
  success?: string;
};

// Records or updates a user's report so moderators can review the resource in the admin queue.
export async function submitResourceReportAction(
  _prev: ReportResourceFormState,
  formData: FormData
): Promise<ReportResourceFormState> {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return { error: "You must be logged in to report a resource." };
  }

  const reporter = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, emailVerified: true },
  });

  if (!reporter?.emailVerified) {
    return { error: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
  }

  const csrfToken = String(formData.get("_csrf") ?? "").trim();
  if (!csrfToken || !verifyCSRFToken(csrfToken, session.user.id)) {
    return { error: "Invalid security token. Please refresh the page and try again." };
  }

  const resourceId = String(formData.get("resourceId") ?? "").trim();
  const resourceSlug = String(formData.get("resourceSlug") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const details = sanitizeUserText(formData.get("details"), {
    maxLength: 2000,
    preserveNewlines: true,
  });

  if (!resourceId || !resourceSlug) {
    return { error: "Missing resource information." };
  }

  if (!ALLOWED_REASONS.has(reason)) {
    return { error: "Please choose a valid report reason." };
  }

  const [user, resource] = await Promise.all([
    db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    }),
    db.resource.findUnique({
      where: { id: resourceId },
      select: {
        id: true,
        creatorId: true,
      },
    }),
  ]);

  if (!user || !resource) {
    return { error: "Resource not found." };
  }

  if (resource.creatorId === user.id) {
    return { error: "You cannot report your own resource." };
  }

  const rateLimitResult = await checkRateLimit(
    `resource-report:${user.id}`,
    RATE_LIMITS.resourceReport.max,
    RATE_LIMITS.resourceReport.window
  );

  if (!rateLimitResult.success) {
    return {
      error: `Too many reports submitted. Please wait ${rateLimitResult.resetInSeconds} seconds and try again.`,
    };
  }

  await db.$transaction(async (tx) => {
    await tx.resourceReport.upsert({
      where: {
        resourceId_reporterId: {
          resourceId,
          reporterId: user.id,
        },
      },
      update: {
        reason: reason as ResourceReportReason,
        details: details || null,
        status: ResourceReportStatus.OPEN,
        reviewedAt: null,
        reviewedById: null,
      },
      create: {
        resourceId,
        reporterId: user.id,
        reason: reason as ResourceReportReason,
        details: details || null,
        status: ResourceReportStatus.OPEN,
      },
    });

    const openReportCount = await tx.resourceReport.count({
      where: {
        resourceId,
        status: ResourceReportStatus.OPEN,
      },
    });

    if (openReportCount >= AUTO_HIDE_REPORT_THRESHOLD) {
      await tx.resource.update({
        where: { id: resourceId },
        data: {
          status: ResourceStatus.DRAFT,
          moderationStatus: ModerationStatus.PENDING_REVIEW,
          moderationReason:
            "Automatically hidden after repeated user reports. Admin review required before republishing.",
          moderatedAt: null,
          moderatedById: null,
        },
      });
    }
  });

  if (
    (await db.resource.findUnique({
      where: { id: resourceId },
      select: { moderationStatus: true, moderationReason: true },
    }))?.moderationStatus === ModerationStatus.PENDING_REVIEW
  ) {
    await logModerationEvent({
      targetType: ModerationTargetType.RESOURCE,
      targetId: resourceId,
      action: ModerationActionType.AUTO_HIDDEN,
      message:
        "Resource automatically hidden after repeated user reports and sent to moderation review.",
      actorUserId: null,
    });
  }

  revalidatePath("/admin");
  revalidatePublicResources(resourceSlug);

  return {
    success:
      "Thanks. Your report has been sent to the moderation queue.",
  };
}

// Records or updates a user's report so moderators can review the store in the admin queue.
export async function submitStoreReportAction(
  _prev: ReportStoreFormState,
  formData: FormData
): Promise<ReportStoreFormState> {
  const session = await auth();

  if (!session?.user?.id || !session.user.email) {
    return { error: "You must be logged in to report a store." };
  }

  const reporter = await db.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, emailVerified: true },
  });

  if (!reporter?.emailVerified) {
    return { error: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
  }

  const csrfToken = String(formData.get("_csrf") ?? "").trim();
  if (!csrfToken || !verifyCSRFToken(csrfToken, session.user.id)) {
    return { error: "Invalid security token. Please refresh the page and try again." };
  }

  const storeId = String(formData.get("storeId") ?? "").trim();
  const storeSlug = String(formData.get("storeSlug") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();
  const details = sanitizeUserText(formData.get("details"), {
    maxLength: 2000,
    preserveNewlines: true,
  });

  if (!storeId || !storeSlug) {
    return { error: "Missing store information." };
  }

  if (!ALLOWED_REASONS.has(reason)) {
    return { error: "Please choose a valid report reason." };
  }

  const [user, store] = await Promise.all([
    db.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    }),
    db.store.findUnique({
      where: { id: storeId },
      select: {
        id: true,
        ownerId: true,
      },
    }),
  ]);

  if (!user || !store) {
    return { error: "Store not found." };
  }

  if (store.ownerId === user.id) {
    return { error: "You cannot report your own store." };
  }

  const rateLimitResult = await checkRateLimit(
    `store-report:${user.id}`,
    RATE_LIMITS.resourceReport.max,
    RATE_LIMITS.resourceReport.window
  );

  if (!rateLimitResult.success) {
    return {
      error: `Too many reports submitted. Please wait ${rateLimitResult.resetInSeconds} seconds and try again.`,
    };
  }

  await db.$transaction(async (tx) => {
    await tx.storeReport.upsert({
      where: {
        storeId_reporterId: {
          storeId,
          reporterId: user.id,
        },
      },
      update: {
        reason: reason as ResourceReportReason,
        details: details || null,
        status: ResourceReportStatus.OPEN,
        reviewedAt: null,
        reviewedById: null,
      },
      create: {
        storeId,
        reporterId: user.id,
        reason: reason as ResourceReportReason,
        details: details || null,
        status: ResourceReportStatus.OPEN,
      },
    });

    const openStoreReportCount = await tx.storeReport.count({
      where: {
        storeId,
        status: ResourceReportStatus.OPEN,
      },
    });

    if (openStoreReportCount >= AUTO_HIDE_STORE_REPORT_THRESHOLD) {
      await tx.store.update({
        where: { id: storeId },
        data: {
          isPublished: false,
          moderationStatus: ModerationStatus.PENDING_REVIEW,
          moderationReason:
            "Automatically hidden after repeated user reports. Admin review required before republishing.",
          moderatedAt: null,
          moderatedById: null,
        },
      });
    }
  });

  revalidatePath("/admin");
  revalidatePublicStores(storeSlug);

  const refreshedStore = await db.store.findUnique({
    where: { id: storeId },
    select: {
      moderationStatus: true,
      moderationReason: true,
    },
  });

  await logModerationEvent({
    targetType: ModerationTargetType.STORE,
    targetId: storeId,
    action:
      refreshedStore?.moderationStatus === ModerationStatus.PENDING_REVIEW
        ? ModerationActionType.AUTO_HIDDEN
        : ModerationActionType.AUTO_FLAGGED,
    message:
      refreshedStore?.moderationStatus === ModerationStatus.PENDING_REVIEW
        ? "Store automatically hidden after repeated user reports and sent to moderation review."
        : "Store report submitted and queued for review.",
    actorUserId: null,
  });

  return {
    success: "Thanks. Your store report has been sent to the moderation queue.",
  };
}
