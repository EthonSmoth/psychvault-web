"use client";

import Link from "next/link";
import { createContext, useContext } from "react";
import { toggleFollowStoreAction } from "@/server/actions/follow-actions";
import { ReportStoreForm } from "@/components/stores/report-store-form";
import type { StoreViewerState } from "@/types/store-viewer";

type StoreViewerContextValue = {
  viewerState: StoreViewerState;
};

const StoreViewerContext = createContext<StoreViewerContextValue>({
  viewerState: { authenticated: false },
});

export function StoreViewerProvider({
  initialViewerState,
  children,
}: {
  initialViewerState: StoreViewerState;
  children: React.ReactNode;
}) {
  return (
    <StoreViewerContext.Provider value={{ viewerState: initialViewerState }}>
      {children}
    </StoreViewerContext.Provider>
  );
}

function useStoreViewerState() {
  return useContext(StoreViewerContext).viewerState;
}

export function StorePrimaryActions({
  storeId,
  storeSlug,
  ownerId,
}: {
  storeId: string;
  storeSlug: string;
  ownerId: string;
}) {
  const viewerState = useStoreViewerState();
  const viewer = viewerState?.authenticated ? viewerState.viewer : null;

  if (!viewer) {
    return (
      <>
        <Link
          href={`/login?redirectTo=${encodeURIComponent(`/stores/${storeSlug}`)}`}
          className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
        >
          Log in to follow
        </Link>
        <Link
          href={`/login?redirectTo=${encodeURIComponent(`/messages/start?creatorId=${ownerId}`)}`}
          className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
        >
          Log in to message creator
        </Link>
      </>
    );
  }

  if (viewer.isOwner) {
    return (
      <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text-muted)]">
        This is your store
      </div>
    );
  }

  return (
    <>
      <form action={toggleFollowStoreAction}>
        <input type="hidden" name="storeId" value={storeId} />
        <input type="hidden" name="storeSlug" value={storeSlug} />
        <input type="hidden" name="_csrf" value={viewer.csrfToken} />
        <button
          type="submit"
          className={`inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            viewer.isFollowing
              ? "border border-[var(--border)] bg-[var(--card)] text-[var(--text)] hover:bg-[var(--surface-alt)]"
              : "bg-[var(--primary)] text-white hover:bg-[var(--primary-dark)] hover:text-white"
          }`}
        >
          {viewer.isFollowing ? "Following" : "Follow"}
        </button>
      </form>

      <Link
        href={
          viewer.emailVerified
            ? `/messages/start?creatorId=${ownerId}`
            : `/verify-email?redirectTo=${encodeURIComponent(`/messages/start?creatorId=${ownerId}`)}`
        }
        className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
      >
        {viewer.emailVerified ? "Message creator" : "Verify email to message"}
      </Link>
    </>
  );
}

export function StoreReportSection({
  storeId,
  storeSlug,
}: {
  storeId: string;
  storeSlug: string;
}) {
  const viewerState = useStoreViewerState();
  const viewer = viewerState?.authenticated ? viewerState.viewer : null;

  if (!viewer) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
        <Link
          href={`/login?redirectTo=/stores/${storeSlug}`}
          className="font-medium text-[var(--text)] underline"
        >
          Log in
        </Link>{" "}
        to report this store.
      </div>
    );
  }

  if (viewer.isOwner) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
        You cannot report your own store.
      </div>
    );
  }

  if (!viewer.emailVerified) {
    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4 text-sm text-[var(--text-muted)]">
        <Link
          href={`/verify-email?redirectTo=${encodeURIComponent(`/stores/${storeSlug}`)}`}
          className="font-medium text-[var(--text)] underline"
        >
          Verify your email
        </Link>{" "}
        to report this store.
      </div>
    );
  }

  return (
    <ReportStoreForm
      storeId={storeId}
      storeSlug={storeSlug}
      csrfToken={viewer.csrfToken}
    />
  );
}
