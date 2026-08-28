import { sendExternalEmail } from "@/lib/email-delivery"
import prisma from "@/lib/prisma"
import { sendPushNotificationToUserSubscriptions } from "@/lib/push"

export type NotificationChannel = "teamUpdates" | "taskReminders" | "system"

type PreferenceField = "emailEnabled" | "teamUpdatesEnabled" | "taskRemindersEnabled" | "pushEnabled"

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildNotificationEmailHtml({
  title,
  message,
  link,
}: {
  title: string
  message: string
  link?: string | null
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? process.env.APP_URL ?? ""
  const href = link
    ? link.startsWith("http")
      ? link
      : appUrl
        ? `${appUrl.replace(/\/$/, "")}${link.startsWith("/") ? link : `/${link}`}`
        : null
    : null

  return `
    <div style="font-family:Arial,sans-serif;background:#09111f;color:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#121e37;border:1px solid rgba(0,212,255,0.2);border-radius:16px;padding:24px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;color:#00d4ff;text-transform:uppercase;">Spagad Notification</p>
        <h1 style="margin:0 0 12px;font-size:22px;color:#f8fafc;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#cbd5e1;">${escapeHtml(message)}</p>
        ${href ? `<a href="${escapeHtml(href)}" style="display:inline-block;background:#00d4ff;color:#04111f;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:700;">Open workspace</a>` : ""}
      </div>
    </div>
  `
}

/**
 * @param defaultWhenMissing what to assume for a user with no preference row.
 *   Opt-out channels (email, team updates, task reminders) default to on, the
 *   same as the schema. Push defaults to off: it is opt-in, and a user who has
 *   never opened settings has no subscription to send to anyway.
 */
async function filterRecipientsByPreference(
  userIds: string[],
  preferenceField?: PreferenceField,
  defaultWhenMissing = true,
) {
  if (!preferenceField || userIds.length === 0) return userIds

  const preferences = await prisma.notificationPreference.findMany({
    where: { userId: { in: userIds } },
    select: {
      userId: true,
      emailEnabled: true,
      teamUpdatesEnabled: true,
      taskRemindersEnabled: true,
      pushEnabled: true,
    },
  })

  const preferenceMap = new Map(preferences.map((preference) => [preference.userId, preference]))

  return userIds.filter((userId) => {
    const preference = preferenceMap.get(userId)
    return preference ? Boolean(preference[preferenceField]) : defaultWhenMissing
  })
}

/**
 * Fans a notification out to every browser/phone the recipients have subscribed
 * from, for those who have push switched on.
 *
 * Best-effort by design: a push failure must never take down the in-app record
 * or the email, so everything here is caught and logged. Stale endpoints are
 * pruned inside lib/push.ts.
 */
async function deliverPushNotifications(
  userIds: string[],
  { title, message, link, channel }: { title: string; message: string; link?: string | null; channel: NotificationChannel },
) {
  try {
    const pushRecipientIds = await filterRecipientsByPreference(userIds, "pushEnabled", false)
    if (pushRecipientIds.length === 0) return

    // Tagging by destination lets a re-sent reminder for the same task replace
    // its predecessor on the lock screen instead of stacking up.
    const tag = link ? `spagad:${link}` : `spagad:${channel}`

    await Promise.allSettled(
      pushRecipientIds.map((userId) =>
        sendPushNotificationToUserSubscriptions(userId, {
          title,
          body: message,
          url: link ?? "/tasks",
          tag,
        }),
      ),
    )
  } catch (error) {
    console.error("[notifications] Push fan-out failed:", error)
  }
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

  await deliverPushNotifications(eligibleUserIds, { title, message, link, channel })

  if (email) {
    const emailRecipientIds = await filterRecipientsByPreference(eligibleUserIds, "emailEnabled")
    if (emailRecipientIds.length > 0) {
      try {
        // Verify the sender still exists before creating internal emails
        const senderExists = await prisma.user.findUnique({
          where: { id: email.senderId },
          select: { id: true },
        })

        if (senderExists) {
          await prisma.internalEmail.createMany({
            data: emailRecipientIds.map((userId) => ({
              fromId: email.senderId,
              toId: userId,
              subject: email.subject ?? title,
              body: email.body ?? message,
            })),
          })
        } else {
          console.warn("[notifications] Sender ID not found in DB — skipping internal emails:", email.senderId)
        }
      } catch (err) {
        console.error("[notifications] Failed to create internal emails:", err)
      }

      const recipients = await prisma.user.findMany({
        where: { id: { in: emailRecipientIds } },
        select: {
          email: true,
        },
      })

      await Promise.allSettled(
        recipients.map((recipient) =>
          sendExternalEmail({
            to: recipient.email,
            subject: email.subject ?? title,
            text: email.body ?? message,
            html: buildNotificationEmailHtml({
              title: email.subject ?? title,
              message: email.body ?? message,
              link,
            }),
          }),
        ),
      )
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
