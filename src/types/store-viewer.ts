export type StoreViewerState =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      viewer: {
        userId: string;
        emailVerified: boolean;
        isOwner: boolean;
        isFollowing: boolean;
        csrfToken: string;
      };
    };
