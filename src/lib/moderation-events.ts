import { db } from "@/lib/db";
import { ModerationActionType, ModerationTargetType } from "@prisma/client";

type ModerationEventInput = {
  targetType: ModerationTargetType;
  targetId: string;
  action: ModerationActionType;
  message?: string | null;
  actorUserId?: string | null;
};

// Persists a lightweight audit trail for automated and admin moderation decisions.
export async function logModerationEvent(input: ModerationEventInput) {
  await db.moderationEvent.create({
    data: {
      targetType: input.targetType,
      targetId: input.targetId,
      action: input.action,
      message: input.message || null,
      actorUserId: input.actorUserId || null,
    },
  });
}
