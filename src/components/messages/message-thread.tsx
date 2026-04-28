"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasMountedRef = useRef(false);

  // Mark conversation as read on load
  useEffect(() => {
    fetch(`/api/messages/${conversationId}/read`, {
      method: "POST",
    }).catch(() => undefined);
  }, [conversationId]);

  // Poll for new messages every 8 seconds
  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), 8000);
    return () => window.clearInterval(interval);
  }, [conversationId, router]);

  // Auto-scroll to bottom: instant on mount, smooth on new messages
  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      messagesEndRef.current?.scrollIntoView({ behavior: "instant" });
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length]);

  return (
    <div className="overflow-y-auto max-h-[60vh] min-h-[200px] p-5 space-y-3 scroll-smooth">
      {messages.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-alt)] p-5 text-sm text-[var(--text-muted)]">
          No messages yet. Send the first message to start the conversation.
        </div>
      ) : (
        messages.map((message) => {
          const isMine = message.senderId === currentUserId;
          return (
            <div
              key={message.id}
              className={`rounded-2xl px-4 py-3 shadow-sm ${
                isMine
                  ? "ml-auto max-w-[80%] bg-[var(--primary)] text-white"
                  : "mr-auto max-w-[80%] bg-[var(--surface-alt)] text-[var(--text)]"
              }`}
            >
              <div
                className={`mb-1 text-xs font-semibold uppercase tracking-wide ${
                  isMine ? "text-white/70" : "text-[var(--text-light)]"
                }`}
              >
                {isMine ? "You" : message.senderName || otherUserName}
              </div>
              <div className="whitespace-pre-wrap text-sm leading-6">
                {message.body}
              </div>
              <div
                className={`mt-2 text-right text-xs ${
                  isMine ? "text-white/60" : "text-[var(--text-muted)]"
                }`}
              >
                {new Intl.DateTimeFormat("en-AU", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "numeric",
                  month: "short",
                }).format(new Date(message.createdAt))}
              </div>
            </div>
          );
        })
      )}
      <div ref={messagesEndRef} />
    </div>
  );
}

