import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isEmailVerified } from "@/lib/require-email-verification";
import { UPLOAD_RULES, validateUpload, type UploadKind } from "@/lib/resource-moderation";
import { supabase } from "@/lib/supabase";
import {
  getStoredUploadValue,
  getBucketCandidatesForUploadKind,
} from "@/lib/storage";
import { checkRateLimit, RATE_LIMITS, getClientIP } from "@/lib/rate-limit";

const DISALLOWED_EXTENSIONS = [
  "php",
  "php3",
  "php4",
  "php5",
  "phtml",
  "exe",
  "dll",
  "sh",
  "cmd",
  "bat",
  "js",
  "mjs",
  "ts",
  "py",
  "rb",
  "jar",
  "asp",
  "aspx",
  "jsp",
  "cgi"
];

function getSafeFileName(name: string) {
  return (
    name
      .split(/[/\\]/)
      .pop()
      ?.replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\.+/, "")
      .substring(0, 240) || "upload-file"
  );
}

function getFileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

export async function POST(req: NextRequest) {
  const clientIP = getClientIP(req);
  const rateLimitKey = `upload:${clientIP}`;

  const rateLimitResult = await checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.upload.max,
    RATE_LIMITS.upload.window
  );

  if (!rateLimitResult.success) {
    return NextResponse.json(
      {
        error: "Too many upload attempts. Please try again later.",
        retryAfter: rateLimitResult.resetInSeconds
      },
      {
        status: 429,
        headers: {
          "Retry-After": String(rateLimitResult.resetInSeconds),
        },
      }
    );
  }

  const session = await auth();

  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await isEmailVerified(session.user.id))) {
    return NextResponse.json(
      { error: "Please verify your email before uploading files." },
      { status: 403 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const uploadKind = String(formData.get("uploadKind") || "").trim() as UploadKind;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!uploadKind || !(uploadKind in UPLOAD_RULES)) {
    return NextResponse.json({ error: "Invalid upload type." }, { status: 400 });
  }

  const uploadRule = UPLOAD_RULES[uploadKind];

  if (file.size > uploadRule.maxSizeBytes) {
    return NextResponse.json({ error: "File is too large." }, { status: 413 });
  }

  const fileExt = getFileExtension(file.name);
  if (DISALLOWED_EXTENSIONS.includes(fileExt)) {
    return NextResponse.json(
      { error: "This file type is not allowed." },
      { status: 400 }
    );
  }

  const uploadValidation = validateUpload(file.name, file.type, uploadKind);
  if (!uploadValidation.ok) {
    return NextResponse.json({ error: uploadValidation.error }, { status: 400 });
  }

  const timestamp = Date.now();
  const safeName = getSafeFileName(file.name);
  const path = `uploads/${session.user.id}/${timestamp}-${safeName}`;
  const bucketCandidates = getBucketCandidatesForUploadKind(uploadKind);
  let uploadedPath: string | null = null;
  let uploadedBucket: string | null = null;
  let lastErrorMessage = "Unable to upload file.";

  for (const bucket of bucketCandidates) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        contentType: file.type,
        upsert: false,
      });

    if (data?.path) {
      uploadedPath = data.path;
      uploadedBucket = bucket;
      break;
    }

    lastErrorMessage = error?.message || lastErrorMessage;

    const shouldTryNextBucket =
      uploadKind === "main" &&
      bucket !== bucketCandidates[bucketCandidates.length - 1] &&
      error?.message?.toLowerCase().includes("bucket not found");

    if (!shouldTryNextBucket) {
      break;
    }
  }

  if (!uploadedPath || !uploadedBucket) {
    return NextResponse.json({ error: lastErrorMessage }, { status: 500 });
  }

  return NextResponse.json({
    url: getStoredUploadValue(uploadKind, uploadedBucket, uploadedPath),
    name: safeName,
    mime: file.type,
    size: file.size,
  });
}
