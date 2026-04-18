"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { requestNavbarSessionRefresh } from "@/lib/navbar-session-sync";

export function GoogleAuthButton({
  redirectTo,
  label,
}: {
  redirectTo: string;
  label: string;
}) {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        setPending(true);
        requestNavbarSessionRefresh();
        void signIn("google", { redirectTo });
      }}
      className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-strong)] bg-white px-4 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 text-xs font-bold"
      >
        G
      </span>
      <span>{pending ? "Redirecting..." : label}</span>
    </button>
  );
}
