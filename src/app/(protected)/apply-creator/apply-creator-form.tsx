"use client";

import { useActionState } from "react";
import {
  applyToBeCreatorAction,
  type CreatorApplicationFormState,
} from "@/server/actions/creator-application-actions";

const initialState: CreatorApplicationFormState = {};

export function ApplyCreatorForm({ csrfToken }: { csrfToken: string }) {
  const [state, action, isPending] = useActionState(applyToBeCreatorAction, initialState);

  if (state.success) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        {state.success}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="_csrf" value={csrfToken} />

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-[var(--text)]">
          Tell us about yourself <span className="text-[var(--text-muted)]">(optional)</span>
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="What type of resources do you create? What is your professional background?"
          className="mt-2 w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text)] outline-none transition placeholder:text-[var(--text-light)] focus:border-[var(--primary)] focus:ring-0"
        />
      </div>

      {state.error && (
        <p className="text-sm text-[var(--error)]">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="inline-flex w-full items-center justify-center rounded-2xl bg-[var(--primary)] px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {isPending ? "Submitting…" : "Apply to become a creator"}
      </button>
    </form>
  );
}
