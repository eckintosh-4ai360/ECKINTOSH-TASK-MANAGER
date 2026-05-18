import prisma from "@/lib/prisma"

export type NotificationChannel = "teamUpdates" | "taskReminders" | "system"

type PreferenceField = "emailEnabled" | "teamUpdatesEnabled" | "taskRemindersEnabled"

type NotificationPayload = {
  title: string
  message: string
  type?: string
  link?: string | null
}

type NotificationEmailInput = {
  senderId: string
  subject?: string
  body?: string
}

type CreateNotificationsInput = NotificationPayload & {
  userIds: string[]
  channel?: NotificationChannel
  email?: NotificationEmailInput | null
}

const CHANNEL_PREFERENCE_FIELD: Partial<Record<NotificationChannel, PreferenceField>> = {
  teamUpdates: "teamUpdatesEnabled",
  taskReminders: "taskRemindersEnabled",
}

async function filterRecipientsByPreference(userIds: string[], preferenceField?: PreferenceField) {
  if (!preferenceField || userIds.length === 0) return userIds

  const preferences = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      emailEnabled: true,
      teamUpdatesEnabled: true,
      taskRemindersEnabled: true,
    },
  })

  const preferenceMap = new Map(preferences.map((preference) => [preference.userId, preference]))

  return userIds.filter((userId) => {
    const preference = preferenceMap.get(userId)
    return preference ? Boolean(preference[preferenceField]) : true
  })
}

export async function getWorkspaceRecipientIds(excludeUserId?: string) {
  const users = await prisma.user.findMany({
    where: excludeUserId ? { id: { not: excludeUserId } } : undefined,
    select: { id: true },
  })

  return users.map((user) => user.id)
}

export async function createNotificationsForUsers({
  userIds,
  channel = "system",
  title,
  message,
  type = "info",
  link = null,
  email = null,
}: CreateNotificationsInput) {
  const eligibleUserIds = await filterRecipientsByPreference(userIds, CHANNEL_PREFERENCE_FIELD[channel])
  if (eligibleUserIds.length === 0) return 0

  const result = await prisma.notification.createMany({
    data: eligibleUserIds.map((userId) => ({
      userId,
      title,
      message,
      type,
      link,
    })),
  })

  if (email) {
    const emailRecipientIds = await filterRecipientsByPreference(eligibleUserIds, "emailEnabled")
    if (emailRecipientIds.length > 0) {
      await prisma.internalEmail.createMany({
        data: emailRecipientIds.map((userId) => ({
          fromId: email.senderId,
          toId: userId,
          subject: email.subject ?? title,
          body: email.body ?? message,
        })),
      })
    }
  }

  return result.count
}

export async function createNotificationForUser(
  userId: string,
  payload: NotificationPayload & { channel?: NotificationChannel; email?: NotificationEmailInput | null },
) {
  const count = await createNotificationsForUsers({
    userIds: [userId],
    ...payload,
  })

  return count > 0
}
