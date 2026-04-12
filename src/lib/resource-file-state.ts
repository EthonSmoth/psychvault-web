import { ResourceFileKind } from "@prisma/client";

type ResourceFileStateInput = {
  thumbnailUrl?: string | null;
  previewUrls?: string[];
  mainDownloadUrl?: string | null;
};

type ResourceFileLike = {
  kind: ResourceFileKind | "PREVIEW" | "MAIN_DOWNLOAD" | "THUMBNAIL";
  fileUrl: string | null;
};

// Derives the public-facing file summary fields stored on each resource record.
export function getPublicResourceFileState({
  thumbnailUrl,
  previewUrls = [],
  mainDownloadUrl,
}: ResourceFileStateInput) {
  const cleanedPreviewUrls = previewUrls.map((url) => url.trim()).filter(Boolean);
  const trimmedThumbnailUrl = thumbnailUrl?.trim() || null;
  const trimmedMainDownloadUrl = mainDownloadUrl?.trim() || null;

  return {
    previewImageUrl: trimmedThumbnailUrl || cleanedPreviewUrls[0] || null,
    hasMainFile: Boolean(trimmedMainDownloadUrl),
    mainDownloadUrl: trimmedMainDownloadUrl,
  };
}

export function getEffectivePublicResourceFileState({
  thumbnailUrl,
  previewUrls = [],
  mainDownloadUrl,
  files = [],
}: ResourceFileStateInput & {
  files?: ResourceFileLike[];
}) {
  const previewUrlsFromFiles = files
    .filter((file) => String(file.kind) === ResourceFileKind.PREVIEW)
    .map((file) => file.fileUrl?.trim() || "")
    .filter(Boolean);

  const mainDownloadUrlFromFiles =
    files.find((file) => String(file.kind) === ResourceFileKind.MAIN_DOWNLOAD)?.fileUrl ??
    null;

  return getPublicResourceFileState({
    thumbnailUrl,
    previewUrls: previewUrls.length ? previewUrls : previewUrlsFromFiles,
    mainDownloadUrl: mainDownloadUrl || mainDownloadUrlFromFiles,
  });
}
