"use client";

import { useActionState, useState } from"react";
import { flagReviewAction, type FlagReviewFormState } from"@/server/actions/review-actions";
import { useResourceViewerState } from"@/components/resources/resource-viewer";

const REPORT_REASONS = [
  { value:"spam", label:"Spam or advertising" },
  { value:"fake", label:"Fake or incentivised review" },
  { value:"offensive", label:"Offensive or inappropriate" },
  { value:"irrelevant", label:"Irrelevant to the resource" },
] as const;

const initialState: FlagReviewFormState = {};

export function FlagReviewButton({ reviewId }: { reviewId: string }) {
  const { viewerState } = useResourceViewerState();
  const csrfToken = viewerState?.authenticated ? viewerState.viewer.csrfToken : null;
  const [open, setOpen] = useState(false);
  const [state, action, isPending] = useActionState(flagReviewAction, initialState);

  if (!csrfToken) return null;

  if (state.success) {
    return (
      <span className="text-xs text-[var(--text-muted)]">Flagged</span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-[var(--text-light)] hover:text-[var(--text-muted)] transition"
        aria-label="Flag this review"
      >
        Flag
      </button>
    );
  }

  return (
    <form action={action} className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
      <input type="hidden" name="reviewId" value={reviewId} />
      <input type="hidden" name="_csrf" value={csrfToken} />
      <p className="mb-2 text-xs font-medium text-[var(--text)]">Why are you flagging this review?</p>
      <div className="flex flex-col gap-1.5">
        {REPORT_REASONS.map((r) => (
          <label key={r.value} className="flex items-center gap-2 text-xs text-[var(--text-muted)] cursor-pointer">
            <input type="radio" name="reason" value={r.value} required className="accent-[var(--primary)]" />
            {r.label}
          </label>
        ))}
      </div>
      {state.error && (
        <p className="mt-2 text-xs text-[var(--error)]">{state.error}</p>
      )}
      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-alt)] px-3 py-1.5 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface)] disabled:opacity-50"
        >
          {isPending ?"Submitting…" :"Submit report"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs text-[var(--text-light)] hover:text-[var(--text-muted)] transition"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
