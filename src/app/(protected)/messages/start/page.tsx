import { redirect } from"next/navigation";
import { auth } from"@/lib/auth";
import { db } from"@/lib/db";
import { requireVerifiedEmailOrRedirect } from"@/lib/require-email-verification";
import { getOrCreateConversation } from"@/server/actions/message-actions";

type StartConversationPageProps = {
  searchParams: Promise<{
    creatorId?: string;
  }>;
};

export default async function StartConversationPage({ searchParams }: StartConversationPageProps) {
  const { creatorId } = await searchParams;
  const session = await auth();
  const userId = session?.user?.id;

  if (!creatorId) {
    redirect("/messages");
  }

  if (!userId) {
    const redirectTo = encodeURIComponent(`/messages/start?creatorId=${creatorId}`);
    redirect(`/login?redirectTo=${redirectTo}`);
  }

  await requireVerifiedEmailOrRedirect(userId, `/messages/start?creatorId=${creatorId}`);

  if (creatorId === userId) {
    redirect("/messages");
  }

  const creator = await db.user.findUnique({
    where: { id: creatorId },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  if (!creator) {
    redirect("/messages");
  }

  const conversation = await getOrCreateConversation(userId, creatorId);
  redirect(`/messages/${conversation.id}`);
}
