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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/messages"
            className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)]"
          >
            ← Back to inbox
          </Link>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
            {otherParticipant.user.name ?? otherParticipant.user.email}
          </h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">
            Conversation with {otherParticipant.user.name ?? otherParticipant.user.email}.
          </p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[1.3fr_0.7fr]">
        <MessageThread
          conversationId={conversation.id}
          currentUserId={userId}
          otherUserName={otherParticipant.user.name ?? otherParticipant.user.email}
          messages={conversation.messages.map((message) => ({
            id: message.id,
            body: message.body,
            createdAt: message.createdAt.toISOString(),
            senderId: message.sender.id,
            senderName: message.sender.name,
          }))}
        />

        <div className="card-section space-y-4">
          <div>
            <p className="text-sm font-semibold text-[var(--text)]">Message creator</p>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Send a new message and keep the conversation in one place.
            </p>
          </div>
          <MessageComposer conversationId={conversation.id} />
        </div>
      </div>
    </div>
  );
}
