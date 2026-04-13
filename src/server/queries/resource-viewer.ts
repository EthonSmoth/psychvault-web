import { auth } from "@/lib/auth";
import { generateCSRFToken } from "@/lib/csrf";
import { db } from "@/lib/db";
import type { ResourceViewerState } from "@/types/resource-viewer";

type ViewerSession = {
  user?: {
    id?: string | null;
    emailVerified?: Date | boolean | null;
  } | null;
} | null;

export async function getResourceViewerState(options: {
  resourceId: string;
  creatorId: string;
  storeOwnerId?: string | null;
  session?: ViewerSession;
}): Promise<ResourceViewerState> {
  const session = options.session ?? ((await auth()) as ViewerSession);

  if (!session?.user?.id) {
    return {
      authenticated: false,
    };
  }

  const viewerUserId = session.user.id;
  const isOwner =
    options.creatorId === viewerUserId || options.storeOwnerId === viewerUserId;
  const [purchase, review] = await Promise.all([
    isOwner
      ? Promise.resolve({ id: "owner" })
      : db.purchase.findUnique({
          where: {
            buyerId_resourceId: {
              buyerId: viewerUserId,
              resourceId: options.resourceId,
            },
          },
          select: {
            id: true,
          },
        }),
    isOwner
      ? Promise.resolve(null)
      : db.review.findUnique({
          where: {
            buyerId_resourceId: {
              buyerId: viewerUserId,
              resourceId: options.resourceId,
            },
          },
          select: {
            rating: true,
            body: true,
          },
        }),
  ]);

  return {
    authenticated: true,
    viewer: {
      userId: viewerUserId,
      emailVerified: Boolean(session.user.emailVerified),
      isOwner,
      hasPurchased: Boolean(purchase),
      existingReview: review,
      csrfToken: generateCSRFToken(viewerUserId),
    },
  };
}
