"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth";
import { checkRateLimit, clearRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export type LoginFormState = {
  error?: string;
};

function getSafeRedirect(redirectTo: string | null) {
  if (!redirectTo) return "/library";
  if (!redirectTo.startsWith("/")) return "/library";
  if (redirectTo.startsWith("//")) return "/library";
  return redirectTo;
}

export async function loginAction(
  _prevState: LoginFormState,
  formData: FormData
): Promise<LoginFormState> {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const redirectTo = getSafeRedirect(
    String(formData.get("redirectTo") || "") || null
  );

  if (!email || !password) {
    return { error: "Please enter your email and password." };
  }

  const rateLimitKey = `login:${email}`;
  const rateLimitResult = await checkRateLimit(
    rateLimitKey,
    RATE_LIMITS.login.max,
    RATE_LIMITS.login.window
  );

  if (!rateLimitResult.success) {
    return {
      error: `Too many login attempts. Please wait ${rateLimitResult.resetInSeconds} seconds and try again.`,
    };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });

    await clearRateLimit(rateLimitKey);

    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }

    throw error;
  }
}
