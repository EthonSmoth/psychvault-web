"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { requestNavbarSessionRefresh } from "@/lib/navbar-session-sync";

export function FacebookAuthButton({
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
        void signIn("facebook", { redirectTo });
      }}
      className="inline-flex w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-strong)] bg-[#1877F2] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#166FE5] disabled:cursor-not-allowed disabled:opacity-70"
    >
      <span
        aria-hidden="true"
        className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-white text-xs font-bold text-[#1877F2]"
      >
        f
      </span>
      <span>{pending ? "Redirecting..." : label}</span>
    </button>
  );
}
