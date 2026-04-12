"use server";

import { auth } from "@/lib/auth";
import { getCreatorTrustProfile, shouldForceTrustReview } from "@/lib/creator-trust";
import { db } from "@/lib/db";
import { logModerationEvent } from "@/lib/moderation-events";
import { revalidatePath } from "next/cache";
import {
  ModerationActionType,
  ModerationStatus,
  ModerationTargetType,
  PreviewType,
  Prisma,
  ResourceStatus,
} from "@prisma/client";
import { verifyCSRFToken } from "@/lib/csrf";
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/email-verification";
import {
  inspectDocumentForModeration,
  moderateResourceText,
  validateUpload,
} from "@/lib/resource-moderation";
import { sanitizeUserText } from "@/lib/input-safety";
import { getPublicResourceFileState } from "@/lib/resource-file-state";
import { resolveStorageLocation } from "@/lib/storage";
import { revalidateMarketplaceSurface } from "@/server/cache/public-cache";

export type ResourceFormState = {
  error?: string;
  success?: string;
  resourceId?: string;
  resourceSlug?: string;
};

// Converts a title into a stable slug base that works in public URLs.
function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

// Parses a currency input into integer cents for safe storage and comparisons.
function parsePriceToCents(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();

  if (!value) return 0;
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;

  const dollars = Number(value);
  if (!Number.isFinite(dollars) || dollars < 0) return null;

  return Math.round(dollars * 100);
}

// Parses optional file size inputs while rejecting negative or invalid values.
function parseOptionalPositiveInt(raw: FormDataEntryValue | null): number | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;

  return Math.round(parsed);
}

// Ensures uploads still point at PsychVault-managed storage instead of arbitrary third-party URLs.
function isManagedUploadReference(value: string) {
  return Boolean(resolveStorageLocation(value));
}

// Removes empty and duplicate values from multi-select inputs such as tags and previews.
function dedupe(values: string[]) {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

// Derives a presentable file name from a stored URL or storage reference.
function getFileNameFromReference(value: string, fallback: string) {
  const storageLocation = resolveStorageLocation(value);

  if (storageLocation) {
    return storageLocation.path.split("/").pop()?.trim() || fallback;
  }

  try {
    const pathname = new URL(value).pathname;
    const last = pathname.split("/").pop()?.trim();
    return last || fallback;
  } catch {
    return fallback;
  }
}

// Reuses the shared upload validator with the resource form's field-specific file kinds.
function validateUploadedFile(
  fileName: string,
  mimeType: string | null | undefined,
  kind: "thumbnail" | "preview" | "main"
) {
  return validateUpload(fileName, mimeType || "", kind);
}

// Infers how previews should be treated so listings can render the right preview experience.
function inferPreviewType(
  previewUrls: string[],
  mainFileMime?: string | null
): PreviewType | null {
  const urls = previewUrls.map((u) => u.toLowerCase());

  if (urls.some((u) => /\.(png|jpg|jpeg|webp|gif|svg)$/.test(u))) {
    return PreviewType.IMAGE_PREVIEW;
  }

  if (
    urls.some((u) => /\.pdf($|\?)/.test(u)) ||
    (mainFileMime ?? "").toLowerCase().includes("pdf")
  ) {
    return PreviewType.PDF_PREVIEW;
  }

  if (urls.length > 0) {
    return PreviewType.TEXT_PREVIEW;
  }

  return null;
}

// Maps moderation results onto persistent resource review state in the database.
function getModerationState(decision: "allow" | "warn", reason?: string | null) {
  if (decision === "warn") {
    return {
      moderationStatus: ModerationStatus.PENDING_REVIEW,
      moderationReason:
        reason ||
        "Automatically flagged by text moderation. Review required before publishing.",
    };
  }

  return {
    moderationStatus: ModerationStatus.APPROVED,
    moderationReason: null,
  };
}

// Ensures public resource slugs stay unique when creators save or rename listings.
async function generateUniqueResourceSlug(title: string, excludeId?: string) {
  const base = slugify(title) || "resource";

  const existing = await db.resource.findMany({
    where: {
      slug: {
        startsWith: base,
      },
      ...(excludeId
        ? {
            id: {
              not: excludeId,
            },
          }
        : {}),
    },
    select: { slug: true },
  });

  const existingSlugs = new Set(existing.map((item) => item.slug));

  if (!existingSlugs.has(base)) {
    return base;
  }

  let counter = 2;
  while (existingSlugs.has(`${base}-${counter}`)) {
    counter += 1;
  }

  return `${base}-${counter}`;
}

// Loads the authenticated creator together with their store for resource management actions.
async function getCurrentCreator() {
  const session = await auth();

  if (!session?.user?.email) {
    return null;
  }

  return db.user.findUnique({
    where: { email: session.user.email },
    include: { store: true },
  });
}

/**
 * Saves a creator resource, validates uploads and metadata, applies moderation,
 * and decides whether the listing stays in draft or can be published immediately.
 */
export async function saveResourceAction(
  _prev: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  const user = await getCurrentCreator();

  if (!user) {
    return { error: "You must be logged in to manage a resource." };
  }

  // CSRF Protection
  const csrfToken = String(formData.get("_csrf") || "").trim();
  if (!csrfToken || !verifyCSRFToken(csrfToken, user.id)) {
    return { error: "Invalid security token. Please refresh the page and try again." };
  }

  if (!user.store) {
    return { error: "You need to create a store before managing resources." };
  }

  if (!user.emailVerified) {
    return { error: EMAIL_VERIFICATION_REQUIRED_MESSAGE };
  }

  const resourceId = String(formData.get("resourceId") ?? "").trim();
  const isEditMode = Boolean(resourceId);

  const title = sanitizeUserText(formData.get("title"), { maxLength: 160 });
  const description = sanitizeUserText(formData.get("description"), {
    maxLength: 20000,
    preserveNewlines: true,
  });
  const shortDescription = sanitizeUserText(formData.get("shortDescription"), {
    maxLength: 220,
  });
  const thumbnailUrl = sanitizeUserText(formData.get("thumbnailUrl"), { maxLength: 2048 });

  const categoryId = String(formData.get("categoryId") ?? "").trim();
  const tagIds = dedupe(formData.getAll("tagIds").map(String));

  const isPublished = formData.get("isPublished") === "on";
  const creatorAttestation = String(formData.get("creatorAttestation") ?? "").trim() === "yes";

  const mainFileUrl = sanitizeUserText(formData.get("mainFileUrl"), { maxLength: 2048 });
  const mainFileName = sanitizeUserText(formData.get("mainFileName"), { maxLength: 255 });
  const mainFileMime = sanitizeUserText(formData.get("mainFileMime"), { maxLength: 120 });
  const mainFileSize = parseOptionalPositiveInt(formData.get("mainFileSize"));

  const previewUrls = dedupe(formData.getAll("previewUrl").map(String));
  const priceCents = parsePriceToCents(formData.get("price"));

  const moderation = moderateResourceText({
    title,
    shortDescription,
    description,
  });
  const trustProfile = await getCreatorTrustProfile(user.id);
  const trustReview = shouldForceTrustReview(trustProfile);

  if (!title) return { error: "Title is required." };
  if (!description) return { error: "Description is required." };
  if (!categoryId) return { error: "Please choose a category." };

  if (priceCents === null) {
    return {
      error: "Price must be a valid non-negative amount with up to 2 decimal places.",
    };
  }

  if (thumbnailUrl && !isManagedUploadReference(thumbnailUrl)) {
    return { error: "Thumbnail must be uploaded through PsychVault storage." };
  }

  if (thumbnailUrl) {
    const validation = validateUploadedFile(
      getFileNameFromReference(thumbnailUrl, "thumbnail"),
      "image/png",
      "thumbnail"
    );
    if (!validation.ok) {
      return { error: validation.error };
    }
  }

  if (mainFileUrl && !isManagedUploadReference(mainFileUrl)) {
    return { error: "Main file must be uploaded through PsychVault storage." };
  }

  if (mainFileUrl) {
    const validation = validateUploadedFile(
      mainFileName || getFileNameFromReference(mainFileUrl, "download"),
      mainFileMime,
      "main"
    );
    if (!validation.ok) {
      return { error: validation.error };
    }
  }

  for (const previewUrl of previewUrls) {
    if (!isManagedUploadReference(previewUrl)) {
      return { error: "All preview images must be uploaded through PsychVault storage." };
    }

    const validation = validateUploadedFile(
      getFileNameFromReference(previewUrl, "preview"),
      "image/png",
      "preview"
    );
    if (!validation.ok) {
      return { error: validation.error };
    }
  }

  if (isPublished && !creatorAttestation) {
    return {
      error:
        "Please confirm the creator attestation before publishing this resource.",
    };
  }

  if (moderation.decision === "block") {
    return {
      error:
        "This resource could not be saved because it appears to contain prohibited or unsafe material.",
    };
  }

  const documentModeration =
    mainFileUrl && (mainFileMime.toLowerCase().includes("pdf") || mainFileName.toLowerCase().endsWith(".pdf"))
      ? await inspectDocumentForModeration({
          fileUrl: mainFileUrl,
          fileName: mainFileName || getFileNameFromReference(mainFileUrl, "download.pdf"),
          mimeType: mainFileMime,
        })
      : {
          decision: "skipped" as const,
          reason: null,
          extractedText: null,
        };

  if (documentModeration.decision === "block") {
    return {
      error:
        documentModeration.reason ||
        "This resource could not be saved because the uploaded document appears unsafe.",
    };
  }

  const combinedModerationDecision: "allow" | "warn" =
    moderation.decision === "warn" ||
    documentModeration.decision === "warn" ||
    trustReview.shouldReview
      ? "warn"
      : "allow";
  const combinedModerationReason =
    documentModeration.reason ||
    trustReview.reason ||
    (moderation.decision === "warn"
      ? "Automatically flagged by text moderation. Review required before publishing."
      : null);

  const [category, tags] = await Promise.all([
    db.category.findUnique({
      where: { id: categoryId },
      select: { id: true },
    }),
    tagIds.length
      ? db.tag.findMany({
          where: { id: { in: tagIds } },
          select: { id: true },
        })
      : Promise.resolve([]),
  ]);

  if (!category) {
    return { error: "Selected category was not found. Please refresh and try again." };
  }

  if (tagIds.length && tags.length !== tagIds.length) {
    return { error: "One or more selected tags were not found. Please refresh and try again." };
  }

  try {
    if (isEditMode) {
      const existing = await db.resource.findFirst({
        where: {
          id: resourceId,
          creatorId: user.id,
          storeId: user.store.id,
        },
        include: {
          files: true,
        },
      });

      if (!existing) {
        return { error: "Resource not found or you do not have permission to edit it." };
      }

      const effectiveMainFileUrl =
        mainFileUrl ||
        existing.files.find((file) => file.kind === "MAIN_DOWNLOAD")?.fileUrl ||
        "";
      const effectivePreviewUrls = previewUrls.length
        ? previewUrls
        : existing.files
            .filter((file) => file.kind === "PREVIEW")
            .map((file) => file.fileUrl);
      const resourceFileState = getPublicResourceFileState({
        thumbnailUrl,
        previewUrls: effectivePreviewUrls,
        mainDownloadUrl: effectiveMainFileUrl,
      });
      if (isPublished && !effectiveMainFileUrl) {
        return { error: "A published resource needs a main download file attached." };
      }

      const titleChanged = existing.title !== title;
      const slug = titleChanged
        ? await generateUniqueResourceSlug(title, existing.id)
        : existing.slug;

      const previewType = inferPreviewType(previewUrls, mainFileMime || null);
      const shouldPublish =
        isPublished && combinedModerationDecision !== "warn";
      const status = shouldPublish ? ResourceStatus.PUBLISHED : ResourceStatus.DRAFT;
      const isFree = priceCents === 0;
      const moderationState = getModerationState(
        combinedModerationDecision,
        combinedModerationReason
      );

      await db.$transaction(async (tx) => {
        await tx.resource.update({
          where: { id: existing.id },
          data: {
            title,
            slug,
            description,
            shortDescription: shortDescription || null,
            thumbnailUrl: thumbnailUrl || null,
            imageUrl: thumbnailUrl || null,
            previewImageUrl: resourceFileState.previewImageUrl,
            mainDownloadUrl: resourceFileState.mainDownloadUrl,
            hasMainFile: resourceFileState.hasMainFile,
            priceCents,
            currency: "AUD",
            isFree,
            status,
            moderationStatus: moderationState.moderationStatus,
            moderationReason: moderationState.moderationReason,
            moderatedAt: combinedModerationDecision === "warn" ? null : new Date(),
            moderatedById: null,
            previewType,
          },
        });

        await tx.resourceCategory.deleteMany({
          where: { resourceId: existing.id },
        });

        await tx.resourceCategory.create({
          data: {
            resourceId: existing.id,
            categoryId,
          },
        });

        await tx.resourceTag.deleteMany({
          where: { resourceId: existing.id },
        });

        if (tagIds.length) {
          await tx.resourceTag.createMany({
            data: tagIds.map((tagId) => ({
              resourceId: existing.id,
              tagId,
            })),
          });
        }

        await tx.resourceFile.deleteMany({
          where: { resourceId: existing.id },
        });

        if (thumbnailUrl) {
          await tx.resourceFile.create({
            data: {
              resourceId: existing.id,
              kind: "THUMBNAIL",
              fileUrl: thumbnailUrl,
              fileName: getFileNameFromReference(thumbnailUrl, "thumbnail"),
              mimeType: null,
              fileSizeBytes: null,
              sortOrder: 0,
            },
          });
        }

        if (mainFileUrl) {
          await tx.resourceFile.create({
            data: {
              resourceId: existing.id,
              kind: "MAIN_DOWNLOAD",
              fileUrl: mainFileUrl,
              fileName: mainFileName || getFileNameFromReference(mainFileUrl, "download"),
              mimeType: mainFileMime || null,
              fileSizeBytes: mainFileSize,
              sortOrder: 0,
            },
          });
        } else {
          const oldMain = existing.files.find((file) => file.kind === "MAIN_DOWNLOAD");
          if (oldMain?.fileUrl) {
            await tx.resourceFile.create({
              data: {
                resourceId: existing.id,
                kind: "MAIN_DOWNLOAD",
                fileUrl: oldMain.fileUrl,
                fileName: oldMain.fileName,
                mimeType: oldMain.mimeType,
                fileSizeBytes: oldMain.fileSizeBytes,
                sortOrder: 0,
              },
            });
          }
        }

        if (previewUrls.length) {
          await tx.resourceFile.createMany({
            data: previewUrls.map((url, index) => ({
              resourceId: existing.id,
              kind: "PREVIEW",
              fileUrl: url,
              fileName: getFileNameFromReference(url, `preview-${index + 1}`),
              mimeType: null,
              fileSizeBytes: null,
              sortOrder: index,
            })),
          });
        } else {
          const oldPreviews = existing.files.filter((file) => file.kind === "PREVIEW");
          if (oldPreviews.length) {
            await tx.resourceFile.createMany({
              data: oldPreviews.map((file, index) => ({
                resourceId: existing.id,
                kind: "PREVIEW",
                fileUrl: file.fileUrl,
                fileName: file.fileName,
                mimeType: file.mimeType,
                fileSizeBytes: file.fileSizeBytes,
                sortOrder: index,
              })),
            });
          }
        }
      });

      revalidatePath("/creator/resources");
      revalidateMarketplaceSurface({
        resourceSlug: slug,
        storeSlug: user.store.slug,
      });

      if (existing.slug !== slug) {
        revalidatePath(`/resources/${existing.slug}`);
      }

      await logModerationEvent({
        targetType: ModerationTargetType.RESOURCE,
        targetId: existing.id,
        action:
          combinedModerationDecision === "warn"
            ? ModerationActionType.AUTO_FLAGGED
            : ModerationActionType.AUTO_APPROVED,
        message: combinedModerationReason,
        actorUserId: null,
      });

      return {
        success:
          isPublished && combinedModerationDecision === "warn"
            ? "Resource saved as draft. Publishing is temporarily disabled until the content is reviewed."
            : "Resource updated successfully.",
        resourceId: existing.id,
        resourceSlug: slug,
      };
    }

    if (isPublished && !mainFileUrl) {
      return { error: "A published resource needs a main download file attached." };
    }

    const slug = await generateUniqueResourceSlug(title);
    const previewType = inferPreviewType(previewUrls, mainFileMime || null);
    const shouldPublish =
      isPublished && combinedModerationDecision !== "warn";
    const status = shouldPublish ? ResourceStatus.PUBLISHED : ResourceStatus.DRAFT;
    const isFree = priceCents === 0;
    const resourceFileState = getPublicResourceFileState({
      thumbnailUrl,
      previewUrls,
      mainDownloadUrl: mainFileUrl,
    });
    const moderationState = getModerationState(
      combinedModerationDecision,
      combinedModerationReason
    );

    const created = await db.$transaction(async (tx) => {
      const resource = await tx.resource.create({
        data: {
          title,
          slug,
          description,
          shortDescription: shortDescription || null,
          thumbnailUrl: thumbnailUrl || null,
          imageUrl: thumbnailUrl || null,
          previewImageUrl: resourceFileState.previewImageUrl,
          mainDownloadUrl: resourceFileState.mainDownloadUrl,
          hasMainFile: resourceFileState.hasMainFile,
          priceCents,
          currency: "AUD",
          isFree,
          status,
          moderationStatus: moderationState.moderationStatus,
          moderationReason: moderationState.moderationReason,
          moderatedAt: combinedModerationDecision === "warn" ? null : new Date(),
          moderatedById: null,
          previewType,
          storeId: user.store!.id,
          creatorId: user.id,
          categories: {
            create: [{ categoryId }],
          },
          tags: tagIds.length
            ? {
                create: tagIds.map((tagId) => ({ tagId })),
              }
            : undefined,
        },
        select: {
          id: true,
          slug: true,
        },
      });

      if (thumbnailUrl) {
        await tx.resourceFile.create({
          data: {
            resourceId: resource.id,
            kind: "THUMBNAIL",
            fileUrl: thumbnailUrl,
            fileName: getFileNameFromReference(thumbnailUrl, "thumbnail"),
            mimeType: null,
            fileSizeBytes: null,
            sortOrder: 0,
          },
        });
      }

      if (mainFileUrl) {
        await tx.resourceFile.create({
          data: {
            resourceId: resource.id,
            kind: "MAIN_DOWNLOAD",
            fileUrl: mainFileUrl,
            fileName: mainFileName || getFileNameFromReference(mainFileUrl, "download"),
            mimeType: mainFileMime || null,
            fileSizeBytes: mainFileSize,
            sortOrder: 0,
          },
        });
      }

      if (previewUrls.length) {
        await tx.resourceFile.createMany({
          data: previewUrls.map((url, index) => ({
            resourceId: resource.id,
            kind: "PREVIEW",
            fileUrl: url,
            fileName: getFileNameFromReference(url, `preview-${index + 1}`),
            mimeType: null,
            fileSizeBytes: null,
            sortOrder: index,
          })),
        });
      }

      return resource;
    });

    revalidatePath("/creator/resources");
    revalidateMarketplaceSurface({
      resourceSlug: created.slug,
      storeSlug: user.store.slug,
    });

    await logModerationEvent({
      targetType: ModerationTargetType.RESOURCE,
      targetId: created.id,
      action:
        combinedModerationDecision === "warn"
          ? ModerationActionType.AUTO_FLAGGED
          : ModerationActionType.AUTO_APPROVED,
      message: combinedModerationReason,
      actorUserId: null,
    });

    return {
      success:
        isPublished && combinedModerationDecision === "warn"
          ? "Resource saved as draft. Publishing is temporarily disabled until the content is reviewed."
          : status === ResourceStatus.PUBLISHED
          ? "Resource published successfully."
          : "Resource saved as draft.",
      resourceId: created.id,
      resourceSlug: created.slug,
    };
  } catch (error) {
    console.error("saveResourceAction failed", error);

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return {
        error: "A conflicting record already exists. Please try again.",
      };
    }

    return {
      error: "Something went wrong while saving the resource.",
    };
  }
}

// Permanently deletes a creator-owned resource and all dependent marketplace records.
export async function deleteResourceAction(formData: FormData) {
  const user = await getCurrentCreator();

  if (!user || !user.store) {
    throw new Error("You must be logged in.");
  }

  if (!user.emailVerified) {
    throw new Error(EMAIL_VERIFICATION_REQUIRED_MESSAGE);
  }

  // CSRF Protection
  const csrfToken = String(formData.get("_csrf") || "").trim();
  if (!csrfToken || !verifyCSRFToken(csrfToken, user.id)) {
    throw new Error("Invalid security token. Please refresh the page and try again.");
  }

  const resourceId = String(formData.get("resourceId") || "").trim();
  if (!resourceId) {
    throw new Error("Missing resource id.");
  }

  const resource = await db.resource.findFirst({
    where: {
      id: resourceId,
      creatorId: user.id,
      storeId: user.store.id,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!resource) {
    throw new Error("Resource not found or you do not have permission to delete it.");
  }

  await db.$transaction(async (tx) => {
    await tx.review.deleteMany({
      where: { resourceId: resource.id },
    });

    await tx.purchase.deleteMany({
      where: { resourceId: resource.id },
    });

    await tx.resourceFile.deleteMany({
      where: { resourceId: resource.id },
    });

    await tx.resourceCategory.deleteMany({
      where: { resourceId: resource.id },
    });

    await tx.resourceTag.deleteMany({
      where: { resourceId: resource.id },
    });

    await tx.resource.delete({
      where: { id: resource.id },
    });
  });

  revalidatePath("/creator/resources");
  revalidateMarketplaceSurface({
    resourceSlug: resource.slug,
    storeSlug: user.store.slug,
  });
}
