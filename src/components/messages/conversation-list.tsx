import Link from "next/link";

type ConversationListItem = {
  id: string;
  otherUserName: string;
  lastMessageBody: string | null;
  lastMessageSenderName: string | null;
  lastMessageCreatedAt: string;
  unreadCount: number;
};

type ConversationListProps = {
  conversations: ConversationListItem[];
};

const trimMessage = (message: string) =>
  message.length > 80 ? `${message.slice(0, 80)}...` : message;

export function ConversationList({ conversations }: ConversationListProps) {
  if (conversations.length === 0) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-10 text-center shadow-sm">
        <h2 className="text-xl font-semibold text-[var(--text)]">No conversations yet</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-muted)]">
          Start a conversation by messaging a creator from a resource or store page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {conversations.map((conversation) => (
        <Link
          key={conversation.id}
          href={`/messages/${conversation.id}`}
          className="block rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 transition hover:border-[var(--border-strong)] hover:bg-[var(--surface-alt)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-base font-semibold text-[var(--text)]">
                <span>{conversation.otherUserName}</span>
                {conversation.unreadCount > 0 ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">
                    {conversation.unreadCount} new
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-sm text-[var(--text-muted)]">
                {conversation.lastMessageBody
                  ? `${conversation.lastMessageSenderName || "Someone"}: ${trimMessage(
                      conversation.lastMessageBody
                    )}`
                  : "No messages yet."}
              </p>
            </div>

            <div className="shrink-0 text-xs text-[var(--text-light)]">
              {new Intl.DateTimeFormat("en-AU", {
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date(conversation.lastMessageCreatedAt))}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
