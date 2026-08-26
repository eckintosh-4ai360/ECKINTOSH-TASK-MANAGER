"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { createNotificationsForUsers } from "@/lib/notifications"

const VALID_CATEGORIES = ["bug", "feature", "question", "security", "billing", "performance"]
const VALID_PRIORITIES = ["low", "medium", "high", "critical"]
const MAX_SUBJECT_LENGTH = 200
const MAX_MESSAGE_LENGTH = 5000

export type SupportTicketView = {
  id: string
  category: string
  priority: string
  subject: string
  status: string
  createdAt: string
}

export async function getMySupportTickets(): Promise<SupportTicketView[]> {
  const session = await requireSession()

  const tickets = await prisma.supportTicket.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, category: true, priority: true, subject: true, status: true, createdAt: true },
  })

  return tickets.map((t) => ({ ...t, createdAt: t.createdAt.toISOString() }))
}

export async function createSupportTicketAction(input: {
  category: string
  priority: string
  subject: string
  message: string
}): Promise<{ success: true; ticket: SupportTicketView } | { success: false; error: string }> {
  const session = await requireSession()

  if (!VALID_CATEGORIES.includes(input.category)) {
    return { success: false, error: "Select a category." }
  }
  const priority = VALID_PRIORITIES.includes(input.priority) ? input.priority : "medium"

  const subject = input.subject.trim().slice(0, MAX_SUBJECT_LENGTH)
  const message = input.message.trim().slice(0, MAX_MESSAGE_LENGTH)

  if (!subject) return { success: false, error: "Enter a subject." }
  if (!message) return { success: false, error: "Describe the issue." }

  const ticket = await prisma.supportTicket.create({
    data: { userId: session.id, category: input.category, priority, subject, message },
  })

  // Notify admins — this is the only place the ticket actually goes; there's
  // no separate support-agent inbox in this app.
  const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true } })

  if (admins.length > 0) {
    await createNotificationsForUsers({
      userIds: admins.map((a) => a.id),
      channel: "system",
      title: `New support ticket: ${subject}`,
      message: `${session.name ?? session.email} (${priority}, ${input.category}) — ${message.slice(0, 200)}`,
      type: priority === "critical" || priority === "high" ? "warning" : "info",
      link: "/help",
      email: { senderId: session.id, subject: `Support ticket: ${subject}` },
    })
  }

  revalidatePath("/help")

  return {
    success: true,
    ticket: {
      id: ticket.id,
      category: ticket.category,
      priority: ticket.priority,
      subject: ticket.subject,
      status: ticket.status,
      createdAt: ticket.createdAt.toISOString(),
    } satisfies SupportTicketView,
  }
}
