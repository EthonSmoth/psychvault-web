import { Prisma, UserRole } from "@prisma/client";

export function getPubliclyVisiblePublishedResourceWhere(
  extra: Prisma.ResourceWhereInput = {}
): Prisma.ResourceWhereInput {
  return {
    AND: [
      { status: "PUBLISHED" },
      {
        OR: [
          { isFree: true },
          { priceCents: 0 },
          {
            store: {
              owner: {
                role: UserRole.ADMIN,
              },
            },
          },
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
