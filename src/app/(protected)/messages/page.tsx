import Link from"next/link";
import { auth } from"@/lib/auth";
import { requireVerifiedEmailOrRedirect } from"@/lib/require-email-verification";
import { db } from"@/lib/db";
import { findUserConversations } from"@/server/actions/message-actions";
import { ConversationList } from"@/components/messages/conversation-list";

export default async function MessagesPage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-[var(--text)]">Messages</h1>
          <p className="mt-4 text-sm text-[var(--text-muted)]">
            Please log in to view your conversations.
          </p>
          <div className="mt-6">
            <Link
              href="/login?redirectTo=/messages"
              className="inline-flex items-center rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] hover:text-white"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  await requireVerifiedEmailOrRedirect(userId,"/messages");

  const conversations = await findUserConversations(userId);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="card-panel mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--text-light)]">Inbox</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[var(--text)]">Your conversations</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Continue a conversation with a creator or start a new thread from a resource or store page.
          </p>
        </div>

        <Link
          href="/resources"
          className="inline-flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-2.5 text-sm font-semibold text-[var(--text)] transition hover:bg-[var(--surface-alt)]"
        >
          Browse resources
        </Link>
      </div>

      <ConversationList
        conversations={conversations.map((conversation) => ({
          id: conversation.id,
          otherUserName: conversation.otherUser.name ?? conversation.otherUser.email ??"Unknown User",
          lastMessageBody: conversation.lastMessage?.body ?? null,
          lastMessageSenderName: conversation.lastMessage?.senderName ?? null,
          lastMessageCreatedAt: conversation.lastMessage?.createdAt.toISOString() ?? conversation.updatedAt.toISOString(),
          unreadCount: conversation.unreadCount,
        }))}
      />
    </div>
  );
}
