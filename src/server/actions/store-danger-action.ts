"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { verifyCSRFToken } from "@/lib/csrf";

export async function deleteOwnStoreAction(formData: FormData) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login");
  }

  // CSRF Protection
  const csrfToken = String(formData.get("_csrf") || "").trim();
  if (!csrfToken || !verifyCSRFToken(csrfToken, session.user.id)) {
    throw new Error("Invalid security token. Please refresh the page and try again.");
  }

  const user = await db.user.findUnique({
    where: { email: session.user.email },
    include: {
      store: {
        include: {
          resources: {
            select: { id: true },
          },
        },
      },
    },
  });

  if (!user?.store) {
    throw new Error("Store not found.");
  }

  if (user.store.resources.length > 0) {
    throw new Error("Delete your resources first before deleting your store.");
  }

  const storeSlug = user.store.slug;

  await db.store.delete({
    where: { id: user.store.id },
  });

  revalidatePath("/resources");
  revalidatePath("/creator");
  revalidatePath("/creator/store");
  revalidatePath(`/stores/${storeSlug}`);

  redirect("/creator");
}