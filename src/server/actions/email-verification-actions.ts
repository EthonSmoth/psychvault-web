"use server";

import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  createAndSendEmailVerification,
  EMAIL_VERIFICATION_REQUIRED_MESSAGE,
  getUserVerificationState,
} from "@/lib/email-verification";

export type EmailVerificationState = {
  error?: string;
  success?: string;
};

async function resendVerificationEmailInternal(formData: FormData): Promise<EmailVerificationState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { error: "You must be logged in to resend verification." };
  }

  const redirectTo = String(formData.get("redirectTo") ?? "").trim();
  const { user, isVerified } = await getUserVerificationState(session.user.id);

  if (!user) {
    return { error: "Account not found." };
  }

  if (isVerified) {
    return { success: "Your email address is already verified." };
  }

  await createAndSendEmailVerification({
    userId: user.id,
    email: user.email,
    name: user.name,
    redirectTo,
  });

  return {
    success: "A new verification email has been sent.",
  };
}

// Resends a verification email from client components that use useActionState.
export async function resendVerificationEmailAction(
  _prevState: EmailVerificationState,
  formData: FormData
): Promise<EmailVerificationState> {
  return resendVerificationEmailInternal(formData);
}

// Resends a verification email from plain server-rendered forms.
export async function resendVerificationEmailFormAction(formData: FormData) {
  const result = await resendVerificationEmailInternal(formData);
  const redirectTo = String(formData.get("redirectTo") ?? "/verify-email").trim();
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//")
      ? redirectTo
      : "/verify-email";
  const nextUrl = new URL(
    safeRedirect,
    process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
  );

  if (result.error) {
    nextUrl.searchParams.set("error", result.error);
  }

  if (result.success) {
    nextUrl.searchParams.set("success", result.success);
  }

  redirect(`${nextUrl.pathname}${nextUrl.search}`);
}
