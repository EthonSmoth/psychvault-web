"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { verifyCSRFToken } from "@/lib/csrf";
import { sanitizeUserText } from "@/lib/input-safety";
import { logger } from "@/lib/logger";
import { requireAdmin } from "@/lib/require-admin";
import { revalidatePath } from "next/cache";

export type CreatorApplicationFormState = {
  error?: string;
  success?: string;
};

export async function applyToBeCreatorAction(
  _prev: CreatorApplicationFormState,
  formData: FormData
): Promise<CreatorApplicationFormState> {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { error: "You must be logged in to apply." };
    }

    const csrfToken = formData.get("_csrf") as string;
    if (!csrfToken || !verifyCSRFToken(csrfToken, session.user.id)) {
      return { error: "Invalid CSRF token." };
    }

    const userId = session.user.id;
    const message = sanitizeUserText(formData.get("message"), { maxLength: 1000, preserveNewlines: true });

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, creatorApplication: { select: { status: true } } },
    });

    if (!user) return { error: "User not found." };
    if (user.role === "CREATOR" || user.role === "ADMIN") {
      return { error: "You are already a creator." };
    }
    if (user.creatorApplication) {
      if (user.creatorApplication.status === "PENDING") {
        return { error: "Your application is already under review." };
      }
      if (user.creatorApplication.status === "APPROVED") {
        return { error: "Your application was already approved." };
      }
      // REJECTED — allow re-application by updating existing record
      await db.creatorApplication.update({
        where: { userId },
        data: { status: "PENDING", message: message || null, adminNotes: null },
      });
      return { success: "Your application has been resubmitted." };
    }

    await db.creatorApplication.create({
      data: { userId, message: message || null },
    });

    return { success: "Application submitted! We'll review it and get back to you soon." };
  } catch (error) {
    logger.error("applyToBeCreatorAction failed", error);
    return { error: "Something went wrong. Please try again." };
  }
}

export async function adminApproveCreatorApplicationAction(formData: FormData) {
  const admin = await requireAdmin();

  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const adminNotes = String(formData.get("adminNotes") ?? "").trim();
  if (!applicationId) throw new Error("Missing application id.");

  const application = await db.creatorApplication.findUnique({
    where: { id: applicationId },
    select: { id: true, userId: true },
  });
  if (!application) throw new Error("Application not found.");

  await db.$transaction([
    db.creatorApplication.update({
      where: { id: applicationId },
      data: { status: "APPROVED", adminNotes: adminNotes || null },
    }),
    db.user.update({
      where: { id: application.userId },
      data: { role: "CREATOR" },
    }),
  ]);

  logger.info("Creator application approved", { applicationId, adminId: admin.id });
  revalidatePath("/admin");
  revalidatePath("/apply-creator");
}

export async function adminRejectCreatorApplicationAction(formData: FormData) {
  const admin = await requireAdmin();

  const applicationId = String(formData.get("applicationId") ?? "").trim();
  const adminNotes = String(formData.get("adminNotes") ?? "").trim();
  if (!applicationId) throw new Error("Missing application id.");

  await db.creatorApplication.update({
    where: { id: applicationId },
    data: { status: "REJECTED", adminNotes: adminNotes || null },
  });

  logger.info("Creator application rejected", { applicationId, adminId: admin.id });
  revalidatePath("/admin");
  revalidatePath("/apply-creator");
}
