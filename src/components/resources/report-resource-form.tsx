"use client";

import { useActionState } from"react";
import {
  submitResourceReportAction,
  type ReportResourceFormState,
} from"@/server/actions/report-actions";

const initialState: ReportResourceFormState = {};

type ReportResourceFormProps = {
  resourceId: string;
  resourceSlug: string;
  csrfToken: string;
};

const REPORT_REASONS = [
  {
    value:"INAPPROPRIATE_CONTENT",
    label:"Inappropriate content",
  },
  {
    value:"COPYRIGHT",
    label:"Copyright issue",
  },
  {
    value:"MISLEADING_OR_UNSAFE",
    label:"Misleading or unsafe",
  },
  {
    value:"SPAM",
    label:"Spam",
  },
  {
    value:"IMPERSONATION",
    label:"Impersonation",
  },
] as const;

export function ReportResourceForm({
  resourceId,
  resourceSlug,
  csrfToken,
}: ReportResourceFormProps) {
  const [state, formAction, pending] = useActionState(
    submitResourceReportAction,
    initialState
  );

  return (
    <form action={formAction} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text)]">Report this resource</h3>
          <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">
            Flag inappropriate, unsafe, misleading, or stolen content for review.
          </p>
        </div>
      </div>

      <input type="hidden" name="resourceId" value={resourceId} />
      <input type="hidden" name="resourceSlug" value={resourceSlug} />
      <input type="hidden" name="_csrf" value={csrfToken} />

      <div className="mt-4 grid gap-3">
        <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Reason
          <select
            name="reason"
            required
            defaultValue=""
            className="mt-2 w-full rounded-xl border border-soft bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition focus:border-[var(--primary)]"
          >
            <option value="" disabled>
              Choose a reason
            </option>
            {REPORT_REASONS.map((reason) => (
              <option key={reason.value} value={reason.value}>
                {reason.label}
              </option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          Details
          <textarea
            name="details"
            rows={3}
            maxLength={500}
            placeholder="Optional context for the moderator team."
            className="mt-2 w-full rounded-xl border border-soft bg-[var(--card)] px-3 py-2.5 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)]"
          />
        </label>
      </div>

      {state.error ? (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </div>
      ) : null}

      {state.success ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {state.success}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-4 inline-flex items-center justify-center rounded-xl border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ?"Sending..." :"Submit report"}
      </button>
    </form>
  );
}
