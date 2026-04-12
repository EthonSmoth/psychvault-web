import { getAllowedOrigins } from "@/lib/request-security";

export function getSafeRedirectTarget(
  redirectTo: string | null | undefined,
  fallback = "/library"
) {
  const value = redirectTo?.trim();

  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  return value;
}

export function getSafeAuthRedirectUrl(
  redirectTo: string,
  baseUrl: string,
  fallback = "/library"
) {
  const safeFallback = new URL(fallback, baseUrl).toString();

  if (redirectTo.startsWith("/")) {
    return new URL(getSafeRedirectTarget(redirectTo, fallback), baseUrl).toString();
  }

  try {
    const target = new URL(redirectTo);

    if (getAllowedOrigins().has(target.origin.toLowerCase())) {
      return target.toString();
    }
  } catch {
    return safeFallback;
  }

  return safeFallback;
}
