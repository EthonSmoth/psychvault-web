"use client";

import { useActionState, useState, useEffect } from"react";
import {
  saveReviewAction,
  type ReviewFormState,
} from"@/server/actions/review-actions";
import {
  getFirstReviewNotice,
  getReviewGuidanceText,
  isLikelyFirstReview,
  suggestReviewRewrite,
} from"@/lib/review-compliance";

const initialState: ReviewFormState = {};

type ExistingReview = {
  rating: number;
  body: string | null;
} | null;

type ReviewFormProps = {
  resourceId: string;
  resourceSlug: string;
  existingReview: ExistingReview;
  csrfToken: string;
};

export default function ReviewForm({
  resourceId,
  resourceSlug,
  existingReview,
  csrfToken,
}: ReviewFormProps) {
  const [state, formAction, pending] = useActionState(
    saveReviewAction,
    initialState
  );

  const [reviewBody, setReviewBody] = useState(existingReview?.body ??"");
  const [showFirstNotice, setShowFirstNotice] = useState(false);
  const [noticeAcknowledged, setNoticeAcknowledged] = useState(false);
  const [rewriteSuggestion, setRewriteSuggestion] = useState<string | null>(null);

  // Determine if this is likely the first review
  const isFirstReview = isLikelyFirstReview(existingReview);

  // Show first-time notice on mount (client-side, once per session)
  useEffect(() => {
    if (isFirstReview && !sessionStorage.getItem("reviewNoticeShown")) {
      setShowFirstNotice(true);
      sessionStorage.setItem("reviewNoticeShown","true");
    }
  }, [isFirstReview]);

  // Suggest rewrite as user types
  useEffect(() => {
    if (reviewBody.length > 0) {
      const suggestion = suggestReviewRewrite(reviewBody);
      setRewriteSuggestion(suggestion);
    } else {
      setRewriteSuggestion(null);
    }
  }, [reviewBody]);

  return (
    <form action={formAction} className="space-y-4 rounded-3xl border border-soft bg-[var(--card)] p-6 shadow-soft">
      <div>
        <h3 className="heading-section">
          {existingReview ?"Update your review" :"Leave a review"}
        </h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Share what this resource was like to use.
        </p>
      </div>

      {/* First-time user notice */}
      {showFirstNotice && !noticeAcknowledged && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
          <h4 className="text-sm font-semibold text-blue-900">📋 Platform Guidelines</h4>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-blue-800">
            {getFirstReviewNotice()}
          </p>
          <button
            type="button"
            onClick={() => setNoticeAcknowledged(true)}
            className="mt-3 text-xs font-medium text-blue-700 hover:text-blue-900 underline"
          >
            I understand, let me write my review
          </button>
        </div>
      )}

      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="resourceSlug" value={resourceSlug} />
      <input type="hidden" name="_csrf" value={csrfToken} />

      <div>
        <label
          htmlFor="rating"
          className="mb-2 block text-sm font-medium text-[var(--text)]"
        >
          Rating
        </label>
        <select
          id="rating"
          name="rating"
          required
          defaultValue={existingReview?.rating?.toString() ??""}
          className="w-full rounded-xl border border-soft bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(183,110,10,0.12)]"
        >
          <option value="" disabled>
            Select a rating
          </option>
          <option value="5">5 - Excellent</option>
          <option value="4">4 - Very good</option>
          <option value="3">3 - Good</option>
          <option value="2">2 - Fair</option>
          <option value="1">1 - Poor</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="body"
          className="mb-2 block text-sm font-medium text-[var(--text)]"
        >
          Review
        </label>

        {/* Inline guidance */}
        <div className="mb-3 text-xs leading-relaxed text-[var(--text-muted)]">
          {getReviewGuidanceText()}
        </div>

        <textarea
          id="body"
          name="body"
          rows={5}
          value={reviewBody}
          onChange={(e) => setReviewBody(e.target.value)}
          placeholder="What did you find helpful? Who would this resource be useful for?"
          className="w-full rounded-xl border border-soft bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:ring-4 focus:ring-[rgba(183,110,10,0.12)]"
        />

        {/* Gentle rewrite suggestion */}
        {rewriteSuggestion && (
          <p className="mt-2 text-xs text-[var(--text-muted)]">{rewriteSuggestion}</p>
        )}
      </div>

      {/* Compliance feedback (errors) */}
      {state.error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {/* Flagging warning */}
      {state.warning && !state.error ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {state.warning}
        </div>
      ) : null}

      {/* Success message */}
      {state.success ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {state.success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ?"Saving..." : existingReview ?"Update review" :"Submit review"}
      </button>
    </form>
  );
}
