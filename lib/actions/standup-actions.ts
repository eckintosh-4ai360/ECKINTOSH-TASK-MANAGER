"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

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

  if (!input.didYesterday.trim() || !input.doingToday.trim()) {
    return { success: false, error: "Yesterday and today updates are required" }
  }

  const mood = Math.max(1, Math.min(5, Number(input.mood) || 3))

  await prisma.standup.create({
    data: {
      userId: session.id,
      projectId: input.projectId || null,
      didYesterday: input.didYesterday.trim(),
      doingToday: input.doingToday.trim(),
      blockers: input.blockers?.trim() || null,
      mood,
    },
  })

  revalidatePath("/")
  revalidatePath("/standups")
  return { success: true }
}
