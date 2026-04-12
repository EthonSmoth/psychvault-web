"use server";

import { requireAuth, requireOwnership } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { ResourceStatus } from "@prisma/client";
import { verifyCSRFToken } from "@/lib/csrf";
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/email-verification";
import { getEffectivePublicResourceFileState } from "@/lib/resource-file-state";
import { revalidateMarketplaceSurface } from "@/server/cache/public-cache";

// Loads the signed-in creator and guarantees they have a store before continuing.
async function getCurrentUserWithStore() {
  const authedUser = await requireAuth({
    redirectOnFail: true,
    redirectTo: "/creator/resources",
  });

  const user = await db.user.findUnique({
    where: { id: authedUser.id },
    include: { store: true },
  });

  if (!user || !user.store) {
    throw new Error("Store not found.");
  }

  if (!user.emailVerified) {
    throw new Error(EMAIL_VERIFICATION_REQUIRED_MESSAGE);
  }

  return user as typeof user & { store: NonNullable<typeof user["store"]> };
}

// Revalidates creator and public pages affected by resource archive/restore actions.
function revalidateResourcePaths(resourceSlug: string, storeSlug: string) {
  revalidatePath("/creator");
  revalidatePath("/creator/resources");
  revalidatePath("/creator/resources/archived");
  revalidateMarketplaceSurface({
    resourceSlug,
    storeSlug,
  });
}

// Soft-deletes a creator-owned listing by moving it into the archived state.
export async function deleteOwnResourceAction(formData: FormData) {
  const user = await getCurrentUserWithStore();

  const csrfToken = formData.get("_csrf") as string;
  if (!csrfToken || !verifyCSRFToken(csrfToken, user.id)) {
    throw new Error("Invalid CSRF token");
  }

  const resourceId = String(formData.get("resourceId") ?? "").trim();

  if (!resourceId) throw new Error("Missing resource id.");

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      slug: true,
      creatorId: true,
      storeId: true,
      status: true,
    },
  });

  if (!resource) throw new Error("Resource not found.");

  try {
    requireOwnership(user.id, resource.creatorId, "Not authorised.");
  } catch {
    throw new Error("Not authorised.");
  }

  if (resource.storeId !== user.store.id) {
    throw new Error("Not authorised.");
  }

  if (resource.status === ResourceStatus.ARCHIVED) {
    return;
  }

  await db.resource.update({
    where: { id: resource.id },
    data: { status: ResourceStatus.ARCHIVED },
  });

  revalidateResourcePaths(resource.slug, user.store.slug);
}

// Restores an archived creator resource back into draft for further editing.
export async function restoreOwnResourceAction(formData: FormData) {
  const user = await getCurrentUserWithStore();

  const csrfToken = formData.get("_csrf") as string;
  if (!csrfToken || !verifyCSRFToken(csrfToken, user.id)) {
    throw new Error("Invalid CSRF token");
  }

  const resourceId = String(formData.get("resourceId") ?? "").trim();

  if (!resourceId) throw new Error("Missing resource id.");

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      slug: true,
      creatorId: true,
      storeId: true,
    },
  });

  if (!resource) throw new Error("Resource not found.");

  try {
    requireOwnership(user.id, resource.creatorId, "Not authorised.");
  } catch {
    throw new Error("Not authorised.");
  }

  if (resource.storeId !== user.store.id) {
    throw new Error("Not authorised.");
  }

  await db.resource.update({
    where: { id: resource.id },
    data: { status: ResourceStatus.DRAFT },
  });

  revalidateResourcePaths(resource.slug, user.store.slug);
}

// Restores an archived resource and republishes it when it is download-ready.
export async function restoreOwnResourceAndPublishAction(formData: FormData) {
  const user = await getCurrentUserWithStore();

  const csrfToken = formData.get("_csrf") as string;
  if (!csrfToken || !verifyCSRFToken(csrfToken, user.id)) {
    throw new Error("Invalid CSRF token");
  }

  const resourceId = String(formData.get("resourceId") ?? "").trim();

  if (!resourceId) throw new Error("Missing resource id.");

  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: {
      id: true,
      slug: true,
      creatorId: true,
      storeId: true,
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

  try {
    requireOwnership(user.id, resource.creatorId, "Not authorised.");
  } catch {
    throw new Error("Not authorised.");
  }

  if (resource.storeId !== user.store.id) {
    throw new Error("Not authorised.");
  }

  const effectiveFileState = getEffectivePublicResourceFileState({
    mainDownloadUrl: resource.mainDownloadUrl,
    files: resource.files,
  });

  if (!effectiveFileState.hasMainFile) {
    throw new Error("This resource cannot be published because it has no main download file.");
  }

  await db.resource.update({
    where: { id: resource.id },
    data: {
      status: ResourceStatus.PUBLISHED,
      hasMainFile: effectiveFileState.hasMainFile,
      mainDownloadUrl: effectiveFileState.mainDownloadUrl,
    },
  });

  revalidateResourcePaths(resource.slug, user.store.slug);
}
