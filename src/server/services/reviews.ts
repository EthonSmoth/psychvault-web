import { db } from "@/lib/db";

export async function refreshResourceRating(resourceId: string) {
  const aggregation = await db.review.aggregate({
    where: { resourceId },
    _avg: { rating: true },
    _count: { rating: true }
  });

  await db.resource.update({
    where: { id: resourceId },
    data: {
      averageRating: aggregation._avg.rating ?? 0,
      reviewCount: aggregation._count.rating
    }
  });
}
