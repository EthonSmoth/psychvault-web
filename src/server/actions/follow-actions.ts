"use server";

import { requireAuth } from "@/lib/auth-guards";
import { db } from "@/lib/db";
import { EMAIL_VERIFICATION_REQUIRED_MESSAGE } from "@/lib/email-verification";
import { revalidatePath } from "next/cache";
import { verifyCSRFToken } from "@/lib/csrf";
import { revalidatePublicStores } from "@/server/cache/public-cache";

export async function toggleFollowStoreAction(formData: FormData) {
  const session = await requireAuth();

  const csrfToken = formData.get("_csrf") as string;
  if (!csrfToken || !verifyCSRFToken(csrfToken, session.id)) {
    throw new Error("Invalid CSRF token");
  }

  const storeId = formData.get("storeId") as string;
  const storeSlug = formData.get("storeSlug") as string;

  if (!storeId || !storeSlug) return;

  const user = await db.user.findUnique({
    where: { id: session.id },
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

  revalidatePublicStores(storeSlug);
  revalidatePath("/following");
}
