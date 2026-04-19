"use client";

import { useEffect } from"react";
import { useRouter } from"next/navigation";

export type ThreadMessage = {
  id: string;
  body: string;
  createdAt: string;
  senderId: string;
  senderName: string | null;
};

type MessageThreadProps = {
  conversationId: string;
  currentUserId: string;
  otherUserName: string;
  messages: ThreadMessage[];
};

export default function MessageThread({
  conversationId,
  currentUserId,
  otherUserName,
  messages,
}: MessageThreadProps) {
  const router = useRouter();

  useEffect(() => {
    fetch(`/api/messages/${conversationId}/read`, {
      method:"POST",
    }).catch(() => undefined);
  }, [conversationId]);

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 15000);
    return () => window.clearInterval(interval);
  }, [conversationId, router]);

  return (
    <div className="card-section">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text)]">{otherUserName}</h1>
          <p className="mt-1 text-sm text-[var(--text-muted)]">Messages are refreshed every 15 seconds.</p>
        </div>
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--surface-alt)] p-6 text-sm text-[var(--text-muted)]">
            No messages yet. Send the first message to start the conversation.
          </div>
        ) : (
          messages.map((message) => {
            const isMine = message.senderId === currentUserId;
            return (
              <div
                key={message.id}
                className={`rounded-3xl p-4 shadow-sm ${
                  isMine
                    ?"ml-auto max-w-[85%] bg-[var(--primary)] text-white"
                    :"mr-auto max-w-[85%] bg-[var(--surface-alt)] text-[var(--text)]"
                }`}
              >
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-light)]">
                  {isMine ?"You" : message.senderName || otherUserName}
                </div>
                <div className="whitespace-pre-wrap text-sm leading-6">
                  {message.body}
                </div>
                <div className={`mt-3 text-right text-xs ${isMine ?"text-white/70" :"text-[var(--text-muted)]"}`}>
                  {new Intl.DateTimeFormat("en-AU", {
                    hour:"2-digit",
                    minute:"2-digit",
                    day:"numeric",
                    month:"short",
                  }).format(new Date(message.createdAt))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
