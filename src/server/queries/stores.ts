import { db } from "@/lib/db";

export async function getPublishedStoreBySlug(slug: string) {
  return db.store.findFirst({
    where: { slug, isPublished: true },
    include: {
      owner: true,
      followers: true,
      resources: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        include: {
          files: true,
          categories: { include: { category: true } },
          tags: { include: { tag: true } }
        }
      }
    }
  });
}
