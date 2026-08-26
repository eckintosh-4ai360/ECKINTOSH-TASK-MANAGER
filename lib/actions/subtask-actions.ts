"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { canUpdateTaskStatus, getPermissionError } from "@/lib/rbac"

const MAX_SUBTASK_TITLE_LENGTH = 200

async function requireSubtaskAccess(taskId: string) {
  const session = await requireSession()
  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { assigneeId: true } })

  if (!task) return { ok: false as const, error: "Task not found." }

  // Same rule as updating the task's own status: the assignee or an admin.
  if (!canUpdateTaskStatus(session, { assigneeId: task.assigneeId })) {
    return { ok: false as const, error: getPermissionError("update_assigned_task_status") }
  }

  return { ok: true as const, session }
}

export async function getSubtasks(taskId: string) {
  await requireSession()
  return prisma.subtask.findMany({
    where: { taskId },
    orderBy: { createdAt: "asc" },
  })
}

export async function addSubtask(taskId: string, title: string) {
  const guard = await requireSubtaskAccess(taskId)
  if (!guard.ok) return { success: false, error: guard.error }

  const trimmed = title.trim().slice(0, MAX_SUBTASK_TITLE_LENGTH)
  if (!trimmed) return { success: false, error: "Subtask title is required." }

  const subtask = await prisma.subtask.create({
    data: { taskId, title: trimmed },
  })

  revalidatePath("/tasks")
  return { success: true, subtask }
}

export async function toggleSubtask(id: string, completed: boolean) {
  const subtask = await prisma.subtask.findUnique({ where: { id }, select: { taskId: true } })
  if (!subtask) return { success: false, error: "Subtask not found." }

  const guard = await requireSubtaskAccess(subtask.taskId)
  if (!guard.ok) return { success: false, error: guard.error }

  await prisma.subtask.update({ where: { id }, data: { completed } })
  revalidatePath("/tasks")
  return { success: true }
}

export async function renameSubtask(id: string, title: string) {
  const subtask = await prisma.subtask.findUnique({ where: { id }, select: { taskId: true } })
  if (!subtask) return { success: false, error: "Subtask not found." }

  const guard = await requireSubtaskAccess(subtask.taskId)
  if (!guard.ok) return { success: false, error: guard.error }

  const trimmed = title.trim().slice(0, MAX_SUBTASK_TITLE_LENGTH)
  if (!trimmed) return { success: false, error: "Subtask title is required." }

  await prisma.subtask.update({ where: { id }, data: { title: trimmed } })
  revalidatePath("/tasks")
  return { success: true }
}

export async function deleteSubtask(id: string) {
  const subtask = await prisma.subtask.findUnique({ where: { id }, select: { taskId: true } })
  if (!subtask) return { success: false, error: "Subtask not found." }

  const guard = await requireSubtaskAccess(subtask.taskId)
  if (!guard.ok) return { success: false, error: guard.error }

  await prisma.subtask.delete({ where: { id } })
  revalidatePath("/tasks")
  return { success: true }
}
