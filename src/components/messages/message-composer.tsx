"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

type MessageComposerProps = {
  conversationId: string;
};

export default function MessageComposer({ conversationId }: MessageComposerProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [body, setBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!body.trim()) {
      setError("Please enter a message before sending.");
      return;
    }

    setIsSending(true);

    const response = await fetch(`/api/messages/${conversationId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ body: body.trim() }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      setError(payload?.error || "Unable to send your message. Please try again.");
      setIsSending(false);
      return;
    }

    setBody("");
    setIsSending(false);
    router.refresh();
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-3">
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            formRef.current?.requestSubmit();
          }
        }}
        rows={3}
        className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] px-4 py-3 text-sm text-[var(--text)] shadow-sm outline-none transition focus:border-[var(--primary)] focus:bg-[var(--card)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        placeholder="Write a message…"
      />

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <span className="text-xs text-[var(--text-muted)]">Enter to send · Shift+Enter for new line</span>
        <button
          type="submit"
          disabled={isSending}
          className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}

