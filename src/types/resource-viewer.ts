export type ResourceViewerState =
  | {
      authenticated: false;
    }
  | {
      authenticated: true;
      viewer: {
        userId: string;
        emailVerified: boolean;
        isOwner: boolean;
        hasPurchased: boolean;
        existingReview: {
          rating: number;
          body: string | null;
        } | null;
        csrfToken: string;
      };
    };
