import { Prisma, UserRole } from "@prisma/client";

type SuperAdminCandidate =
  | {
      isSuperAdmin?: boolean | null;
      role?: UserRole | string | null;
    }
  | null
  | undefined;

export function isSuperAdminUser(user: SuperAdminCandidate) {
  return Boolean(user?.isSuperAdmin);
}

export function hasAdminAccess(user: SuperAdminCandidate) {
  return user?.role === UserRole.ADMIN || isSuperAdminUser(user);
}

export function getSuperAdminStoreWhere(): Prisma.StoreWhereInput | null {
  return {
    owner: {
      isSuperAdmin: true,
    },
  };
}

export function getSuperAdminResourceWhere(): Prisma.ResourceWhereInput | null {
  return {
    store: {
      owner: {
        isSuperAdmin: true,
      },
    },
  };
}
