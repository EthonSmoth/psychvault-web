/**
 * Admin utilities for reviewing flagged reviews
 * Provides queries and actions for the admin dashboard
 */

import { db } from "@/lib/db";

export type FlaggedReviewWithContext = {
  review: {
    id: string;
    buyerId: string;
    resourceId: string;
    rating: number;
    body: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  buyer: {
    id: string;
    name: string;
    email: string;
  };
  resource: {
    id: string;
    slug: string;
    title: string;
    creator: {
      name: string;
    };
  };
  reviewReports: Array<{
    reason: string;
    createdAt: Date;
  }>;
};

/**
 * Get all reviews flagged via the moderation system
 * (Those with review reports)
 */
export async function getFlaggedReviewsForModeration(
  limit: number = 50,
  offset: number = 0
): Promise<FlaggedReviewWithContext[]> {
  const reviews = await db.review.findMany({
    where: {
      reports: {
        some: {}, // Has at least one report
      },
    },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      resource: {
        select: {
          id: true,
          slug: true,
          title: true,
          creator: {
            select: {
              name: true,
            },
          },
        },
      },
      reports: {
        select: {
          reason: true,
          createdAt: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    take: limit,
    skip: offset,
  });

  return reviews as FlaggedReviewWithContext[];
}

/**
 * Get count of flagged reviews
 */
export async function getCountFlaggedReviews(): Promise<number> {
  return await db.review.count({
    where: {
      reports: {
        some: {},
      },
    },
  });
}

/**
 * Get recent reviews that might need compliance review
 * (Not yet reported, but created recently)
 */
export async function getRecentReviewsForComplianceCheck(
  hoursBack: number = 24,
  limit: number = 20
): Promise<
  Array<{
    id: string;
    body: string | null;
    rating: number;
    createdAt: Date;
    buyer: { name: string; email: string };
    resource: { title: string; slug: string };
  }>
> {
  const since = new Date(Date.now() - hoursBack * 60 * 60 * 1000);

  const reviews = await db.review.findMany({
    where: {
      createdAt: {
        gte: since,
      },
      reports: {
        none: {}, // Not yet reported
      },
    },
    include: {
      buyer: {
        select: { name: true, email: true },
      },
      resource: {
        select: { title: true, slug: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });

  return reviews;
}

/**
 * Get a specific flagged review with full context
 */
export async function getFlaggedReviewDetail(
  reviewId: string
): Promise<FlaggedReviewWithContext | null> {
  const review = await db.review.findUnique({
    where: { id: reviewId },
    include: {
      buyer: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      resource: {
        select: {
          id: true,
          slug: true,
          title: true,
          creator: {
            select: {
              name: true,
            },
          },
        },
      },
      reports: {
        select: {
          reason: true,
          createdAt: true,
        },
      },
    },
  });

  if (!review || review.reports.length === 0) {
    return null;
  }

  return review as FlaggedReviewWithContext;
}

/**
 * Get reviews by a specific user for context
 * (When investigating a user account)
 */
export async function getUserReviewsForModeration(userId: string, limit: number = 10) {
  return await db.review.findMany({
    where: {
      buyerId: userId,
    },
    include: {
      resource: {
        select: { title: true, slug: true },
      },
      reports: {
        select: { reason: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

/**
 * Get all reviews for a resource
 * (When investigating a resource for spam/quality)
 */
export async function getResourceReviewsForModeration(
  resourceId: string,
  limit: number = 50
) {
  return await db.review.findMany({
    where: {
      resourceId,
    },
    include: {
      buyer: {
        select: { name: true, email: true },
      },
      reports: {
        select: { reason: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: limit,
  });
}

/**
 * Clear all reports on a review (approve it)
 */
export async function approveReview(reviewId: string) {
  await db.reviewReport.deleteMany({
    where: { reviewId },
  });
}

/**
 * Delete a review and its reports (reject it)
 */
export async function deleteReviewAsAdmin(reviewId: string) {
  await db.review.delete({
    where: { id: reviewId },
  });
}

/**
 * Get moderation stats
 */
export async function getReviewModerationStats() {
  const [
    totalReviews,
    flaggedReviews,
    averageRating,
    recentFlaggings,
  ] = await Promise.all([
    db.review.count(),
    db.review.count({
      where: {
        reports: {
          some: {},
        },
      },
    }),
    db.review.aggregate({
      _avg: {
        rating: true,
      },
    }),
    db.reviewReport.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    }),
  ]);

  return {
    totalReviews,
    flaggedReviews,
    flagRatio: totalReviews > 0 ? (flaggedReviews / totalReviews * 100).toFixed(2) : "0",
    averageRating: averageRating._avg?.rating?.toFixed(2) || "0",
    recentFlaggings: recentFlaggings, // Last 7 days
  };
}
