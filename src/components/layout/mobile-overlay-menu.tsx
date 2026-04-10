"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useState } from "react";

type MobileOverlayMenuProps = {
  title: string;
  triggerClassName: string;
  triggerContent: ReactNode;
  children: ReactNode;
  panelClassName?: string;
};

export function MobileOverlayMenu({
  title,
  triggerClassName,
  triggerContent,
  children,
  panelClassName = "",
}: MobileOverlayMenuProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={triggerClassName}>
        {triggerContent}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label={`Close ${title}`}
            onClick={() => setOpen(false)}
            className="absolute inset-0 bg-[rgba(63,45,31,0.42)] backdrop-blur-sm"
          />

          <div className="relative flex min-h-full items-center justify-center p-4">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={title}
              className={`relative w-full max-w-sm rounded-[2rem] border border-soft bg-[var(--card)] p-5 shadow-[0_24px_80px_rgba(63,45,31,0.22)] ${panelClassName}`}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-base font-semibold text-[var(--text)]">{title}</div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-xl border border-soft bg-[var(--surface-alt)] px-3 py-2 text-xs font-medium text-[var(--text)] transition hover:bg-[var(--surface)]"
                >
                  Close
                </button>
              </div>

              <div className="space-y-2">{children}</div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
