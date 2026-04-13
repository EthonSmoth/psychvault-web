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

export type CreatorTrustAppearance = {
  label: string;
  textColor: string;
  backgroundColor: string;
  borderColor: string;
  softBackgroundColor: string;
  meter: string;
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

function calculateTrustScore(stats: CreatorTrustProfile["stats"]) {
  let score = 45;
  score += Math.min(stats.accountAgeDays, 180) / 6;
  score += stats.approvedResources * 4;
  score += Math.min(stats.salesCount, 50) * 0.8;
  score -= stats.rejectedResources * 12;
  score -= stats.pendingResources * 4;
  score -= stats.openReports * 8;
  score -= stats.resolvedReports * 2;

  return clamp(Math.round(score), 0, 100);
}

function buildTrustReasons(stats: CreatorTrustProfile["stats"]) {
  const reasons: string[] = [];

  if (stats.accountAgeDays < 14) reasons.push("New creator account");
  if (stats.approvedResources < 2) reasons.push("Limited approved publishing history");
  if (stats.openReports > 0) {
    reasons.push(`${stats.openReports} open report${stats.openReports === 1 ? "" : "s"}`);
  }
  if (stats.rejectedResources > 0) {
    reasons.push(
      `${stats.rejectedResources} rejected resource${stats.rejectedResources === 1 ? "" : "s"}`
    );
  }
  if (stats.salesCount >= 5) reasons.push("Positive sales history");
  if (stats.approvedResources >= 3) reasons.push("Multiple approved resources");

  return reasons;
}

function buildTrustProfile(stats: CreatorTrustProfile["stats"]): CreatorTrustProfile {
  const score = calculateTrustScore(stats);

  return {
    score,
    tier: getTier(score),
    reasons: buildTrustReasons(stats),
    stats,
  };
}

function getHueForScore(score: number) {
  return Math.round(8 + (clamp(score, 0, 100) / 100) * 116);
}

export function formatCreatorTrustTier(tier: CreatorTrustProfile["tier"]) {
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function getCreatorTrustAppearance(
  value: number | Pick<CreatorTrustProfile, "score" | "tier">
): CreatorTrustAppearance {
  const score = typeof value === "number" ? value : value.score;
  const tier = typeof value === "number" ? getTier(score) : value.tier;
  const hue = getHueForScore(score);
  const saturation = tier === "restricted" ? 62 : tier === "trusted" ? 52 : 58;
  const textLightness = tier === "restricted" ? 38 : tier === "trusted" ? 28 : 34;

  return {
    label: formatCreatorTrustTier(tier),
    textColor: `hsl(${hue}, ${saturation}%, ${textLightness}%)`,
    backgroundColor: `hsla(${hue}, 70%, 52%, 0.14)`,
    borderColor: `hsla(${hue}, 60%, 38%, 0.28)`,
    softBackgroundColor: `hsla(${hue}, 70%, 52%, 0.08)`,
    meter: `linear-gradient(90deg, hsla(${Math.max(hue - 10, 0)}, 72%, 58%, 1) 0%, hsla(${Math.min(
      hue + 8,
      130
    )}, 58%, 34%, 1) 100%)`,
  };
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

  const stats: CreatorTrustProfile["stats"] = {
    accountAgeDays: user
      ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0,
    approvedResources: resources.filter((resource) => resource.moderationStatus === "APPROVED").length,
    rejectedResources: resources.filter((resource) => resource.moderationStatus === "REJECTED").length,
    pendingResources: resources.filter((resource) => resource.moderationStatus === "PENDING_REVIEW")
      .length,
    openReports: reports.filter((report) => report.status === "OPEN").length,
    resolvedReports: reports.filter((report) => report.status === "RESOLVED").length,
    salesCount: resources.reduce((sum, resource) => sum + resource.salesCount, 0),
  };

  return buildTrustProfile(stats);
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

    const stats: CreatorTrustProfile["stats"] = {
      accountAgeDays: user
        ? Math.floor((Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24))
        : 0,
      approvedResources: creatorResources.filter(
        (resource) => resource.moderationStatus === "APPROVED"
      ).length,
      rejectedResources: creatorResources.filter(
        (resource) => resource.moderationStatus === "REJECTED"
      ).length,
      pendingResources: creatorResources.filter(
        (resource) => resource.moderationStatus === "PENDING_REVIEW"
      ).length,
      openReports: creatorReports.filter((report) => report.status === "OPEN").length,
      resolvedReports: creatorReports.filter((report) => report.status === "RESOLVED").length,
      salesCount: creatorResources.reduce((sum, resource) => sum + resource.salesCount, 0),
    };

    profiles.set(userId, buildTrustProfile(stats));
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
