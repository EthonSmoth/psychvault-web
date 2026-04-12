const DISALLOWED_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;

type SanitizeTextOptions = {
  maxLength?: number;
  preserveNewlines?: boolean;
};

// Normalizes user text before validation/storage so hidden control chars and odd whitespace
// do not propagate into pages, emails, or logs.
export function sanitizeUserText(
  value: unknown,
  options: SanitizeTextOptions = {}
) {
  const { maxLength, preserveNewlines = false } = options;

  let text = typeof value === "string" ? value : String(value ?? "");
  text = text
    .normalize("NFKC")
    .replace(/\r\n?/g, "\n")
    .replace(DISALLOWED_CONTROL_CHARACTERS, "");

  text = preserveNewlines
    ? text.replace(/[^\S\n]+/g, " ")
    : text.replace(/\s+/g, " ");

  text = text.trim();

  if (typeof maxLength === "number" && maxLength >= 0) {
    text = text.slice(0, maxLength).trim();
  }

  return text;
}

// Escapes JSON-LD for script-tag insertion so user-controlled values cannot break out of the payload.
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
