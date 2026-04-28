import Link from"next/link";
import { notFound } from"next/navigation";
import { auth } from"@/lib/auth";
import { requireVerifiedEmailOrRedirect } from"@/lib/require-email-verification";
import { findConversationForUser } from"@/server/actions/message-actions";
import MessageThread from"@/components/messages/message-thread";
import MessageComposer from"@/components/messages/message-composer";

type ConversationPageProps = {
  params: Promise<{
    conversationId: string;
  }>;
};

export default async function ConversationPage({ params }: ConversationPageProps) {
  const { conversationId } = await params;
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    return notFound();
  }

  await requireVerifiedEmailOrRedirect(userId, `/messages/${conversationId}`);

  const conversation = await findConversationForUser(conversationId, userId);
  if (!conversation) {
    return notFound();
  }

  const otherParticipant = conversation.participants.find(
    (participant) => participant.user.id !== userId
  );

  if (!otherParticipant) {
    return notFound();
  }

  const otherName = otherParticipant.user.name ?? otherParticipant.user.email;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link
          href="/messages"
          className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
        >
          ← Back to inbox
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text)]">
          {otherName}
        </h1>
      </div>

      <div className="overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <MessageThread
          conversationId={conversation.id}
          currentUserId={userId}
          otherUserName={otherName}
          messages={conversation.messages.map((message) => ({
            id: message.id,
            body: message.body,
            createdAt: message.createdAt.toISOString(),
            senderId: message.sender.id,
            senderName: message.sender.name,
          }))}
        />
        <div className="border-t border-[var(--border)] bg-[var(--card)] px-5 py-4">
          <MessageComposer conversationId={conversation.id} />
        </div>
      </div>
    </div>
  );
}
