"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ResourceStatus } from "@prisma/client";
import { verifyCSRFToken } from "@/lib/csrf";
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/email-verification";

// Loads the signed-in creator and guarantees they have a store before continuing.
async function getCurrentUserWithStore() {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
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
  revalidatePath("/");
  revalidatePath("/resources");
  revalidatePath("/creator");
  revalidatePath("/creator/resources");
  revalidatePath("/creator/resources/archived");
  revalidatePath(`/resources/${resourceSlug}`);
  revalidatePath(`/stores/${storeSlug}`);
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

  if (resource.creatorId !== user.id || resource.storeId !== user.store.id) {
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

  if (resource.creatorId !== user.id || resource.storeId !== user.store.id) {
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
      files: {
        where: { kind: "MAIN_DOWNLOAD" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!resource) throw new Error("Resource not found.");

  if (resource.creatorId !== user.id || resource.storeId !== user.store.id) {
    throw new Error("Not authorised.");
  }

  if (resource.files.length === 0) {
    throw new Error("This resource cannot be published because it has no main download file.");
  }

  await db.resource.update({
    where: { id: resource.id },
    data: { status: ResourceStatus.PUBLISHED },
  });

  revalidateResourcePaths(resource.slug, user.store.slug);
}
