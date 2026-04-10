import { supabase } from "@/lib/supabase";
import { getRequiredServerEnv } from "@/lib/env";
import type { UploadKind } from "@/lib/resource-moderation";

const STORAGE_REFERENCE_PREFIX = "supabase://";
const PUBLIC_ASSETS_BUCKET =
  process.env.SUPABASE_PUBLIC_BUCKET?.trim() || "psychvault-resources";
const PRIVATE_DOWNLOADS_BUCKET =
  process.env.SUPABASE_DOWNLOADS_BUCKET?.trim() || "psychvault-downloads";
const LEGACY_PRIVATE_DOWNLOADS_BUCKET = "psychvault-resources-private";
const SUPABASE_HOST = new URL(
  getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL")
).host;

type StorageLocation = {
  bucket: string;
  path: string;
};

// Normalizes stored object paths so signing and downloads target the exact bucket key.
function normalizeObjectPath(path: string) {
  return path.replace(/^\/+/, "").trim();
}

// Creates an opaque storage reference so private files are not stored as public URLs.
export function createStorageReference(bucket: string, path: string) {
  return `${STORAGE_REFERENCE_PREFIX}${bucket}/${normalizeObjectPath(path)}`;
}

// Parses the internal supabase://bucket/path format used for private downloads.
export function parseStorageReference(value: string): StorageLocation | null {
  if (!value.startsWith(STORAGE_REFERENCE_PREFIX)) {
    return null;
  }

  const raw = value.slice(STORAGE_REFERENCE_PREFIX.length);
  const separatorIndex = raw.indexOf("/");

  if (separatorIndex <= 0) {
    return null;
  }

  const bucket = raw.slice(0, separatorIndex).trim();
  const path = normalizeObjectPath(raw.slice(separatorIndex + 1));

  if (!bucket || !path) {
    return null;
  }

  return { bucket, path };
}

// Parses Supabase public or signed storage URLs back into bucket/path pairs.
export function parseSupabaseStorageUrl(value: string): StorageLocation | null {
  try {
    const url = new URL(value);

    if (url.host !== SUPABASE_HOST) {
      return null;
    }

    const segments = url.pathname.split("/").filter(Boolean);
    if (segments.length < 6) {
      return null;
    }

    if (segments[0] !== "storage" || segments[1] !== "v1" || segments[2] !== "object") {
      return null;
    }

    const visibility = segments[3];
    if (!["public", "sign", "authenticated"].includes(visibility)) {
      return null;
    }

    const bucket = segments[4];
    const path = normalizeObjectPath(segments.slice(5).join("/"));

    if (!bucket || !path) {
      return null;
    }

    return { bucket, path };
  } catch {
    return null;
  }
}

// Resolves stored file values regardless of whether they are saved as URLs or internal refs.
export function resolveStorageLocation(value: string): StorageLocation | null {
  if (!value) {
    return null;
  }

  return parseStorageReference(value) ?? parseSupabaseStorageUrl(value);
}

// Returns the right Supabase bucket for each upload field.
export function getBucketForUploadKind(kind: UploadKind) {
  return kind === "main" ? PRIVATE_DOWNLOADS_BUCKET : PUBLIC_ASSETS_BUCKET;
}

// Tries current and legacy private bucket names so older deployments keep working.
export function getBucketCandidatesForUploadKind(kind: UploadKind) {
  if (kind !== "main") {
    return [PUBLIC_ASSETS_BUCKET];
  }

  return [...new Set([PRIVATE_DOWNLOADS_BUCKET, LEGACY_PRIVATE_DOWNLOADS_BUCKET])];
}

// Generates a public URL for image assets that must render directly in the browser.
export function getPublicStorageUrl(bucket: string, path: string) {
  const { data } = supabase.storage.from(bucket).getPublicUrl(normalizeObjectPath(path));
  return data.publicUrl;
}

// Builds the value stored in forms and the database for a newly uploaded file.
export function getStoredUploadValue(kind: UploadKind, bucket: string, path: string) {
  return kind === "main"
    ? createStorageReference(bucket, path)
    : getPublicStorageUrl(bucket, path);
}

// Downloads a stored file through the service-role client for server-side inspection.
export async function downloadStoredFile(value: string) {
  const location = resolveStorageLocation(value);

  if (!location) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(location.bucket)
    .download(location.path);

  if (error || !data) {
    return null;
  }

  return data;
}

// Creates a short-lived signed URL so downloads stay authorization-gated.
export async function createSignedDownloadUrl(value: string, expiresInSeconds = 60) {
  const location = resolveStorageLocation(value);

  if (!location) {
    return null;
  }

  const { data, error } = await supabase.storage
    .from(location.bucket)
    .createSignedUrl(location.path, expiresInSeconds);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}
