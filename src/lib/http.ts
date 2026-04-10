import { NextResponse } from "next/server";

export function jsonError(
  message = "Server error.",
  status = 500,
  details?: unknown
) {
  const payload: { error: string; details?: unknown } = { error: message };

  if (details !== undefined && process.env.NODE_ENV !== "production") {
    payload.details = details;
  }

  return NextResponse.json(payload, { status });
}
