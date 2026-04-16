"use server";

import bcrypt from "bcryptjs";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCSRFToken } from "@/lib/csrf";
import { sanitizeUserText } from "@/lib/input-safety";
import { revalidatePath } from "next/cache";

export type AccountFormState = {
  error?: string;
  success?: string;
};

export type PasswordFormState = {
  error?: string;
  success?: string;
};

// ─── Update profile (name + avatar) ──────────────────────────────────────────

export async function updateProfileAction(
  _prevState: AccountFormState,
  formData: FormData
): Promise<AccountFormState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in to update your profile." };
    }

    const csrfToken = String(formData.get("_csrf") ?? "");
    if (!verifyCSRFToken(csrfToken, session.user.id)) {
      return { error: "Invalid request. Please refresh and try again." };
    }

    const name = sanitizeUserText(String(formData.get("name") ?? ""), { maxLength: 80 });
    const avatarUrl = String(formData.get("avatarUrl") ?? "").trim() || null;

    if (!name || name.trim().length < 2) {
      return { error: "Name must be at least 2 characters." };
    }

    const emailNotifications = formData.get("emailNotifications") === "on";

    await db.user.update({
      where: { id: session.user.id },
      data: {
        name: name.trim(),
        avatarUrl: avatarUrl || null,
        emailNotifications,
      },
    });

    revalidatePath("/account");
    return { success: "Profile updated." };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}

// ─── Change password ──────────────────────────────────────────────────────────

export async function changePasswordAction(
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be signed in." };
    }

    const csrfToken = String(formData.get("_csrf") ?? "");
    if (!verifyCSRFToken(csrfToken, session.user.id)) {
      return { error: "Invalid request. Please refresh and try again." };
    }

    const currentPassword = String(formData.get("currentPassword") ?? "");
    const newPassword = String(formData.get("newPassword") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return { error: "All password fields are required." };
    }

    if (newPassword.length < 8) {
      return { error: "New password must be at least 8 characters." };
    }

    if (newPassword !== confirmPassword) {
      return { error: "New passwords do not match." };
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return {
        error:
          "Your account uses Google sign-in and does not have a password. Use the forgot password flow to set one.",
      };
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      return { error: "Current password is incorrect." };
    }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.user.update({
      where: { id: session.user.id },
      data: { passwordHash: newHash },
    });

    return { success: "Password updated successfully." };
  } catch {
    return { error: "Something went wrong. Please try again." };
  }
}
