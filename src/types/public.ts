export type PublicCategorySummary = {
  id: string;
  name: string;
  slug: string;
};

export type PublicCreatorSummary = {
  name: string | null;
};

export type PublicStoreSummary = {
  name: string;
  slug: string;
  isVerified: boolean;
};

export type PublicResourceCard = {
  id: string;
  slug: string;
  title: string;
  shortDescription: string | null;
  thumbnailUrl: string | null;
  previewImageUrl: string | null;
  priceCents: number;
  isFree: boolean;
  averageRating: number;
  reviewCount: number;
  downloadReady: boolean;
  store: PublicStoreSummary | null;
  creator: PublicCreatorSummary | null;
  categories: PublicCategorySummary[];
};

export type PublicBrowsePageInfo = {
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  nextPage: number | null;
  previousPage: number | null;
};

export type PublicStoreCard = {
  id: string;
  name: string;
  slug: string;
  bio: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  location: string | null;
  isVerified: boolean;
  followerCount: number;
  resourceCount: number;
};
