import { NextResponse } from "next/server";
import { getAppBaseUrl } from "@/lib/env";
import { logger } from "@/lib/logger";

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin.toLowerCase();
  } catch {
    return null;
  }
}

function addOrigin(set: Set<string>, value?: string | null) {
  if (!value) {
    return;
  }

  const origin = normalizeOrigin(value);

  if (!origin) {
    return;
  }

  set.add(origin);

  const url = new URL(origin);

  if (url.hostname === "localhost") {
    set.add(`${url.protocol}//127.0.0.1${url.port ? `:${url.port}` : ""}`);
    return;
  }

  if (url.hostname === "127.0.0.1") {
    set.add(`${url.protocol}//localhost${url.port ? `:${url.port}` : ""}`);
    return;
  }

  if (url.hostname.startsWith("www.")) {
    set.add(`${url.protocol}//${url.hostname.slice(4)}${url.port ? `:${url.port}` : ""}`);
    return;
  }

  if (url.hostname.includes(".")) {
    set.add(`${url.protocol}//www.${url.hostname}${url.port ? `:${url.port}` : ""}`);
  }
}

export function getAllowedOrigins() {
  const origins = new Set<string>();

  addOrigin(origins, getAppBaseUrl());
  addOrigin(origins, process.env.NEXT_PUBLIC_APP_URL);
  addOrigin(origins, process.env.NEXTAUTH_URL);
  addOrigin(origins, "http://localhost:3000");
  addOrigin(origins, "http://127.0.0.1:3000");

  if (process.env.VERCEL_URL) {
    addOrigin(origins, `https://${process.env.VERCEL_URL}`);
  }

  return origins;
}

export function ensureAllowedOrigin(request: Request) {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  if (getAllowedOrigins().has(origin.toLowerCase())) {
    return null;
  }

  logger.warn("Rejected request from unexpected origin.", {
    origin,
    pathname: new URL(request.url).pathname,
  });

  return NextResponse.json(
    { error: "Invalid request origin." },
    {
      status: 403,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
