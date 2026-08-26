"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { createNotificationsForUsers } from "@/lib/notifications"
import { validateInput, createSupportTicketSchema } from "@/lib/validation"

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

  const parsed = validateInput(createSupportTicketSchema, input)
  if (!parsed.success) return { success: false, error: parsed.error }
  const { category, priority, subject, message } = parsed.data

  const ticket = await prisma.supportTicket.create({
    data: { userId: session.id, category, priority, subject, message },
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
