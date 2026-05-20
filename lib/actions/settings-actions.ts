"use server"

import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import { hasExternalEmailDeliveryConfig, sendExternalEmail } from "@/lib/email-delivery"
import prisma from "@/lib/prisma"
import { createNotificationForUser } from "@/lib/notifications"
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  type SettingsNotification,
  type SettingsNotificationPreferences,
  type SettingsPageData,
  type SettingsProfile,
  type SettingsReminderLeadTime,
  type SettingsReminderSummary,
  type SettingsReminderTask,
} from "@/lib/settings"
import {
  deletePushSubscription,
  getPublicVapidKey,
  hasWebPushConfig,
  sendPushNotificationToUserSubscriptions,
  type PushSubscriptionInput,
  upsertPushSubscription,
} from "@/lib/push"
import { createSession, requireSession } from "@/lib/auth"
import { SESSION_COOKIE_NAME } from "@/lib/session"

const ACTIVE_TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW"] as const
const REMINDER_LEAD_TIME_VALUES: SettingsReminderLeadTime[] = ["15m", "1h", "1d", "3d"]
const MANAGED_AUTH_COOKIE_NAMES = [
  SESSION_COOKIE_NAME,
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.pkce.code_verifier",
  "__Secure-authjs.pkce.code_verifier",
  "authjs.state",
  "__Secure-authjs.state",
  "authjs.nonce",
  "__Secure-authjs.nonce",
] as const

function normalizeProfile(user: {
  id: string
  email: string
  name: string | null
  role: "ADMIN" | "USER" | "GUEST"
  avatar: string | null
  title: string | null
  timezone: string | null
  createdAt?: Date | null
}): SettingsProfile {
  return {
    id: user.id,
    email: user.email,
    name: user.name ?? user.email.split("@")[0] ?? "User",
    role: user.role,
    avatar: user.avatar,
    title: user.title,
    timezone: user.timezone,
    joinedAt: user.createdAt?.toISOString() ?? null,
  }
}

function cleanString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeReminderLeadTime(value: string | null | undefined): SettingsReminderLeadTime {
  return REMINDER_LEAD_TIME_VALUES.includes(value as SettingsReminderLeadTime)
    ? (value as SettingsReminderLeadTime)
    : DEFAULT_NOTIFICATION_PREFERENCES.reminderLeadTime
}

function normalizeNotificationPreferences(input: Partial<SettingsNotificationPreferences>): SettingsNotificationPreferences {
  return {
    email: input.email ?? DEFAULT_NOTIFICATION_PREFERENCES.email,
    push: input.push ?? DEFAULT_NOTIFICATION_PREFERENCES.push,
    taskReminders: input.taskReminders ?? DEFAULT_NOTIFICATION_PREFERENCES.taskReminders,
    teamUpdates: input.teamUpdates ?? DEFAULT_NOTIFICATION_PREFERENCES.teamUpdates,
    dailyDigest: input.dailyDigest ?? DEFAULT_NOTIFICATION_PREFERENCES.dailyDigest,
    overdueEscalation: input.overdueEscalation ?? DEFAULT_NOTIFICATION_PREFERENCES.overdueEscalation,
    quietHours: input.quietHours ?? DEFAULT_NOTIFICATION_PREFERENCES.quietHours,
    reminderLeadTime: normalizeReminderLeadTime(input.reminderLeadTime),
  }
}

function preferencesFromRecord(record: {
  emailEnabled: boolean
  pushEnabled: boolean
  taskRemindersEnabled: boolean
  teamUpdatesEnabled: boolean
  dailyDigestEnabled: boolean
  overdueEscalationEnabled: boolean
  quietHoursEnabled: boolean
  reminderLeadTime: string
}): SettingsNotificationPreferences {
  return normalizeNotificationPreferences({
    email: record.emailEnabled,
    push: record.pushEnabled,
    taskReminders: record.taskRemindersEnabled,
    teamUpdates: record.teamUpdatesEnabled,
    dailyDigest: record.dailyDigestEnabled,
    overdueEscalation: record.overdueEscalationEnabled,
    quietHours: record.quietHoursEnabled,
    reminderLeadTime: normalizeReminderLeadTime(record.reminderLeadTime),
  })
}

function preferencesToRecord(preferences: SettingsNotificationPreferences) {
  const normalized = normalizeNotificationPreferences(preferences)

  return {
    emailEnabled: normalized.email,
    pushEnabled: normalized.push,
    taskRemindersEnabled: normalized.taskReminders,
    teamUpdatesEnabled: normalized.teamUpdates,
    dailyDigestEnabled: normalized.dailyDigest,
    overdueEscalationEnabled: normalized.overdueEscalation,
    quietHoursEnabled: normalized.quietHours,
    reminderLeadTime: normalized.reminderLeadTime,
  }
}

async function getOrCreateNotificationPreference(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      ...preferencesToRecord(DEFAULT_NOTIFICATION_PREFERENCES),
    },
    select: {
      emailEnabled: true,
      pushEnabled: true,
      taskRemindersEnabled: true,
      teamUpdatesEnabled: true,
      dailyDigestEnabled: true,
      overdueEscalationEnabled: true,
      quietHoursEnabled: true,
      reminderLeadTime: true,
    },
  })
}

export async function getSettingsPageData(): Promise<SettingsPageData> {
  const session = await requireSession()

  const now = new Date()
  const sevenDaysFromNow = new Date(now)
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)

  const fallbackProfile: SettingsProfile = {
    id: session.id,
    email: session.email,
    name: session.name ?? session.email.split("@")[0] ?? "User",
    role: session.role,
    avatar: null,
    title: null,
    timezone: "UTC",
    joinedAt: null,
  }

  try {
    const [user, preferences, notifications, unreadNotifications, reminderTasks, activeAssigned, dueSoon, overdue] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: session.id },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            avatar: true,
            title: true,
            timezone: true,
            createdAt: true,
          },
        }),
        getOrCreateNotificationPreference(session.id),
        prisma.notification.findMany({
          where: { userId: session.id },
          orderBy: { createdAt: "desc" },
          take: 6,
          select: {
            id: true,
            title: true,
            message: true,
            type: true,
            read: true,
            link: true,
            createdAt: true,
          },
        }),
        prisma.notification.count({
          where: { userId: session.id, read: false },
        }),
        prisma.task.findMany({
          where: {
            assigneeId: session.id,
            status: { in: [...ACTIVE_TASK_STATUSES] },
          },
          orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
          take: 5,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            project: {
              select: {
                name: true,
                color: true,
              },
            },
          },
        }),
        prisma.task.count({
          where: {
            assigneeId: session.id,
            status: { in: [...ACTIVE_TASK_STATUSES] },
          },
        }),
        prisma.task.count({
          where: {
            assigneeId: session.id,
            status: { in: [...ACTIVE_TASK_STATUSES] },
            dueDate: {
              gte: now,
              lte: sevenDaysFromNow,
            },
          },
        }),
        prisma.task.count({
          where: {
            assigneeId: session.id,
            status: { in: [...ACTIVE_TASK_STATUSES] },
            dueDate: { lt: now },
          },
        }),
      ])

    return {
      profile: user ? normalizeProfile(user) : fallbackProfile,
      preferences: preferencesFromRecord(preferences),
      notifications: notifications.map((notification) => ({
        ...notification,
        createdAt: notification.createdAt.toISOString(),
      })),
      unreadNotifications,
      reminderTasks: reminderTasks.map((task) => ({
        ...task,
        dueDate: task.dueDate?.toISOString() ?? null,
      })),
      reminderSummary: {
        activeAssigned,
        dueSoon,
        overdue,
      },
      externalEmailConfigured: hasExternalEmailDeliveryConfig(),
      pushDeliveryConfigured: hasWebPushConfig(),
      vapidPublicKey: getPublicVapidKey(),
    }
  } catch (error) {
    console.error("[settings] Failed to load settings page data:", error)
    return {
      profile: fallbackProfile,
      preferences: DEFAULT_NOTIFICATION_PREFERENCES,
      notifications: [],
      unreadNotifications: 0,
      reminderTasks: [],
      reminderSummary: {
        activeAssigned: 0,
        dueSoon: 0,
        overdue: 0,
      },
      externalEmailConfigured: hasExternalEmailDeliveryConfig(),
      pushDeliveryConfigured: hasWebPushConfig(),
      vapidPublicKey: getPublicVapidKey(),
    }
  }
}

export async function updateProfileAction(formData: FormData) {
  const session = await requireSession()

  const name = cleanString(formData.get("name"))
  const email = cleanString(formData.get("email")).toLowerCase()
  const title = cleanString(formData.get("title"))
  const timezone = cleanString(formData.get("timezone"))
  const avatar = cleanString(formData.get("avatar"))

  if (!name) {
    return { success: false, error: "Please enter your full name." }
  }

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Please enter a valid email address." }
  }

  if (avatar && !avatar.startsWith("/") && !/^https?:\/\//i.test(avatar)) {
    return { success: false, error: "Avatar must be a local path or a valid http(s) URL." }
  }

  const existingEmail = await prisma.user.findFirst({
    where: {
      email,
      NOT: { id: session.id },
    },
    select: { id: true },
  })

  if (existingEmail) {
    return { success: false, error: "That email is already used by another account." }
  }

  const updatedUser = await prisma.user.update({
    where: { id: session.id },
    data: {
      name,
      email,
      title: title || null,
      timezone: timezone || "UTC",
      avatar: avatar || null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatar: true,
      title: true,
      timezone: true,
      createdAt: true,
    },
  })

  await createSession({
    id: updatedUser.id,
    email: updatedUser.email,
    name: updatedUser.name ?? "User",
    role: updatedUser.role,
  })

  revalidatePath("/")
  revalidatePath("/profile")
  revalidatePath("/settings")

  return {
    success: true,
    profile: normalizeProfile(updatedUser),
  }
}

export async function saveNotificationPreferencesAction(preferences: SettingsNotificationPreferences) {
  const session = await requireSession()
  const nextPreferences = normalizeNotificationPreferences(preferences)

  const record = await prisma.notificationPreference.upsert({
    where: { userId: session.id },
    update: preferencesToRecord(nextPreferences),
    create: {
      userId: session.id,
      ...preferencesToRecord(nextPreferences),
    },
    select: {
      emailEnabled: true,
      pushEnabled: true,
      taskRemindersEnabled: true,
      teamUpdatesEnabled: true,
      dailyDigestEnabled: true,
      overdueEscalationEnabled: true,
      quietHoursEnabled: true,
      reminderLeadTime: true,
    },
  })

  revalidatePath("/settings")

  return {
    success: true,
    preferences: preferencesFromRecord(record),
  }
}

export async function savePushSubscriptionAction(subscription: PushSubscriptionInput) {
  const session = await requireSession()
  const result = await upsertPushSubscription(session.id, subscription)
  if (!result.success) return result

  revalidatePath("/settings")
  return { success: true }
}

export async function deletePushSubscriptionAction(endpoint: string) {
  const session = await requireSession()
  await deletePushSubscription(session.id, endpoint)
  revalidatePath("/settings")
  return { success: true }
}

export async function createTestReminderAction() {
  const session = await requireSession()
  const preferences = preferencesFromRecord(await getOrCreateNotificationPreference(session.id))

  if (!preferences.taskReminders) {
    return { success: false, error: "Task reminders are turned off for this account." }
  }

  const notification = await prisma.notification.create({
    data: {
      userId: session.id,
      title: "Test reminder triggered",
      message: `Reminder pipeline checked with ${preferences.reminderLeadTime} lead time.`,
      type: "info",
      link: "/settings",
    },
    select: {
      id: true,
      title: true,
      message: true,
      type: true,
      read: true,
      link: true,
      createdAt: true,
    },
  })

  let emailResult: Awaited<ReturnType<typeof sendExternalEmail>> = {
    success: false,
    skipped: true,
    error: "Email notifications are disabled for this account.",
  }

  if (preferences.email) {
    await prisma.internalEmail.create({
      data: {
        fromId: session.id,
        toId: session.id,
        subject: "Task reminder test",
        body: `Reminder pipeline checked with ${preferences.reminderLeadTime} lead time.`,
      },
    })

    emailResult = await sendExternalEmail({
      to: session.email,
      subject: "Task reminder test",
      text: `Reminder pipeline checked with ${preferences.reminderLeadTime} lead time.`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#09111f;color:#f8fafc;padding:24px;">
          <div style="max-width:640px;margin:0 auto;background:#121e37;border:1px solid rgba(0,212,255,0.2);border-radius:16px;padding:24px;">
            <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;color:#00d4ff;text-transform:uppercase;">Eckintosh Reminder Test</p>
            <h1 style="margin:0 0 12px;font-size:22px;color:#f8fafc;">Task reminder pipeline is live</h1>
            <p style="margin:0;font-size:14px;line-height:1.6;color:#cbd5e1;">Reminder pipeline checked with ${preferences.reminderLeadTime} lead time.</p>
          </div>
        </div>
      `,
    })
  }

  let pushResult: Awaited<ReturnType<typeof sendPushNotificationToUserSubscriptions>> = {
    success: false,
    sentCount: 0,
    error: "Push delivery is disabled for this account.",
  }

  if (preferences.push) {
    pushResult = await sendPushNotificationToUserSubscriptions(session.id, {
      title: "Eckintosh task reminder",
      body: "Reminder flow is live. Your deadlines will not sneak past the perimeter.",
      url: "/settings",
      tag: "settings-test-reminder",
    })
  }

  const unreadNotifications = await prisma.notification.count({
    where: { userId: session.id, read: false },
  })

  revalidatePath("/settings")

  return {
    success: true,
    notification: {
      ...notification,
      createdAt: notification.createdAt.toISOString(),
    },
    unreadNotifications,
    emailResult,
    pushResult,
  }
}

export async function markNotificationReadAction(notificationId: string, read: boolean) {
  const session = await requireSession()

  const notification = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId: session.id,
    },
    data: { read },
  })

  const unreadNotifications = await prisma.notification.count({
    where: { userId: session.id, read: false },
  })

  revalidatePath("/settings")

  return {
    success: notification.count > 0,
    unreadNotifications,
  }
}

export async function markAllNotificationsReadAction() {
  const session = await requireSession()

  await prisma.notification.updateMany({
    where: {
      userId: session.id,
      read: false,
    },
    data: { read: true },
  })

  revalidatePath("/settings")

  return {
    success: true,
    unreadNotifications: 0,
  }
}

export async function deleteOwnAccountAction() {
  const session = await requireSession()

  await prisma.user.delete({
    where: { id: session.id },
  })

  const cookieStore = await cookies()
  for (const name of MANAGED_AUTH_COOKIE_NAMES) {
    cookieStore.delete(name)
  }

  revalidatePath("/")
  revalidatePath("/login")

  return {
    success: true,
    redirectTo: "/login?account=deleted",
  }
}

export async function createSettingsTestNotificationAction() {
  const session = await requireSession()

  await createNotificationForUser(session.id, {
    channel: "system",
    title: "Notification center checked in",
    message: "The settings page generated an in-app notification successfully.",
    type: "success",
    link: "/settings",
    email: {
      senderId: session.id,
      subject: "Notification center check",
    },
  })

  revalidatePath("/settings")
  return { success: true }
}
