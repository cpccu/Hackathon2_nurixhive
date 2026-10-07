import type { NotificationType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const INSERT_CHUNK = 1000;

export interface NotificationInput {
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}

/** Creates the same in-app notification for many users, in chunks of 1000 rows. */
export async function notifyUsers(userIds: readonly string[], notification: NotificationInput): Promise<number> {
  const unique = [...new Set(userIds)];
  for (let offset = 0; offset < unique.length; offset += INSERT_CHUNK) {
    await prisma.notification.createMany({
      data: unique.slice(offset, offset + INSERT_CHUNK).map((userId) => ({ userId, ...notification })),
    });
  }
  return unique.length;
}
