"use server";

import { db } from "@/lib/db";
import { logModerationEvent } from "@/lib/moderation-events";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/require-admin";
import { getEffectivePublicResourceFileState } from "@/lib/resource-file-state";
import { revalidateMarketplaceSurface } from "@/server/cache/public-cache";
import {
  ModerationActionType,
  ModerationStatus,
  ModerationTargetType,
  ResourceReportStatus,
  ResourceStatus,
} from "@prisma/client";

// Revalidates admin surfaces plus any related public pages after moderation changes.
function revalidateAdminAndPublicPaths(extraPaths: string[] = []) {
  revalidatePath("/admin");
  revalidateMarketplaceSurface({});

  for (const path of extraPaths) {
    revalidatePath(path);
  }
}

// Archives a resource from the admin dashboard and records who moderated it.
export async function adminArchiveResourceAction(formData: FormData) {
  const admin = await requireAdmin();

  const resourceId = String(formData.get("resourceId") ?? "").trim();
  if (!resourceId) throw new Error("Missing resource id.");

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      slug: true,
      store: { select: { slug: true } },
    },
  });

  if (!resource) throw new Error("Resource not found.");

  await db.resource.update({
    where: { id: resource.id },
    data: {
      status: ResourceStatus.ARCHIVED,
      moderatedAt: new Date(),
      moderatedById: admin.id,
    },
  });

  await logModerationEvent({
    targetType: ModerationTargetType.RESOURCE,
    targetId: resource.id,
    action: ModerationActionType.ADMIN_ARCHIVED,
    message: "Resource archived by admin.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths([
    `/resources/${resource.slug}`,
    resource.store ? `/stores/${resource.store.slug}` : "/resources",
  ]);
}

// Publishes a resource from admin after confirming it includes a downloadable file.
export async function adminPublishResourceAction(formData: FormData) {
  const admin = await requireAdmin();

  const resourceId = String(formData.get("resourceId") ?? "").trim();
  if (!resourceId) throw new Error("Missing resource id.");

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      slug: true,
      mainDownloadUrl: true,
      hasMainFile: true,
      files: {
        select: {
          kind: true,
          fileUrl: true,
        },
      },
      store: { select: { slug: true } },
    },
  });

  if (!resource) throw new Error("Resource not found.");
  const effectiveFileState = getEffectivePublicResourceFileState({
    mainDownloadUrl: resource.mainDownloadUrl,
    files: resource.files,
  });

  if (!effectiveFileState.hasMainFile) {
    throw new Error("Cannot publish a resource without a main download file.");
  }

  await db.resource.update({
    where: { id: resource.id },
    data: {
      status: ResourceStatus.PUBLISHED,
      hasMainFile: effectiveFileState.hasMainFile,
      mainDownloadUrl: effectiveFileState.mainDownloadUrl,
      moderationStatus: ModerationStatus.APPROVED,
      moderationReason: null,
      moderatedAt: new Date(),
      moderatedById: admin.id,
    },
  });

  await logModerationEvent({
    targetType: ModerationTargetType.RESOURCE,
    targetId: resource.id,
    action: ModerationActionType.ADMIN_APPROVED,
    message: "Resource published by admin.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths([
    `/resources/${resource.slug}`,
    resource.store ? `/stores/${resource.store.slug}` : "/resources",
  ]);
}

// Moves a public resource back to draft without deleting it.
export async function adminUnpublishResourceAction(formData: FormData) {
  const admin = await requireAdmin();

  const resourceId = String(formData.get("resourceId") ?? "").trim();
  if (!resourceId) throw new Error("Missing resource id.");

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      slug: true,
      store: { select: { slug: true } },
    },
  });

  if (!resource) throw new Error("Resource not found.");

  await db.resource.update({
    where: { id: resource.id },
    data: {
      status: ResourceStatus.DRAFT,
      moderatedAt: new Date(),
      moderatedById: admin.id,
    },
  });

  await logModerationEvent({
    targetType: ModerationTargetType.RESOURCE,
    targetId: resource.id,
    action: ModerationActionType.ADMIN_UNPUBLISHED,
    message: "Resource moved back to draft by admin.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths([
    `/resources/${resource.slug}`,
    resource.store ? `/stores/${resource.store.slug}` : "/resources",
  ]);
}

// Makes a creator store visible on the public marketplace.
export async function adminPublishStoreAction(formData: FormData) {
  const admin = await requireAdmin();

  const storeId = String(formData.get("storeId") ?? "").trim();
  if (!storeId) throw new Error("Missing store id.");

  const store = await db.store.findUnique({
    where: { id: storeId },
    select: { id: true, slug: true },
  });

  if (!store) throw new Error("Store not found.");

  await db.store.update({
    where: { id: store.id },
    data: {
      isPublished: true,
      moderationStatus: ModerationStatus.APPROVED,
      moderationReason: null,
      moderatedAt: new Date(),
      moderatedById: admin.id,
    },
  });

  await logModerationEvent({
    targetType: ModerationTargetType.STORE,
    targetId: store.id,
    action: ModerationActionType.ADMIN_APPROVED,
    message: "Store published by admin.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths([`/stores/${store.slug}`]);
}

// Hides a store from public discovery while keeping its data intact.
export async function adminArchiveStoreAction(formData: FormData) {
  const admin = await requireAdmin();

  const storeId = String(formData.get("storeId") ?? "").trim();
  if (!storeId) throw new Error("Missing store id.");

  const store = await db.store.findUnique({
    where: { id: storeId },
    select: { id: true, slug: true },
  });

  if (!store) throw new Error("Store not found.");

  await db.store.update({
    where: { id: store.id },
    data: {
      isPublished: false,
      moderatedAt: new Date(),
      moderatedById: admin.id,
    },
  });

  await logModerationEvent({
    targetType: ModerationTargetType.STORE,
    targetId: store.id,
    action: ModerationActionType.ADMIN_ARCHIVED,
    message: "Store hidden by admin.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths([`/stores/${store.slug}`]);
}

// Toggles the verified badge shown on a creator store.
export async function adminToggleStoreVerificationAction(formData: FormData) {
  await requireAdmin();

  const storeId = String(formData.get("storeId") ?? "").trim();
  if (!storeId) throw new Error("Missing store id.");

  const store = await db.store.findUnique({
    where: { id: storeId },
    select: { id: true, slug: true, isVerified: true },
  });

  if (!store) throw new Error("Store not found.");

  await db.store.update({
    where: { id: store.id },
    data: { isVerified: !store.isVerified },
  });

  revalidateAdminAndPublicPaths([`/stores/${store.slug}`]);
}

// Approves a queued resource and publishes it in a single moderation step.
export async function adminApproveQueuedResourceAction(formData: FormData) {
  const admin = await requireAdmin();

  const resourceId = String(formData.get("resourceId") ?? "").trim();
  if (!resourceId) throw new Error("Missing resource id.");

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      slug: true,
      store: { select: { slug: true } },
      mainDownloadUrl: true,
      hasMainFile: true,
      files: {
        select: {
          kind: true,
          fileUrl: true,
        },
      },
    },
  });

  if (!resource) throw new Error("Resource not found.");
  const effectiveFileState = getEffectivePublicResourceFileState({
    mainDownloadUrl: resource.mainDownloadUrl,
    files: resource.files,
  });

  if (!effectiveFileState.hasMainFile) {
    throw new Error("Cannot approve and publish a resource without a main download file.");
  }

  await db.$transaction(async (tx) => {
    await tx.resource.update({
      where: { id: resource.id },
      data: {
        status: ResourceStatus.PUBLISHED,
        hasMainFile: effectiveFileState.hasMainFile,
        mainDownloadUrl: effectiveFileState.mainDownloadUrl,
        moderationStatus: ModerationStatus.APPROVED,
        moderationReason: null,
        moderatedAt: new Date(),
        moderatedById: admin.id,
      },
    });

    await tx.resourceReport.updateMany({
      where: {
        resourceId: resource.id,
        status: ResourceReportStatus.OPEN,
      },
      data: {
        status: ResourceReportStatus.RESOLVED,
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    });
  });

  await logModerationEvent({
    targetType: ModerationTargetType.RESOURCE,
    targetId: resource.id,
    action: ModerationActionType.ADMIN_APPROVED,
    message: "Queued resource approved and published by admin.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths([
    `/resources/${resource.slug}`,
    resource.store ? `/stores/${resource.store.slug}` : "/resources",
  ]);
}

// Rejects a queued resource back to draft with a moderation explanation.
export async function adminRejectQueuedResourceAction(formData: FormData) {
  const admin = await requireAdmin();

  const resourceId = String(formData.get("resourceId") ?? "").trim();
  const rejectionNote = String(formData.get("rejectionNote") ?? "").trim();
  if (!resourceId) throw new Error("Missing resource id.");

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      slug: true,
      store: { select: { slug: true } },
    },
  });

  if (!resource) throw new Error("Resource not found.");

  await db.$transaction(async (tx) => {
    await tx.resource.update({
      where: { id: resource.id },
      data: {
        status: ResourceStatus.DRAFT,
        moderationStatus: ModerationStatus.REJECTED,
        moderationReason:
          rejectionNote ||
          "Rejected by admin moderation. Review the content and update the listing before republishing.",
        moderatedAt: new Date(),
        moderatedById: admin.id,
      },
    });

    await tx.resourceReport.updateMany({
      where: {
        resourceId: resource.id,
        status: ResourceReportStatus.OPEN,
      },
      data: {
        status: ResourceReportStatus.RESOLVED,
        reviewedAt: new Date(),
        reviewedById: admin.id,
      },
    });
  });

  await logModerationEvent({
    targetType: ModerationTargetType.RESOURCE,
    targetId: resource.id,
    action: ModerationActionType.ADMIN_REJECTED,
    message:
      rejectionNote ||
      "Rejected by admin moderation. Review the content and update the listing before republishing.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths([
    `/resources/${resource.slug}`,
    resource.store ? `/stores/${resource.store.slug}` : "/resources",
  ]);
}

// Marks a user-submitted report as resolved after moderator review.
export async function adminResolveResourceReportAction(formData: FormData) {
  const admin = await requireAdmin();

  const reportId = String(formData.get("reportId") ?? "").trim();
  const resourceSlug = String(formData.get("resourceSlug") ?? "").trim();
  if (!reportId) throw new Error("Missing report id.");

  await db.resourceReport.update({
    where: { id: reportId },
    data: {
      status: ResourceReportStatus.RESOLVED,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  await logModerationEvent({
    targetType: ModerationTargetType.REPORT,
    targetId: reportId,
    action: ModerationActionType.ADMIN_RESOLVED_REPORT,
    message: "Report resolved by admin.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths(resourceSlug ? [`/resources/${resourceSlug}`] : []);
}

// Closes a report without taking content action when the report is not upheld.
export async function adminDismissResourceReportAction(formData: FormData) {
  const admin = await requireAdmin();

  const reportId = String(formData.get("reportId") ?? "").trim();
  const resourceSlug = String(formData.get("resourceSlug") ?? "").trim();
  if (!reportId) throw new Error("Missing report id.");

  await db.resourceReport.update({
    where: { id: reportId },
    data: {
      status: ResourceReportStatus.DISMISSED,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  await logModerationEvent({
    targetType: ModerationTargetType.REPORT,
    targetId: reportId,
    action: ModerationActionType.ADMIN_DISMISSED_REPORT,
    message: "Report dismissed by admin.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths(resourceSlug ? [`/resources/${resourceSlug}`] : []);
}

// Marks a store report as resolved after moderator review.
export async function adminResolveStoreReportAction(formData: FormData) {
  const admin = await requireAdmin();

  const reportId = String(formData.get("reportId") ?? "").trim();
  const storeSlug = String(formData.get("storeSlug") ?? "").trim();
  if (!reportId) throw new Error("Missing report id.");

  await db.storeReport.update({
    where: { id: reportId },
    data: {
      status: ResourceReportStatus.RESOLVED,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  await logModerationEvent({
    targetType: ModerationTargetType.STORE,
    targetId: reportId,
    action: ModerationActionType.ADMIN_RESOLVED_REPORT,
    message: "Store report resolved by admin.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths(storeSlug ? [`/stores/${storeSlug}`] : []);
}

// Closes a store report without taking content action when the report is not upheld.
export async function adminDismissStoreReportAction(formData: FormData) {
  const admin = await requireAdmin();

  const reportId = String(formData.get("reportId") ?? "").trim();
  const storeSlug = String(formData.get("storeSlug") ?? "").trim();
  if (!reportId) throw new Error("Missing report id.");

  await db.storeReport.update({
    where: { id: reportId },
    data: {
      status: ResourceReportStatus.DISMISSED,
      reviewedAt: new Date(),
      reviewedById: admin.id,
    },
  });

  await logModerationEvent({
    targetType: ModerationTargetType.STORE,
    targetId: reportId,
    action: ModerationActionType.ADMIN_DISMISSED_REPORT,
    message: "Store report dismissed by admin.",
    actorUserId: admin.id,
  });

  revalidateAdminAndPublicPaths(storeSlug ? [`/stores/${storeSlug}`] : []);
}
