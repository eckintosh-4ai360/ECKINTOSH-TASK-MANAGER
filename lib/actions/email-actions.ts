"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Send internal email
export async function sendEmail(formData: FormData) {
  const session = await requireSession()
  const toId = formData.get("toId") as string
  const subject = formData.get("subject") as string
  const body = formData.get("body") as string

  if (!toId || !subject?.trim() || !body?.trim()) {
    return { error: "All fields are required" }
  }

  await prisma.internalEmail.create({
    data: { fromId: session.id, toId, subject: subject.trim(), body: body.trim() },
  })

  // Only revalidate on send so the recipient's inbox updates
  revalidatePath("/emails")
  return { success: true }
}

// Get inbox (emails received by current user)
export async function getInbox() {
  const session = await requireSession()
  return prisma.internalEmail.findMany({
    where: { toId: session.id },
    include: { from: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })
}

// Get sent emails
export async function getSentEmails() {
  const session = await requireSession()
  return prisma.internalEmail.findMany({
    where: { fromId: session.id },
    include: { to: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })
}

// Mark email as read — NO revalidatePath: client state already reflects it
export async function markEmailRead(emailId: string) {
  const session = await requireSession()
  await prisma.internalEmail.updateMany({
    where: { id: emailId, toId: session.id },
    data: { read: true },
  })
  // Intentionally no revalidatePath — prevents page remount that wipes UI state
}

// Delete email — updates local state, no full page revalidation needed
export async function deleteEmail(emailId: string) {
  const session = await requireSession()
  await prisma.internalEmail.deleteMany({
    where: { id: emailId, OR: [{ fromId: session.id }, { toId: session.id }] },
  })
  // Intentionally no revalidatePath — client removes it from state immediately
}

// Get all users to send email to
export async function getEmailableUsers() {
  const session = await requireSession()
  return prisma.user.findMany({
    where: { id: { not: session.id } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })
}
