import { db } from "@/lib/db";

export type ConversationSummary = {
  id: string;
  updatedAt: Date;
  otherUser: {
    id: string;
    name: string | null;
    email: string;
  };
  lastMessage: {
    id: string;
    body: string;
    createdAt: Date;
    senderId: string;
    senderName: string | null;
  } | null;
  unreadCount: number;
};

export type ConversationDetail = {
  id: string;
  updatedAt: Date;
  participants: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
    lastReadAt: Date | null;
  }[];
  messages: {
    id: string;
    body: string;
    createdAt: Date;
    sender: {
      id: string;
      name: string | null;
      email: string;
    };
  }[];
};

export async function getOrCreateConversation(
  participantAId: string,
  participantBId: string
) {
  if (participantAId === participantBId) {
    throw new Error("Cannot create a conversation with the same user.");
  }

  const existing = await db.conversation.findFirst({
    where: {
      AND: [
        { participants: { some: { userId: participantAId } } },
        { participants: { some: { userId: participantBId } } },
      ],
    },
  });

  if (existing) {
    return existing;
  }

  return db.conversation.create({
    data: {
      participants: {
        create: [
          { userId: participantAId },
          { userId: participantBId },
        ],
      },
    },
  });
}

export async function findConversationForUser(
  conversationId: string,
  userId: string
): Promise<ConversationDetail | null> {
  const conversation = await db.conversation.findFirst({
    where: {
      id: conversationId,
      participants: {
        some: {
          userId,
        },
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  return {
    id: conversation.id,
    updatedAt: conversation.updatedAt,
    participants: conversation.participants.map((participant) => ({
      id: participant.id,
      lastReadAt: participant.lastReadAt,
      user: participant.user,
    })),
    messages: conversation.messages.map((message) => ({
      id: message.id,
      body: message.body,
      createdAt: message.createdAt,
      sender: {
        id: message.sender.id,
        name: message.sender.name,
        email: message.sender.email,
      },
    })),
  };
}

export async function findUserConversations(userId: string) {
  const conversations = await db.conversation.findMany({
    where: {
      participants: {
        some: {
          userId,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  return Promise.all(
    conversations.map(async (conversation) => {
      const participant = conversation.participants.find((item) => item.userId === userId);
      if (!participant) {
        return null;
      }

      const unreadCount = await db.message.count({
        where: {
          conversationId: conversation.id,
          senderId: {
            not: userId,
          },
          createdAt: {
            gt: participant.lastReadAt ?? new Date(0),
          },
        },
      });

      const otherParticipant = conversation.participants.find(
        (item) => item.userId !== userId
      );

      return {
        id: conversation.id,
        updatedAt: conversation.updatedAt,
        otherUser: {
          id: otherParticipant?.user.id ?? "",
          name: otherParticipant?.user.name ?? null,
          email: otherParticipant?.user.email,
        },
        lastMessage:
          conversation.messages.length > 0
            ? {
                id: conversation.messages[0].id,
                body: conversation.messages[0].body,
                createdAt: conversation.messages[0].createdAt,
                senderId: conversation.messages[0].sender.id,
                senderName: conversation.messages[0].sender.name,
              }
            : null,
        unreadCount,
      };
    })
  ).then((items) => items.filter((item): item is NonNullable<typeof item> => Boolean(item)));
}

export async function createMessage(
  conversationId: string,
  senderId: string,
  body: string
) {
  return db.conversation.update({
    where: { id: conversationId },
    data: {
      messages: {
        create: {
          senderId,
          body,
        },
      },
    },
    include: {
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });
}

export async function markConversationRead(conversationId: string, userId: string) {
  return db.conversationParticipant.updateMany({
    where: {
      conversationId,
      userId,
    },
    data: {
      lastReadAt: new Date(),
    },
  });
}

export async function getUnreadConversationCount(userId: string) {
  const participation = await db.conversationParticipant.findMany({
    where: {
      userId,
    },
    select: {
      conversationId: true,
      lastReadAt: true,
    },
  });

  if (participation.length === 0) {
    return 0;
  }

  const unreadCounts = await Promise.all(
    participation.map((item) =>
      db.message.count({
        where: {
          conversationId: item.conversationId,
          senderId: {
            not: userId,
          },
          createdAt: {
            gt: item.lastReadAt ?? new Date(0),
          },
        },
      })
    )
  );

  return unreadCounts.reduce((count, unreadCount) => count + unreadCount, 0);
}
