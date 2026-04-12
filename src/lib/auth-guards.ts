import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getSafeRedirectTarget } from "@/lib/redirects";

export class AuthorizationError extends Error {
  status: number;

  constructor(message = "Forbidden.", status = 403) {
    super(message);
    this.name = "AuthorizationError";
    this.status = status;
  }
}

export async function requireAuth(options?: {
  redirectTo?: string;
  redirectOnFail?: boolean;
}) {
  const session = await auth();
  const safeRedirect = getSafeRedirectTarget(options?.redirectTo ?? "/library");

  if (!session?.user?.id) {
    if (options?.redirectOnFail) {
      redirect(`/login?redirectTo=${encodeURIComponent(safeRedirect)}`);
    }

    throw new AuthorizationError("Authentication required.", 401);
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
    },
  });

  if (!user) {
    if (options?.redirectOnFail) {
      redirect(`/login?redirectTo=${encodeURIComponent(safeRedirect)}`);
    }

    throw new AuthorizationError("Authentication required.", 401);
  }

  return user;
}

export function requireRole(user: { role: string }, allowed: UserRole | UserRole[]) {
  const roles = Array.isArray(allowed) ? allowed : [allowed];

  if (!roles.includes(user.role as UserRole)) {
    throw new AuthorizationError("Forbidden.", 403);
  }

  return user;
}

export function requireOwnership(
  actorId: string,
  ownerId: string | null | undefined,
  message = "Forbidden."
) {
  if (!ownerId || actorId !== ownerId) {
    throw new AuthorizationError(message, 403);
  }
}
