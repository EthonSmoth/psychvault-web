import { db } from "@/lib/db";

export type CreatorTrustProfile = {
  score: number;
  tier: "new" | "standard" | "trusted" | "restricted";
  reasons: string[];
  stats: {
    accountAgeDays: number;
    approvedResources: number;
    rejectedResources: number;
    pendingResources: number;
    openReports: number;
    resolvedReports: number;
    salesCount: number;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getTier(score: number): CreatorTrustProfile["tier"] {
  if (score < 35) return "restricted";
  if (score < 60) return "new";
  if (score < 80) return "standard";
  return "trusted";
}

// Builds a lightweight trust profile from creator history so moderation can react to risk.
export async function getCreatorTrustProfile(userId: string): Promise<CreatorTrustProfile> {
  const [user, resources, reports] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: {
        createdAt: true,
      },
    }),
    db.resource.findMany({
      where: { creatorId: userId },
      select: {
        moderationStatus: true,
        salesCount: true,
      },
    }),
    db.resourceReport.findMany({
      where: {
        resource: {
          creatorId: userId,
        },
      },
      select: {
        status: true,
      },
    }),
  ]);

  const accountAgeDays = user
    ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;

  const approvedResources = resources.filter((resource) => resource.moderationStatus === "APPROVED").length;
  const rejectedResources = resources.filter((resource) => resource.moderationStatus === "REJECTED").length;
  const pendingResources = resources.filter((resource) => resource.moderationStatus === "PENDING_REVIEW").length;
  const salesCount = resources.reduce((sum, resource) => sum + resource.salesCount, 0);
  const openReports = reports.filter((report) => report.status === "OPEN").length;
  const resolvedReports = reports.filter((report) => report.status === "RESOLVED").length;

  let score = 45;
  score += Math.min(accountAgeDays, 180) / 6;
  score += approvedResources * 4;
  score += Math.min(salesCount, 50) * 0.8;
  score -= rejectedResources * 12;
  score -= pendingResources * 4;
  score -= openReports * 8;
  score -= resolvedReports * 2;

  score = clamp(Math.round(score), 0, 100);

  const reasons: string[] = [];
  if (accountAgeDays < 14) reasons.push("New creator account");
  if (approvedResources < 2) reasons.push("Limited approved publishing history");
  if (openReports > 0) reasons.push(`${openReports} open report${openReports === 1 ? "" : "s"}`);
  if (rejectedResources > 0) reasons.push(`${rejectedResources} rejected resource${rejectedResources === 1 ? "" : "s"}`);
  if (salesCount >= 5) reasons.push("Positive sales history");
  if (approvedResources >= 3) reasons.push("Multiple approved resources");

  return {
    score,
    tier: getTier(score),
    reasons,
    stats: {
      accountAgeDays,
      approvedResources,
      rejectedResources,
      pendingResources,
      openReports,
      resolvedReports,
      salesCount,
    },
  };
}

export async function getCreatorTrustProfiles(userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

  if (uniqueUserIds.length === 0) {
    return new Map<string, CreatorTrustProfile>();
  }

  const [users, resources, reports] = await Promise.all([
    db.user.findMany({
      where: {
        id: {
          in: uniqueUserIds,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    }),
    db.resource.findMany({
      where: {
        creatorId: {
          in: uniqueUserIds,
        },
      },
      select: {
        creatorId: true,
        moderationStatus: true,
        salesCount: true,
      },
    }),
    db.resourceReport.findMany({
      where: {
        resource: {
          creatorId: {
            in: uniqueUserIds,
          },
        },
      },
      select: {
        status: true,
        resource: {
          select: {
            creatorId: true,
          },
        },
      },
    }),
  ]);

  const userMap = new Map(users.map((user) => [user.id, user]));
  const resourcesByCreator = new Map<string, typeof resources>();
  const reportsByCreator = new Map<string, typeof reports>();

  for (const resource of resources) {
    const existing = resourcesByCreator.get(resource.creatorId) ?? [];
    existing.push(resource);
    resourcesByCreator.set(resource.creatorId, existing);
  }

  for (const report of reports) {
    const creatorId = report.resource.creatorId;
    const existing = reportsByCreator.get(creatorId) ?? [];
    existing.push(report);
    reportsByCreator.set(creatorId, existing);
  }

  const profiles = new Map<string, CreatorTrustProfile>();

  for (const userId of uniqueUserIds) {
    const user = userMap.get(userId);
    const creatorResources = resourcesByCreator.get(userId) ?? [];
    const creatorReports = reportsByCreator.get(userId) ?? [];

    const accountAgeDays = user
      ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const approvedResources = creatorResources.filter(
      (resource) => resource.moderationStatus === "APPROVED"
    ).length;
    const rejectedResources = creatorResources.filter(
      (resource) => resource.moderationStatus === "REJECTED"
    ).length;
    const pendingResources = creatorResources.filter(
      (resource) => resource.moderationStatus === "PENDING_REVIEW"
    ).length;
    const salesCount = creatorResources.reduce((sum, resource) => sum + resource.salesCount, 0);
    const openReports = creatorReports.filter((report) => report.status === "OPEN").length;
    const resolvedReports = creatorReports.filter(
      (report) => report.status === "RESOLVED"
    ).length;

    let score = 45;
    score += Math.min(accountAgeDays, 180) / 6;
    score += approvedResources * 4;
    score += Math.min(salesCount, 50) * 0.8;
    score -= rejectedResources * 12;
    score -= pendingResources * 4;
    score -= openReports * 8;
    score -= resolvedReports * 2;

    score = clamp(Math.round(score), 0, 100);

    const reasons: string[] = [];
    if (accountAgeDays < 14) reasons.push("New creator account");
    if (approvedResources < 2) reasons.push("Limited approved publishing history");
    if (openReports > 0) reasons.push(`${openReports} open report${openReports === 1 ? "" : "s"}`);
    if (rejectedResources > 0) reasons.push(`${rejectedResources} rejected resource${rejectedResources === 1 ? "" : "s"}`);
    if (salesCount >= 5) reasons.push("Positive sales history");
    if (approvedResources >= 3) reasons.push("Multiple approved resources");

    profiles.set(userId, {
      score,
      tier: getTier(score),
      reasons,
      stats: {
        accountAgeDays,
        approvedResources,
        rejectedResources,
        pendingResources,
        openReports,
        resolvedReports,
        salesCount,
      },
    });
  }

  return profiles;
}

// Decides whether a creator should be forced into review based on trust rather than content alone.
export function shouldForceTrustReview(profile: CreatorTrustProfile) {
  if (profile.tier === "restricted") {
    return {
      shouldReview: true,
      reason:
        "This listing was sent to review because your account currently has a low trust score.",
    };
  }

  if (profile.tier === "new") {
    return {
      shouldReview: true,
      reason:
        "This listing was sent to review because new creator accounts are reviewed before publishing.",
    };
  }

  return {
    shouldReview: false,
    reason: null,
  };
}
