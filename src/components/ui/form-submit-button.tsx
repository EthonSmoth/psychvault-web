"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

type FormSubmitButtonProps = {
  children: ReactNode;
  pendingText?: string;
  className?: string;
};

export function FormSubmitButton({
  children,
  pendingText = "Working...",
  className = "",
}: FormSubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className}
    >
      {pending ? pendingText : children}
    </button>
  );
}
