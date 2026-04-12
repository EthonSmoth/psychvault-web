import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

export function jsonError(
  message = "Something went wrong.",
  status = 500,
  details?: unknown
) {
  if (details !== undefined) {
    const log = status >= 500 ? logger.error : logger.warn;
    log(message, details);
  }

  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
