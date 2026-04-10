import { downloadStoredFile } from "@/lib/storage";

export type UploadKind = "thumbnail" | "preview" | "main";

type UploadRule = {
  maxSizeBytes: number;
  allowedExtensions: string[];
  allowedMimePatterns: RegExp[];
};

type ModerationDecision = "allow" | "warn" | "block";

type ModerationResult = {
  decision: ModerationDecision;
  reasons: string[];
};

type DocumentModerationResult = {
  decision: ModerationDecision | "skipped";
  reason: string | null;
  extractedText: string | null;
};

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const IMAGE_MIME_PATTERNS = [/^image\/jpeg$/i, /^image\/png$/i, /^image\/webp$/i];

const DOCUMENT_EXTENSIONS = ["pdf", "doc", "docx", "zip", "pptx", "xlsx"];
const DOCUMENT_MIME_PATTERNS = [
  /^application\/pdf$/i,
  /^application\/msword$/i,
  /^application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document$/i,
  /^application\/zip$/i,
  /^application\/x-zip-compressed$/i,
  /^application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation$/i,
  /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet$/i,
];

export const UPLOAD_RULES: Record<UploadKind, UploadRule> = {
  thumbnail: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedExtensions: IMAGE_EXTENSIONS,
    allowedMimePatterns: IMAGE_MIME_PATTERNS,
  },
  preview: {
    maxSizeBytes: 10 * 1024 * 1024,
    allowedExtensions: IMAGE_EXTENSIONS,
    allowedMimePatterns: IMAGE_MIME_PATTERNS,
  },
  main: {
    maxSizeBytes: 50 * 1024 * 1024,
    allowedExtensions: DOCUMENT_EXTENSIONS,
    allowedMimePatterns: DOCUMENT_MIME_PATTERNS,
  },
};

const BLOCK_TERMS = [
  "child porn",
  "csam",
  "rape guide",
  "revenge porn",
  "bestiality",
  "how to kill",
  "murder plan",
  "suicide method",
  "self harm challenge",
  "nazi propaganda",
  "terrorist manifesto",
  "pirated",
  "torrent download",
  "crack keygen",
  "stolen course",
  "official dsm pdf",
];

const WARN_TERMS = [
  "official template",
  "certified by",
  "guaranteed diagnosis",
  "cure anxiety",
  "cure autism",
  "instant diagnosis",
  "prescription template",
  "free textbook pdf",
  "full workbook pdf",
  "licensed by",
];

// Normalizes creator-provided text so keyword checks are consistent across fields.
function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

// Extracts a lowercase extension for upload validation rules.
export function getFileExtension(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

// Validates uploaded files against the expected field-specific extension and MIME rules.
export function validateUpload(fileName: string, mimeType: string, kind: UploadKind) {
  const rule = UPLOAD_RULES[kind];
  const extension = getFileExtension(fileName);

  if (!rule.allowedExtensions.includes(extension)) {
    return {
      ok: false,
      error: `This ${kind} file type is not allowed.`,
    };
  }

  const normalizedMime = mimeType.trim().toLowerCase();
  const canSkipMimeCheck =
    !normalizedMime || normalizedMime === "application/octet-stream";

  if (
    !canSkipMimeCheck &&
    !rule.allowedMimePatterns.some((pattern) => pattern.test(normalizedMime))
  ) {
    return {
      ok: false,
      error: `This ${kind} file format does not match the expected file type.`,
    };
  }

  return { ok: true as const };
}

// Applies simple keyword-based moderation to listing text before save/publish.
export function moderateResourceText(input: {
  title: string;
  shortDescription?: string | null;
  description: string;
}) {
  const combined = normalizeText(
    [input.title, input.shortDescription || "", input.description].join(" ")
  );

  const blockReasons = BLOCK_TERMS.filter((term) => combined.includes(term));
  if (blockReasons.length > 0) {
    return {
      decision: "block",
      reasons: blockReasons,
    } satisfies ModerationResult;
  }

  const warnReasons = WARN_TERMS.filter((term) => combined.includes(term));
  if (warnReasons.length > 0) {
    return {
      decision: "warn",
      reasons: warnReasons,
    } satisfies ModerationResult;
  }

  return {
    decision: "allow",
    reasons: [],
  } satisfies ModerationResult;
}

// Applies the same text moderation rules to creator store details.
export function moderateStoreText(input: {
  name: string;
  bio?: string | null;
  location?: string | null;
}) {
  return moderateResourceText({
    title: input.name,
    shortDescription: input.location || "",
    description: input.bio || "",
  });
}

// Pulls likely-readable text segments from a PDF buffer without third-party parsers.
function extractPdfText(buffer: Buffer) {
  const source = buffer.toString("latin1");
  const literalMatches = source.match(/\((?:\\.|[^\\)]){1,400}\)/g) ?? [];
  const hexMatches = source.match(/<([0-9A-Fa-f\s]{20,})>/g) ?? [];

  const literalText = literalMatches
    .map((match) =>
      match
        .slice(1, -1)
        .replace(/\\[nrtbf]/g, " ")
        .replace(/\\([()\\])/g, "$1")
        .replace(/[^\x20-\x7E]+/g, " ")
    )
    .join(" ");

  const hexText = hexMatches
    .map((match) =>
      match
        .slice(1, -1)
        .replace(/\s+/g, "")
        .match(/.{1,2}/g)
        ?.map((pair) => String.fromCharCode(parseInt(pair, 16)))
        .join("") || ""
    )
    .join(" ")
    .replace(/[^\x20-\x7E]+/g, " ");

  const fallbackText = (source.match(/[A-Za-z0-9][A-Za-z0-9 ,.;:'"()\-_/]{20,}/g) ?? []).join(" ");

  return [literalText, hexText, fallbackText].join(" ").replace(/\s+/g, " ").trim();
}

// Fetches and locally inspects a PDF so publish flow can flag unsafe document contents.
export async function inspectDocumentForModeration(input: {
  fileUrl: string;
  fileName: string;
  mimeType?: string | null;
}): Promise<DocumentModerationResult> {
  const extension = getFileExtension(input.fileName);
  const mimeType = (input.mimeType || "").toLowerCase();
  const isPdf = extension === "pdf" || mimeType.includes("pdf");

  if (!isPdf) {
    return {
      decision: "skipped",
      reason: null,
      extractedText: null,
    };
  }

  try {
    const blob = await downloadStoredFile(input.fileUrl);

    if (!blob) {
      return {
        decision: "warn",
        reason:
          "The uploaded PDF could not be inspected automatically, so it was sent to review before publishing.",
        extractedText: null,
      };
    }

    const arrayBuffer = await blob.arrayBuffer();
    const extractedText = extractPdfText(Buffer.from(arrayBuffer));

    if (extractedText.length < 40) {
      return {
        decision: "warn",
        reason:
          "The uploaded PDF could not be read confidently, so it was sent to review before publishing.",
        extractedText: null,
      };
    }

    const moderation = moderateResourceText({
      title: input.fileName,
      description: extractedText,
      shortDescription: null,
    });

    if (moderation.decision === "block") {
      return {
        decision: "block",
        reason:
          "The uploaded PDF appears to contain prohibited or unsafe material and could not be published.",
        extractedText,
      };
    }

    if (moderation.decision === "warn") {
      return {
        decision: "warn",
        reason:
          "The uploaded PDF was flagged for moderation review before publishing.",
        extractedText,
      };
    }

    return {
      decision: "allow",
      reason: null,
      extractedText,
    };
  } catch {
    return {
      decision: "warn",
      reason:
        "The uploaded PDF could not be inspected automatically, so it was sent to review before publishing.",
      extractedText: null,
    };
  }
}
