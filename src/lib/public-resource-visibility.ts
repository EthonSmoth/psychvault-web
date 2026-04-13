import { Prisma } from "@prisma/client";
import {
  getSuperAdminResourceWhere,
  getSuperAdminStoreWhere,
} from "@/lib/super-admin";

export const PUBLIC_VISIBILITY_CACHE_VERSION = "public-visibility-v4";

export function getPubliclyVisiblePublishedResourceWhere(
  extra: Prisma.ResourceWhereInput = {}
): Prisma.ResourceWhereInput {
  const superAdminResourceWhere = getSuperAdminResourceWhere();

  return {
    AND: [
      { status: "PUBLISHED" },
      {
        OR: [
          { isFree: true },
          { priceCents: 0 },
          ...(superAdminResourceWhere ? [superAdminResourceWhere] : []),
          {
            store: {
              owner: {
                payoutAccount: {
                  is: {
                    payoutsEnabled: true,
                    detailsSubmitted: true,
                  },
                },
              },
            },
          },
        ],
      },
      extra,
    ],
  };
}

export function getPubliclyVisibleStoreWhere(
  extra: Prisma.StoreWhereInput = {}
): Prisma.StoreWhereInput {
  const superAdminStoreWhere = getSuperAdminStoreWhere();

  return {
    AND: [
      {
        OR: [
          { isPublished: true },
          ...(superAdminStoreWhere ? [superAdminStoreWhere] : []),
        ],
      },
      extra,
    ],
  };
}
