export function getRequiredServerEnv(key: string): string {
  const value = process.env[key];
  if (!value || value.trim() === "") {
    throw new Error(`Missing required server environment variable: ${key}`);
  }
  return value;
}

export function parsePositiveIntEnv(key: string, defaultValue: number): number {
  const raw = process.env[key];
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : defaultValue;
}

// Reads common boolean-like env values without forcing callers to parse strings manually.
export function parseBooleanEnv(key: string, defaultValue: boolean): boolean {
  const raw = process.env[key];

  if (!raw) {
    return defaultValue;
  }

  const normalized = raw.trim().toLowerCase();

  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
}

function getOptionalTrimmedEnv(key: string) {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

// Resolves the canonical app URL so checkout and metadata can point at the right domain.
export function getAppBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  return process.env.NODE_ENV === "production"
    ? "https://www.psychvault.com.au"
    : "http://localhost:3000";
}

export function isValidHttpUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function isGoogleOAuthEnabled() {
  return Boolean(
    process.env.AUTH_GOOGLE_ID?.trim() && process.env.AUTH_GOOGLE_SECRET?.trim()
  );
}

export function isFacebookOAuthEnabled() {
  return Boolean(
    process.env.AUTH_FACEBOOK_ID?.trim() && process.env.AUTH_FACEBOOK_SECRET?.trim()
  );
}

export function getSupportEmail() {
  return getOptionalTrimmedEnv("SUPPORT_EMAIL") || "hello@psychvault.com.au";
}

export function getSupportPhone() {
  return getOptionalTrimmedEnv("SUPPORT_PHONE");
}

export function getBusinessAddress() {
  const raw = getOptionalTrimmedEnv("BUSINESS_ADDRESS");
  return raw ? raw.replace(/\\n/g, "\n") : null;
}

export function getFacebookAppId() {
  return getOptionalTrimmedEnv("FACEBOOK_APP_ID");
}
