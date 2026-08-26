"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { createNotificationsForUsers, getWorkspaceRecipientIds } from "@/lib/notifications"
import { canManageStandup, getPermissionError, hasPermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { validateInput, createStandupSchema } from "@/lib/validation"

type StandupInput = {
  didYesterday: string
  doingToday: string
  blockers?: string
  mood: number
  projectId?: string
}

function getInitials(name: string) {
  return name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

function serializeStandup(standup: {
  id: string
  userId: string
  projectId: string | null
  didYesterday: string
  doingToday: string
  blockers: string | null
  mood: number
  date: Date
  createdAt: Date
  user: { name: string | null; email: string; title: string | null }
  project: { name: string; color: string } | null
}) {
  const name = standup.user.name ?? standup.user.email

  return {
    id: standup.id,
    userId: standup.userId,
    projectId: standup.projectId,
    user: name,
    initials: getInitials(name),
    role: standup.user.title ?? "Team member",
    color: standup.project?.color ?? "#00d4ff",
    project: standup.project?.name ?? "General",
    didYesterday: standup.didYesterday,
    doingToday: standup.doingToday,
    blockers: standup.blockers,
    mood: standup.mood,
    date: standup.date.toISOString(),
    createdAt: standup.createdAt.toISOString(),
  }
}

export type StandupItem = ReturnType<typeof serializeStandup>

export async function getStandups() {
  await requireSession()
  const standups = await prisma.standup.findMany({
    include: {
      user: { select: { name: true, email: true, title: true } },
      project: { select: { name: true, color: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  })

  return standups.map(serializeStandup)
}

export async function createStandup(input: StandupInput) {
  const session = await requireSession()
  if (!hasPermission(session.role, "post_standups")) {
    return { success: false, error: getPermissionError("post_standups") }
  }

  const parsed = validateInput(createStandupSchema, input)
  if (!parsed.success) return { success: false, error: parsed.error }
  const validated = parsed.data

  const standup = await prisma.standup.create({
    data: {
      userId: session.id,
      projectId: validated.projectId || null,
      didYesterday: validated.didYesterday,
      doingToday: validated.doingToday,
      blockers: validated.blockers || null,
      mood: validated.mood,
    },
    select: {
      id: true,
      project: { select: { name: true } },
    },
  })

  const recipients = await getWorkspaceRecipientIds(session.id)
  await createNotificationsForUsers({
    userIds: recipients,
    channel: "teamUpdates",
    title: "New standup posted",
    message: `${session.name} posted a standup${standup.project?.name ? ` for ${standup.project.name}` : ""}.`,
    type: "info",
    link: "/standups",
    email: {
      senderId: session.id,
      subject: `Standup posted${standup.project?.name ? `: ${standup.project.name}` : ""}`,
    },
  })

  revalidatePath("/")
  revalidatePath("/standups")
  return { success: true }
}

export async function updateStandup(standupId: string, input: StandupInput) {
  const session = await requireSession()
  const standup = await prisma.standup.findUnique({
    where: { id: standupId },
    select: { userId: true },
  })

  if (!standup) {
    return { success: false, error: "Standup not found" }
  }

  if (!canManageStandup(session, standup.userId)) {
    return { success: false, error: "You can only edit your own standups." }
  }

  const mood = Math.max(1, Math.min(5, Number(input.mood) || 3))

  const updatedStandup = await prisma.standup.update({
    where: { id: standupId },
    data: {
      projectId: input.projectId || null,
      didYesterday: input.didYesterday.trim(),
      doingToday: input.doingToday.trim(),
      blockers: input.blockers?.trim() || null,
      mood,
    },
    select: {
      id: true,
      project: { select: { name: true } },
    },
  })

  const recipients = await getWorkspaceRecipientIds(session.id)
  await createNotificationsForUsers({
    userIds: recipients,
    channel: "teamUpdates",
    title: "Standup updated",
    message: `${session.name} updated a standup${updatedStandup.project?.name ? ` for ${updatedStandup.project.name}` : ""}.`,
    type: "info",
    link: "/standups",
    email: {
      senderId: session.id,
      subject: `Standup updated${updatedStandup.project?.name ? `: ${updatedStandup.project.name}` : ""}`,
    },
  })

  revalidatePath("/")
  revalidatePath("/standups")
  return { success: true }
}

export async function deleteStandup(standupId: string) {
  const session = await requireSession()
  const standup = await prisma.standup.findUnique({
    where: { id: standupId },
    select: { userId: true },
  })

  if (!standup) {
    return { success: false, error: "Standup not found" }
  }

  if (!canManageStandup(session, standup.userId)) {
    return { success: false, error: "You can only delete your own standups." }
  }

  await prisma.standup.delete({
    where: { id: standupId },
  })

  const recipients = await getWorkspaceRecipientIds(session.id)
  await createNotificationsForUsers({
    userIds: recipients,
    channel: "teamUpdates",
    title: "Standup removed",
    message: `${session.name} deleted a standup update.`,
    type: "warning",
    link: "/standups",
    email: {
      senderId: session.id,
      subject: "Standup removed",
    },
  })

  revalidatePath("/")
  revalidatePath("/standups")
  return { success: true }
}
