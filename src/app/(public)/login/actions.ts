"use server";

import { AuthError } from "next-auth";
import { headers } from "next/headers";
import { signIn } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { getSafeRedirectTarget } from "@/lib/redirects";
import {
  checkRateLimit,
  clearRateLimit,
  getClientIPFromHeaders,
  RATE_LIMITS,
} from "@/lib/rate-limit";

export type LoginFormState = {
  error?: string;
};

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const redirectTo = getSafeRedirectTarget(
    String(formData.get("redirectTo") || "") || null,
    "/library"
  );

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const requestHeaders = await headers();
  const clientIP = getClientIPFromHeaders(requestHeaders);
  const [emailRateLimit, ipRateLimit] = await Promise.all([
    checkRateLimit(
      `login:email:${email}`,
      RATE_LIMITS.login.max,
      RATE_LIMITS.login.window
    ),
    checkRateLimit(
      `login:ip:${clientIP}`,
      RATE_LIMITS.login.max,
      RATE_LIMITS.login.window
    ),
  ]);

  if (!emailRateLimit.success || !ipRateLimit.success) {
    const retryAfter = Math.max(
      emailRateLimit.resetInSeconds,
      ipRateLimit.resetInSeconds
    );

    return {
      error: `Too many login attempts. Please wait ${retryAfter} seconds and try again.`,
    };
  }

  const clearKeys = [`login:email:${email}`, `login:ip:${clientIP}`];

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });

    await Promise.all(clearKeys.map((key) => clearRateLimit(key)));

    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }

    logger.error("Login action failed.", error);
    return { error: "Something went wrong. Please try again." };
  }
}
