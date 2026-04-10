import { redirect } from "next/navigation";
import { db } from "@/lib/db";

// Redirects signed-in users to the verification flow when a feature requires a verified email.
export async function requireVerifiedEmailOrRedirect(userId: string, redirectTo: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      emailVerified: true,
    },
  });

  if (!user?.emailVerified) {
    const verifyUrl = `/verify-email?redirectTo=${encodeURIComponent(redirectTo)}`;
    redirect(verifyUrl);
  }

  return user;
}

// Returns a boolean-only verification state for APIs and server actions that should not redirect.
export async function isEmailVerified(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      emailVerified: true,
    },
  });

  return Boolean(user?.emailVerified);
}
