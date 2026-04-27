import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Uses Web Crypto API (Edge Runtime compatible — no Node.js Buffer needed).
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  let binary = "";
  for (let i = 0; i < array.length; i++) {
    binary += String.fromCharCode(array[i]);
  }
  return btoa(binary);
}

function getSupabaseHost(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return "";
  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return "";
  }
}

// Builds a full CSP header using the per-request nonce so 'unsafe-inline' is
// no longer needed for script-src.
//
// 'unsafe-inline' is retained for style-src only — Tailwind CSS v4 generates
// inline styles that cannot practically be nonce-stamped at this time.
function buildCsp(nonce: string): string {
  const supabaseHost = getSupabaseHost();
  const supabaseOrigin = supabaseHost ? `https://${supabaseHost}` : "";

  const connectSrc = [
    "connect-src 'self'",
    supabaseOrigin ? `${supabaseOrigin} wss://${supabaseHost}` : "",
    "https://api.stripe.com",
    "https://www.google-analytics.com",
    "https://region1.google-analytics.com",
    "https://www.googletagmanager.com",
  ]
    .filter(Boolean)
    .join(" ");

  const directives = [
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self' https://checkout.stripe.com https://appleid.apple.com",
    // Inline scripts require the nonce. External scripts require the allowlist.
    // GA/GTM dynamically inject further scripts from their own domains — those
    // domain entries in the allowlist cover those injected scripts.
    `script-src 'self' 'nonce-${nonce}' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    connectSrc,
    "frame-src https://js.stripe.com https://hooks.stripe.com",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  return directives.join("; ");
}

export function middleware(request: NextRequest) {
  const nonce = generateNonce();

  // Forward the nonce to the page so the root layout can embed it in script tags.
  // middleware.set() overwrites any client-supplied x-nonce header, preventing spoofing.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  response.headers.set("Content-Security-Policy", buildCsp(nonce));

  return response;
}

export const config = {
  matcher: [
    // Apply to all routes except pre-built static assets and image files.
    // Static JS/CSS bundles and images don't need a CSP header.
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
