import { auth } from "@/lib/auth";
import { generateCSRFToken } from "@/lib/csrf";
import { db } from "@/lib/db";
import type { StoreViewerState } from "@/types/store-viewer";

export async function getStoreViewerState(options: {
  storeId: string;
  ownerId: string;
}): Promise<StoreViewerState> {
  const session = await auth();

  if (!session?.user?.id) {
    return {
      authenticated: false,
    };
  }

  const viewerUserId = session.user.id;
  const follow = await db.follow.findUnique({
    where: {
      followerId_storeId: {
        followerId: viewerUserId,
        storeId: options.storeId,
      },
    },
    select: {
      followerId: true,
    },
  });

  return {
    authenticated: true,
    viewer: {
      userId: viewerUserId,
      emailVerified: Boolean(session.user.emailVerified),
      isOwner: options.ownerId === viewerUserId,
      isFollowing: Boolean(follow),
      csrfToken: generateCSRFToken(viewerUserId),
    },
  };
}
