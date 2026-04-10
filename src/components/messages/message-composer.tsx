"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MessageComposerProps = {
  conversationId: string;
};

export default function MessageComposer({ conversationId }: MessageComposerProps) {
  const router = useRouter();
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block text-sm font-medium text-[var(--text)]">
        Message
      </label>
      <textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        rows={5}
        className="w-full rounded-3xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm text-[var(--text)] shadow-sm outline-none transition focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring-focus)]"
        placeholder="Write your message here..."
      />

      {error ? (
        <div className="rounded-3xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSending}
        className="inline-flex items-center justify-center rounded-xl bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isSending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
