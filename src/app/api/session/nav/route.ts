import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  applyServerTiming,
  logTimedOperation,
  measureAsync,
  startTimer,
} from "@/lib/performance";

export async function GET() {
  const routeTimer = startTimer();
  const { result: session, durationMs: authDurationMs } = await measureAsync(() => auth());

  const response =
    !session?.user?.id || !session.user.email
      ? NextResponse.json(
          { authenticated: false },
          {
            headers: {
              "Cache-Control": "no-store",
            },
          }
        )
      : NextResponse.json(
          {
            authenticated: true,
            user: {
              id: session.user.id,
              name: session.user.name ?? null,
              email: session.user.email,
              role: session.user.role ?? "BUYER",
              emailVerified: Boolean(session.user.emailVerified),
            },
          },
          {
            headers: {
              "Cache-Control": "no-store",
            },
          }
        );

  const totalDurationMs = routeTimer.elapsedMs();

  applyServerTiming(response.headers, [
    { name: "auth", durationMs: authDurationMs },
    { name: "total", durationMs: totalDurationMs },
  ]);

  logTimedOperation("api.session.nav", totalDurationMs, {
    infoAtMs: 80,
    warnAtMs: 300,
    context: {
      authenticated: Boolean(session?.user?.id),
      authDurationMs,
    },
  });

  return response;
}
