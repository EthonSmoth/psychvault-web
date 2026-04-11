type ResourceFileStateInput = {
  thumbnailUrl?: string | null;
  previewUrls?: string[];
  mainDownloadUrl?: string | null;
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
