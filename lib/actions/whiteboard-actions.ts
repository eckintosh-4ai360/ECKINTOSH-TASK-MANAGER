"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export type WhiteboardItem = {
  id: string
  title: string
  thumbnail: string | null
  createdAt: string
  updatedAt: string
}

export type WhiteboardData = {
  elements: unknown[]
  appState: Record<string, unknown>
  files: Record<string, unknown>
}

// ─── Queries ────────────────────────────────────────────────────────────────

export async function getWhiteboards(): Promise<WhiteboardItem[]> {
  const session = await requireSession()
  const boards = await prisma.whiteboard.findMany({
    where: { ownerId: session.id },
    select: {
      id: true,
      title: true,
      thumbnail: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  })
  return boards.map((b) => ({
    ...b,
    createdAt: b.createdAt.toISOString(),
    updatedAt: b.updatedAt.toISOString(),
  }))
}

export async function getWhiteboardData(id: string): Promise<WhiteboardData | null> {
  const session = await requireSession()
  const board = await prisma.whiteboard.findFirst({
    where: { id, ownerId: session.id },
    select: { data: true },
  })
  if (!board) return null

  const raw = board.data as Record<string, unknown>
  return {
    elements: Array.isArray(raw.elements) ? raw.elements : [],
    appState: (raw.appState as Record<string, unknown>) ?? {},
    files: (raw.files as Record<string, unknown>) ?? {},
  }
}

// ─── Mutations ───────────────────────────────────────────────────────────────

export async function createWhiteboard(title?: string) {
  const session = await requireSession()

  const board = await prisma.whiteboard.create({
    data: {
      title: title?.trim() || "Untitled whiteboard",
      data: { elements: [], appState: {}, files: {} },
      ownerId: session.id,
    },
    select: {
      id: true,
      title: true,
      thumbnail: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  revalidatePath("/whiteboard")
  return {
    success: true,
    board: {
      ...board,
      createdAt: board.createdAt.toISOString(),
      updatedAt: board.updatedAt.toISOString(),
    },
  }
}

export async function updateWhiteboard(
  id: string,
  data: WhiteboardData,
  thumbnail?: string,
) {
  const session = await requireSession()

  await prisma.whiteboard.updateMany({
    where: { id, ownerId: session.id },
    data: {
      data: data as object,
      ...(thumbnail ? { thumbnail } : {}),
    },
  })

  return { success: true }
}

export async function renameWhiteboard(id: string, title: string) {
  const session = await requireSession()
  if (!title.trim()) return { success: false, error: "Title is required" }

  await prisma.whiteboard.updateMany({
    where: { id, ownerId: session.id },
    data: { title: title.trim() },
  })

  revalidatePath("/whiteboard")
  return { success: true }
}

export async function deleteWhiteboard(id: string) {
  const session = await requireSession()

  await prisma.whiteboard.deleteMany({
    where: { id, ownerId: session.id },
  })

  revalidatePath("/whiteboard")
  return { success: true }
}
