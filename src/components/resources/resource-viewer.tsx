"use client";

import Link from "next/link";
import { createContext, useContext, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReviewForm from "@/components/resources/review-form";
import { ReportResourceForm } from "@/components/resources/report-resource-form";

type ResourceViewerResponse =
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

type ResourceViewerContextValue = {
  viewerState: ResourceViewerResponse | null;
};

const ResourceViewerContext = createContext<ResourceViewerContextValue>({
  viewerState: null,
});

function formatPrice(priceCents: number, isFree?: boolean) {
  if (isFree || priceCents === 0) {
    return "Free";
  }

  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(priceCents / 100);
}

export function ResourceViewerProvider({
  resourceId,
  children,
}: {
  resourceId: string;
  children: React.ReactNode;
}) {
  const [viewerState, setViewerState] = useState<ResourceViewerResponse | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetch(`/api/resources/${resourceId}/viewer`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("Failed to load viewer state");
        }

        return (await response.json()) as ResourceViewerResponse;
      })
      .then((payload) => {
        setViewerState(payload);
      })
      .catch(() => {
        setViewerState({ authenticated: false });
      });

    return () => {
      controller.abort();
    };
  }, [resourceId]);

  return (
    <ResourceViewerContext.Provider value={{ viewerState }}>
      {children}
    </ResourceViewerContext.Provider>
  );
}

function useResourceViewerState() {
  return useContext(ResourceViewerContext).viewerState;
}

export function ResourcePageNotices() {
  const searchParams = useSearchParams();
  const errorCode = searchParams.get("error");

  const errorMessage =
    errorCode === "download-missing"
      ? "This resource cannot be purchased yet because it does not have a downloadable file attached."
      : errorCode === "creator-payouts-unavailable"
      ? "This creator needs to finish Stripe payout onboarding before paid checkout can go live for this resource."
      : errorCode === "payments-unavailable"
      ? "Paid checkout is temporarily unavailable while payment activation is being finalised. Free resources are still available as normal."
      : null;

  if (!errorMessage) {
    return null;
  }

  return (
    <div className="mb-6 rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      {errorMessage}
    </div>
  );
}

export function ResourcePurchaseActions({
  resourceId,
  resourceSlug,
  storeOwnerId,
  hasMainFile,
  isFree,
  priceCents,
  checkoutUnavailableReason,
}: {
  resourceId: string;
  resourceSlug: string;
  storeOwnerId?: string | null;
  hasMainFile: boolean;
  isFree: boolean;
  priceCents: number;
  checkoutUnavailableReason: "platform" | "creator-payouts" | null;
}) {
  const viewerState = useResourceViewerState();
  const viewer = viewerState?.authenticated ? viewerState.viewer : null;

  if (viewer?.isOwner) {
    return (
      <>
        <div className="inline-flex self-start rounded-full bg-[var(--surface)] px-3 py-1 text-xs font-semibold text-[var(--text)]">
          Creator view
        </div>

        <Link
          href="/creator/resources"
          className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
        >
          Manage this resource
        </Link>
      </>
    );
  }

  if (viewer?.hasPurchased) {
    return (
      <>
        <div className="inline-flex self-start rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
          In your library
        </div>

        {hasMainFile ? (
          <a
            href={`/api/downloads/${resourceId}`}
            className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
          >
            Download resource
          </a>
        ) : (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This resource does not have a download attached yet.
          </div>
        )}

        <Link
          href="/library"
          className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border-strong)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
        >
          View library
        </Link>
      </>
    );
  }

  if (!hasMainFile) {
    return (
      <div className="rounded-3xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
        This resource cannot be purchased until the creator attaches the downloadable file.
      </div>
    );
  }

  return (
    <>
      {checkoutUnavailableReason ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {checkoutUnavailableReason === "creator-payouts"
            ? "This creator still needs to complete Stripe payout onboarding before paid checkout can go live."
            : "Paid checkout is temporarily unavailable. You can still message the creator or browse free resources while payment activation is completed."}
        </div>
      ) : (
        <form method="POST" action="/api/checkout">
          <input type="hidden" name="resourceId" value={resourceId} />
          <input type="hidden" name="redirectTo" value={`/resources/${resourceSlug}`} />
          <button
            type="submit"
            className="inline-flex w-full items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
          >
            {isFree ? "Get for free" : `Buy for ${formatPrice(priceCents)}`}
          </button>
        </form>
      )}

      {storeOwnerId ? (
        <Link
          href={`/messages/start?creatorId=${storeOwnerId}`}
          className="inline-flex w-full items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-3 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
        >
          Message creator
        </Link>
      ) : null}
    </>
  );
}

export function ResourceReportBox({
  resourceId,
  resourceSlug,
}: {
  resourceId: string;
  resourceSlug: string;
}) {
  const viewerState = useResourceViewerState();
  const viewer = viewerState?.authenticated ? viewerState.viewer : null;

  if (!viewerState || !viewer) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
        <Link
          href={`/login?redirectTo=/resources/${resourceSlug}`}
          className="font-medium text-[var(--text)] underline"
        >
          Log in
        </Link>{" "}
        to report this resource.
      </div>
    );
  }

  if (viewer.isOwner) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
        You cannot report your own resource.
      </div>
    );
  }

  if (!viewer.emailVerified) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
        <Link
          href={`/verify-email?redirectTo=${encodeURIComponent(`/resources/${resourceSlug}`)}`}
          className="font-medium text-[var(--text)] underline"
        >
          Verify your email
        </Link>{" "}
        to report this resource.
      </div>
    );
  }

  return (
    <ReportResourceForm
      resourceId={resourceId}
      resourceSlug={resourceSlug}
      csrfToken={viewer.csrfToken}
    />
  );
}

export function ResourceReviewGate({
  resourceId,
  resourceSlug,
}: {
  resourceId: string;
  resourceSlug: string;
}) {
  const viewerState = useResourceViewerState();
  const viewer = viewerState?.authenticated ? viewerState.viewer : null;

  if (!viewerState || !viewer) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--text-muted)] shadow-sm">
        <Link
          href={`/login?redirectTo=/resources/${resourceSlug}`}
          className="font-medium text-[var(--text)] underline"
        >
          Log in
        </Link>{" "}
        and get this resource to leave a review.
      </div>
    );
  }

  if (viewer.hasPurchased && !viewer.isOwner) {
    return (
      <ReviewForm
        resourceId={resourceId}
        resourceSlug={resourceSlug}
        existingReview={viewer.existingReview}
        csrfToken={viewer.csrfToken}
      />
    );
  }

  if (viewer.isOwner) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--text-muted)] shadow-sm">
        Creators cannot leave reviews on their own resources.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--text-muted)] shadow-sm">
      Get this resource to leave a review.
    </div>
  );
}
