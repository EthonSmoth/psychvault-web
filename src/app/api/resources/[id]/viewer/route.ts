import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { jsonError } from "@/lib/http";
import {
  applyServerTiming,
  logTimedOperation,
  measureAsync,
  startTimer,
} from "@/lib/performance";
import { checkReadRateLimit, getClientIP, RATE_LIMITS } from "@/lib/rate-limit";
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
        checkReadRateLimit(
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
    const { result: sessionResult, durationMs: authDurationMs } = await measureAsync(() =>
      auth()
    );
    const session = sessionResult as {
      user?: {
        id?: string | null;
        emailVerified?: Date | boolean | null;
      } | null;
    } | null;

    if (!session?.user?.id) {
      const response = NextResponse.json(
        {
          authenticated: false,
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );

      const totalDurationMs = routeTimer.elapsedMs();

      applyServerTiming(response.headers, [
        { name: "ratelimit", durationMs: rateLimitDurationMs },
        { name: "auth", durationMs: authDurationMs },
        { name: "total", durationMs: totalDurationMs },
      ]);

      logTimedOperation("api.resource.viewer", totalDurationMs, {
        infoAtMs: 100,
        warnAtMs: 350,
        context: {
          resourceId: id,
          authenticated: false,
          rateLimitDurationMs,
          authDurationMs,
        },
      });

      return response;
    }

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
        { name: "auth", durationMs: authDurationMs },
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
          authDurationMs,
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
        session,
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
      { name: "auth", durationMs: authDurationMs },
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
        authDurationMs,
        resourceDurationMs,
        viewerDurationMs,
      },
    });

    return response;
  } catch (error) {
    return jsonError("Unable to load viewer state.", 500, error);
  }
}
