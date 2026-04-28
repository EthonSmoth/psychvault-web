import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

function getSupabaseHost(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return "";
  try {
    return new URL(supabaseUrl).hostname;
  } catch {
    return "";
  }
}

function buildCsp(): string {
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
    "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://vercel.live https://*.vercel-scripts.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    connectSrc,
    "frame-src https://js.stripe.com https://hooks.stripe.com https://vercel.live",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
  ];

  return directives.join("; ");
}

// Wraps NextAuth's auth so we can:
//  1. Set a CSP response header on every page/api route
//  2. Redirect unauthenticated requests to /creator/* to /login
export const proxy = auth((request: NextRequest & { auth: unknown }) => {
  // Redirect unauthenticated users away from creator routes.
  if (!request.auth && request.nextUrl.pathname.startsWith("/creator")) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "redirectTo",
      request.nextUrl.pathname + request.nextUrl.search
    );
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  response.headers.set("Content-Security-Policy", buildCsp());

  return response;
});

export const config = {
  matcher: [
    // Apply to all routes except pre-built static assets and image files.
    "/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
