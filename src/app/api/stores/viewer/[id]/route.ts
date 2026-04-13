import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import {
  applyServerTiming,
  logTimedOperation,
  measureAsync,
  startTimer,
} from "@/lib/performance";
import { checkRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
import { getStoreViewerState } from "@/server/queries/store-viewer";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const routeTimer = startTimer();
    const clientIP = getClientIP(request);
    const { result: rateLimitResult, durationMs: rateLimitDurationMs } = await measureAsync(
      () =>
        checkRateLimit(
          `store-viewer:${clientIP}`,
          RATE_LIMITS.viewerState.max,
          RATE_LIMITS.viewerState.window
        )
    );

    if (!rateLimitResult.success) {
      const response = NextResponse.json(
        {
          error: "Too many requests. Please slow down and try again shortly.",
          retryAfter: rateLimitResult.resetInSeconds,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimitResult.resetInSeconds),
            "Cache-Control": "no-store",
          },
        }
      );

      const totalDurationMs = routeTimer.elapsedMs();

      applyServerTiming(response.headers, [
        { name: "ratelimit", durationMs: rateLimitDurationMs },
        { name: "total", durationMs: totalDurationMs },
      ]);

      logTimedOperation("api.store.viewer", totalDurationMs, {
        infoAtMs: 100,
        warnAtMs: 350,
        context: {
          rateLimited: true,
          storeId: (await params).id,
          rateLimitDurationMs,
        },
      });

      return response;
    }

    const { id } = await params;

    const { result: store, durationMs: storeDurationMs } = await measureAsync(() =>
      db.store.findUnique({
        where: { id },
        select: {
          id: true,
          isPublished: true,
          ownerId: true,
        },
      })
    );

    if (!store || !store.isPublished) {
      const response = NextResponse.json(
        { error: "Store not found." },
        {
          status: 404,
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );

      const totalDurationMs = routeTimer.elapsedMs();

      applyServerTiming(response.headers, [
        { name: "ratelimit", durationMs: rateLimitDurationMs },
        { name: "store", durationMs: storeDurationMs },
        { name: "total", durationMs: totalDurationMs },
      ]);

      logTimedOperation("api.store.viewer", totalDurationMs, {
        infoAtMs: 100,
        warnAtMs: 350,
        context: {
          storeId: id,
          found: false,
          rateLimitDurationMs,
          storeDurationMs,
        },
      });

      return response;
    }

    const { result: viewerState, durationMs: viewerDurationMs } = await measureAsync(() =>
      getStoreViewerState({
        storeId: store.id,
        ownerId: store.ownerId,
      })
    );

    const response = NextResponse.json(
      viewerState,
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );

    const totalDurationMs = routeTimer.elapsedMs();

    applyServerTiming(response.headers, [
      { name: "ratelimit", durationMs: rateLimitDurationMs },
      { name: "store", durationMs: storeDurationMs },
      { name: "viewer", durationMs: viewerDurationMs },
      { name: "total", durationMs: totalDurationMs },
    ]);

    logTimedOperation("api.store.viewer", totalDurationMs, {
      infoAtMs: 100,
      warnAtMs: 350,
      context: {
        storeId: id,
        authenticated: viewerState.authenticated,
        rateLimitDurationMs,
        storeDurationMs,
        viewerDurationMs,
      },
    });

    return response;
  } catch (error) {
    return jsonError("Unable to load viewer state.", 500, error);
  }
}
