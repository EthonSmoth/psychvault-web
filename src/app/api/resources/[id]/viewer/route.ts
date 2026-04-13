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
import { getResourceViewerState } from "@/server/queries/resource-viewer";

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
          `resource-viewer:${clientIP}`,
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

      logTimedOperation("api.resource.viewer", totalDurationMs, {
        infoAtMs: 100,
        warnAtMs: 350,
        context: {
          rateLimited: true,
          resourceId: (await params).id,
          rateLimitDurationMs,
        },
      });

      return response;
    }

    const { id } = await params;

    const { result: resource, durationMs: resourceDurationMs } = await measureAsync(() =>
      db.resource.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          creatorId: true,
          store: {
            select: {
              ownerId: true,
            },
          },
        },
      })
    );

    if (!resource || resource.status !== "PUBLISHED") {
      const response = NextResponse.json(
        { error: "Resource not found." },
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
        { name: "resource", durationMs: resourceDurationMs },
        { name: "total", durationMs: totalDurationMs },
      ]);

      logTimedOperation("api.resource.viewer", totalDurationMs, {
        infoAtMs: 100,
        warnAtMs: 350,
        context: {
          resourceId: id,
          found: false,
          rateLimitDurationMs,
          resourceDurationMs,
        },
      });

      return response;
    }

    const { result: viewerState, durationMs: viewerDurationMs } = await measureAsync(() =>
      getResourceViewerState({
        resourceId: resource.id,
        creatorId: resource.creatorId,
        storeOwnerId: resource.store?.ownerId,
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
      { name: "resource", durationMs: resourceDurationMs },
      { name: "viewer", durationMs: viewerDurationMs },
      { name: "total", durationMs: totalDurationMs },
    ]);

    logTimedOperation("api.resource.viewer", totalDurationMs, {
      infoAtMs: 100,
      warnAtMs: 350,
      context: {
        resourceId: id,
        authenticated: viewerState.authenticated,
        rateLimitDurationMs,
        resourceDurationMs,
        viewerDurationMs,
      },
    });

    return response;
  } catch (error) {
    return jsonError("Unable to load viewer state.", 500, error);
  }
}
