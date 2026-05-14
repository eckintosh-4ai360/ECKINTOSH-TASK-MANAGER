"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { createSession, requireSession } from "@/lib/auth"

const ACTIVE_TASK_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW"] as const

export type SettingsProfile = {
  id: string
  email: string
  name: string
  role: "ADMIN" | "USER" | "GUEST"
  avatar: string | null
  title: string | null
  timezone: string | null
  joinedAt: string | null
}

export type SettingsNotification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  createdAt: string
}

export type SettingsReminderTask = {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  project: {
    name: string
    color: string
  } | null
}

export type SettingsReminderSummary = {
  activeAssigned: number
  dueSoon: number
  overdue: number
}

export type SettingsPageData = {
  profile: SettingsProfile
  notifications: SettingsNotification[]
  unreadNotifications: number
  reminderTasks: SettingsReminderTask[]
  reminderSummary: SettingsReminderSummary
}

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
    const [user, notifications, unreadNotifications, reminderTasks, activeAssigned, dueSoon, overdue] =
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
        prisma.notification.findMany({
          where: { userId: session.id },
          orderBy: { createdAt: "desc" },
          take: 4,
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
    }
  } catch (error) {
    console.error("[settings] Failed to load settings page data:", error)
    return {
      profile: fallbackProfile,
      notifications: [],
      unreadNotifications: 0,
      reminderTasks: [],
      reminderSummary: {
        activeAssigned: 0,
        dueSoon: 0,
        overdue: 0,
      },
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
  revalidatePath("/settings")

  return {
    success: true,
    profile: normalizeProfile(updatedUser),
  }
}
