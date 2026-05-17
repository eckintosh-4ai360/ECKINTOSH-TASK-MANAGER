"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

type SprintInput = {
  name: string
  goal?: string
  projectId: string
  status?: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  startDate?: string
  endDate?: string
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

export async function createSprint(input: SprintInput) {
  if (!input.name.trim() || !input.projectId) {
    return { success: false, error: "Sprint name and project are required" }
  }

  const sprint = await prisma.sprint.create({
    data: {
      name: input.name.trim(),
      goal: input.goal?.trim() || null,
      projectId: input.projectId,
      status: input.status ?? "PLANNING",
      startDate: input.startDate ? new Date(input.startDate) : null,
      endDate: input.endDate ? new Date(input.endDate) : null,
    },
  })

  revalidatePath("/")
  revalidatePath("/sprints")
  return { success: true, sprint }
}
