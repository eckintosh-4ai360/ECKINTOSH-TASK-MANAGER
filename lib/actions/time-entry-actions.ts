"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

const MAX_NOTE_LENGTH = 500

/** The entry your own timer is running on, if any — endTime is null while active. */
export async function getActiveTimeEntry() {
  const session = await requireSession()

  return prisma.timeEntry.findFirst({
    where: { userId: session.id, endTime: null },
    select: {
      id: true,
      taskId: true,
      startTime: true,
      task: { select: { title: true } },
    },
  })
}

export async function getTaskTimeEntries(taskId: string) {
  await requireSession()

  return prisma.timeEntry.findMany({
    where: { taskId },
    orderBy: { startTime: "desc" },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      duration: true,
      notes: true,
      user: { select: { id: true, name: true, email: true } },
    },
  })
}

/**
 * Starts a timer on a task. Only one timer runs per user at a time — an
 * existing one is stopped first, exactly as if the user had clicked "stop"
 * themselves, so no time is silently lost when switching tasks.
 */
export async function startTimeEntry(taskId: string) {
  const session = await requireSession()

  const task = await prisma.task.findUnique({ where: { id: taskId }, select: { id: true } })
  if (!task) return { success: false, error: "Task not found." }

  const running = await prisma.timeEntry.findFirst({
    where: { userId: session.id, endTime: null },
  })

  if (running) {
    await stopEntry(running.id, running.startTime)
  }

  const entry = await prisma.timeEntry.create({
    data: { taskId, userId: session.id, startTime: new Date() },
  })

  revalidatePath("/tasks")
  return { success: true, entry }
}

async function stopEntry(id: string, startTime: Date) {
  const endTime = new Date()
  const duration = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / 60_000))

  return prisma.timeEntry.update({
    where: { id },
    data: { endTime, duration },
  })
}

export async function stopTimeEntry(notes?: string) {
  const session = await requireSession()

  const running = await prisma.timeEntry.findFirst({
    where: { userId: session.id, endTime: null },
  })

  if (!running) return { success: false, error: "No timer is currently running." }

  const trimmedNotes = notes?.trim().slice(0, MAX_NOTE_LENGTH)
  const updated = await stopEntry(running.id, running.startTime)

  if (trimmedNotes) {
    await prisma.timeEntry.update({ where: { id: running.id }, data: { notes: trimmedNotes } })
  }

  revalidatePath("/tasks")
  return { success: true, entry: updated }
}

/** For logging time after the fact, without running a live timer. */
export async function logManualTimeEntry(input: {
  taskId: string
  durationMinutes: number
  notes?: string
}) {
  const session = await requireSession()

  if (!Number.isFinite(input.durationMinutes) || input.durationMinutes <= 0) {
    return { success: false, error: "Enter a duration greater than zero." }
  }
  if (input.durationMinutes > 24 * 60) {
    return { success: false, error: "A single entry can't exceed 24 hours — split it up." }
  }

  const task = await prisma.task.findUnique({ where: { id: input.taskId }, select: { id: true } })
  if (!task) return { success: false, error: "Task not found." }

  const endTime = new Date()
  const startTime = new Date(endTime.getTime() - input.durationMinutes * 60_000)

  const entry = await prisma.timeEntry.create({
    data: {
      taskId: input.taskId,
      userId: session.id,
      startTime,
      endTime,
      duration: Math.round(input.durationMinutes),
      notes: input.notes?.trim().slice(0, MAX_NOTE_LENGTH) || null,
    },
  })

  revalidatePath("/tasks")
  return { success: true, entry }
}

export async function deleteTimeEntry(id: string) {
  const session = await requireSession()

  const entry = await prisma.timeEntry.findUnique({ where: { id }, select: { userId: true } })
  if (!entry || entry.userId !== session.id) {
    return { success: false, error: "Time entry not found." }
  }

  await prisma.timeEntry.delete({ where: { id } })
  revalidatePath("/tasks")
  return { success: true }
}
