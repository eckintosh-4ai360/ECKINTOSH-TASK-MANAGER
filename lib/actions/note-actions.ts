"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { sanitizeNoteHtml } from "@/lib/sanitize-html"
import { getPermissionError, hasPermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { validateInput, noteInputSchema } from "@/lib/validation"

type NoteInput = {
  title?: string
  content?: string
  color?: string
}

function serializeNote(note: {
  id: string
  title: string
  content: string
  color: string
  pinned: boolean
  archived: boolean
  createdAt: Date
  updatedAt: Date
}) {
  return {
    ...note,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }
}

function normalizeTitle(title?: string, content?: string) {
  const cleanTitle = title?.trim()
  if (cleanTitle) return cleanTitle

  const firstLine = content?.split("\n").find((line) => line.trim())?.trim()
  return firstLine?.slice(0, 80) || "Untitled note"
}

export type JotNote = ReturnType<typeof serializeNote>

export async function getNotes() {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_own_notes")) return []
  const notes = await prisma.note.findMany({
    where: { ownerId: session.id, archived: false },
    orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
  })

  return notes.map(serializeNote)
}

export async function createNote(input: NoteInput) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_own_notes")) {
    return { success: false, error: getPermissionError("manage_own_notes") }
  }
  const parsed = validateInput(noteInputSchema, input)
  if (!parsed.success) return { success: false, error: parsed.error }
  const validated = parsed.data

  // Note bodies are rendered as HTML, so scrub them before they are stored.
  const content = sanitizeNoteHtml(validated.content?.trim() ?? "")

  const note = await prisma.note.create({
    data: {
      title: normalizeTitle(validated.title, content),
      content,
      color: validated.color || "#00d4ff",
      ownerId: session.id,
    },
  })

  revalidatePath("/jot-it")
  return { success: true, note: serializeNote(note) }
}

export async function updateNote(noteId: string, input: NoteInput) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_own_notes")) {
    return { success: false, error: getPermissionError("manage_own_notes") }
  }
  const parsed = validateInput(noteInputSchema, input)
  if (!parsed.success) return { success: false, error: parsed.error }
  const validated = parsed.data

  const content = sanitizeNoteHtml(validated.content ?? "")

  const updated = await prisma.note.updateMany({
    where: { id: noteId, ownerId: session.id },
    data: {
      title: normalizeTitle(validated.title, content),
      content,
      color: validated.color || "#00d4ff",
    },
  })

  if (updated.count === 0) return { success: false, error: "Note not found" }

  const note = await prisma.note.findUniqueOrThrow({ where: { id: noteId } })
  revalidatePath("/jot-it")
  return { success: true, note: serializeNote(note) }
}

export async function toggleNotePinned(noteId: string, pinned: boolean) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_own_notes")) {
    return { success: false, error: getPermissionError("manage_own_notes") }
  }
  await prisma.note.updateMany({
    where: { id: noteId, ownerId: session.id },
    data: { pinned },
  })

  revalidatePath("/jot-it")
  return { success: true }
}

export async function deleteNote(noteId: string) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_own_notes")) {
    return { success: false, error: getPermissionError("manage_own_notes") }
  }
  await prisma.note.deleteMany({ where: { id: noteId, ownerId: session.id } })

  revalidatePath("/jot-it")
  return { success: true }
}
