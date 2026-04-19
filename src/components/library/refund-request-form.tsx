"use client";

import { useActionState, useState } from"react";
import { submitRefundRequestAction, type RefundFormState } from"@/server/actions/refund-actions";

const REFUND_REASONS = [
"Resource not as described",
"Duplicate purchase",
"Technical issue — file could not be downloaded",
"Purchased by mistake",
"Other",
] as const;

type RefundRequestFormProps = {
  purchaseId: string;
  resourceTitle: string;
  csrfToken: string;
};

export function RefundRequestForm({
  purchaseId,
  resourceTitle,
  csrfToken,
}: RefundRequestFormProps) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<RefundFormState, FormData>(
    submitRefundRequestAction,
    {}
  );

  if (state.success) {
    return (
      <span className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
        Refund requested
      </span>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text-muted)] transition hover:border-red-200 hover:bg-red-50 hover:text-red-700"
      >
        Request refund
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[var(--text)]">Request a refund</p>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {resourceTitle}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-[var(--text-light)] hover:text-[var(--text)]"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <form action={action} className="space-y-3">
        <input type="hidden" name="_csrf" value={csrfToken} />
        <input type="hidden" name="purchaseId" value={purchaseId} />

        <div>
          <label htmlFor={`reason-${purchaseId}`} className="block text-xs font-medium text-[var(--text)]">
            Reason
          </label>
          <select
            id={`reason-${purchaseId}`}
            name="reason"
            required
            className="mt-1 w-full rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          >
            <option value="">Select a reason…</option>
            {REFUND_REASONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor={`message-${purchaseId}`} className="block text-xs font-medium text-[var(--text)]">
            Additional details{""}
            <span className="font-normal text-[var(--text-light)]">(optional)</span>
          </label>
          <textarea
            id={`message-${purchaseId}`}
            name="message"
            rows={3}
            maxLength={1000}
            placeholder="Any extra context that will help us process your request…"
            className="mt-1 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          />
        </div>

        {state.error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{state.error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-[var(--border)] px-3 py-2 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={pending}
            className="rounded-xl bg-[var(--primary)] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:opacity-60"
          >
            {pending ?"Submitting…" :"Submit request"}
          </button>
        </div>
      </form>
    </div>
  );
}
