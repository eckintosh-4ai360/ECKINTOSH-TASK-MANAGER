"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { createNotificationsForUsers, getWorkspaceRecipientIds } from "@/lib/notifications"
import { getPermissionError, hasPermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { validateInput, createSprintSchema } from "@/lib/validation"

type SprintInput = {
  name: string
  goal?: string
  projectId: string
  status?: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  startDate?: string
  endDate?: string
}

export type SprintOption = {
  id: string
  name: string
  projectId: string
  status: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
}

function serializeSprint(sprint: {
  id: string
  name: string
  goal: string | null
  status: string
  startDate: Date | null
  endDate: Date | null
  createdAt: Date
  project: { id: string; name: string; color: string }
  tasks: Array<{
    id: string
    title: string
    status: string
    priority: string
    assignee: { name: string | null; email: string } | null
  }>
}) {
  const tasks = sprint.tasks.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    assignee: task.assignee
      ? {
          name: task.assignee.name ?? task.assignee.email,
          initials: getInitials(task.assignee.name ?? task.assignee.email),
        }
      : null,
  }))

  return {
    id: sprint.id,
    name: sprint.name,
    goal: sprint.goal,
    status: sprint.status,
    startDate: sprint.startDate?.toISOString() ?? null,
    endDate: sprint.endDate?.toISOString() ?? null,
    createdAt: sprint.createdAt.toISOString(),
    project: sprint.project,
    tasks,
    stats: {
      total: tasks.length,
      done: tasks.filter((task) => task.status === "COMPLETED").length,
      inProgress: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      review: tasks.filter((task) => task.status === "IN_REVIEW").length,
      blocked: tasks.filter((task) => task.priority === "critical" && task.status !== "COMPLETED").length,
    },
  }
}

function getInitials(value: string) {
  return value
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export type SprintBoardItem = ReturnType<typeof serializeSprint>

export async function getSprints() {
  await requireSession()
  const sprints = await prisma.sprint.findMany({
    include: {
      project: { select: { id: true, name: true, color: true } },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          assignee: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  })

  return sprints.map(serializeSprint)
}

export async function getSprintOptions(): Promise<SprintOption[]> {
  await requireSession()

  const sprints = await prisma.sprint.findMany({
    select: {
      id: true,
      name: true,
      projectId: true,
      status: true,
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  })

  return sprints as SprintOption[]
}

export async function createSprint(input: SprintInput) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_sprints")) {
    return { success: false, error: getPermissionError("manage_sprints") }
  }

  const parsed = validateInput(createSprintSchema, input)
  if (!parsed.success) return { success: false, error: parsed.error }
  const validated = parsed.data

  const sprint = await prisma.sprint.create({
    data: {
      name: validated.name,
      goal: validated.goal || null,
      projectId: validated.projectId,
      status: validated.status ?? "PLANNING",
      startDate: validated.startDate ? new Date(validated.startDate) : null,
      endDate: validated.endDate ? new Date(validated.endDate) : null,
    },
    select: {
      id: true,
      name: true,
    },
  })

  const recipients = await getWorkspaceRecipientIds(session.id)
  await createNotificationsForUsers({
    userIds: recipients,
    channel: "teamUpdates",
    title: "Sprint created",
    message: `${session.name} created ${sprint.name}.`,
    type: "info",
    link: "/sprints",
    email: {
      senderId: session.id,
      subject: `Sprint created: ${sprint.name}`,
    },
  })

  revalidatePath("/")
  revalidatePath("/sprints")
  return { success: true, sprint }
}

export async function updateSprint(input: SprintInput & { id: string }) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_sprints")) {
    return { success: false, error: getPermissionError("manage_sprints") }
  }

  if (!input.name.trim() || !input.projectId) {
    return { success: false, error: "Sprint name and project are required" }
  }

  const sprint = await prisma.sprint.update({
    where: { id: input.id },
    data: {
      name: input.name.trim(),
      goal: input.goal?.trim() || null,
      projectId: input.projectId,
      status: input.status ?? "PLANNING",
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
    select: {
      id: true,
      name: true,
    },
  })

  const recipients = await getWorkspaceRecipientIds(session.id)
  await createNotificationsForUsers({
    userIds: recipients,
    channel: "teamUpdates",
    title: "Sprint updated",
    message: `${session.name} updated ${sprint.name}.`,
    type: "info",
    link: "/sprints",
    email: {
      senderId: session.id,
      subject: `Sprint updated: ${sprint.name}`,
    },
  })

  revalidatePath("/")
  revalidatePath("/sprints")
  revalidatePath("/tasks")

  return { success: true, sprint }
}

export async function deleteSprint(sprintId: string) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_sprints")) {
    return { success: false, error: getPermissionError("manage_sprints") }
  }

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    select: { name: true },
  })

  await prisma.sprint.delete({
    where: { id: sprintId },
  })

  const recipients = await getWorkspaceRecipientIds(session.id)
  await createNotificationsForUsers({
    userIds: recipients,
    channel: "teamUpdates",
    title: "Sprint removed",
    message: `${session.name} deleted ${sprint?.name ?? "a sprint"}.`,
    type: "warning",
    link: "/sprints",
    email: {
      senderId: session.id,
      subject: `Sprint removed: ${sprint?.name ?? "Sprint"}`,
    },
  })

  revalidatePath("/")
  revalidatePath("/sprints")
  revalidatePath("/tasks")

  return { success: true }
}
