"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/email-verification";
import { revalidatePath } from "next/cache";
import { verifyCSRFToken } from "@/lib/csrf";

export async function toggleFollowStoreAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.email) return;

  const csrfToken = formData.get("_csrf") as string;
  if (!csrfToken || !verifyCSRFToken(csrfToken, session.user.id)) {
    throw new Error("Invalid CSRF token");
  }

  const storeId = formData.get("storeId") as string;
  const storeSlug = formData.get("storeSlug") as string;

  if (!storeId || !storeSlug) return;

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, emailVerified: true },
  });

  if (!user) return;
  if (!user.emailVerified) {
    throw new Error(EMAIL_VERIFICATION_REQUIRED_MESSAGE);
  }

  const store = await db.store.findUnique({
    where: { id: storeId },
    select: { ownerId: true },
  });

  if (!store || store.ownerId === user.id) return;

  const existing = await db.follow.findUnique({
  where: { followerId_storeId: { followerId: user.id, storeId } },
});

  if (existing) {
    await db.follow.delete({
      where: {
        followerId_storeId: {
          followerId: user.id,
          storeId,
        },
      },
    });
  } else {
    await db.follow.create({
      data: {
        followerId: user.id,
        storeId,
      },
    });
  }

  revalidatePath(`/stores/${storeSlug}`);
  revalidatePath("/following");
}
