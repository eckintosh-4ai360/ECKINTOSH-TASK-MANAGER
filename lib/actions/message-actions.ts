"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { revalidatePath } from "next/cache"

// Get conversation history between current user and another user
export async function getConversation(otherUserId: string) {
  const session = await requireSession()
  const me = session.id

  return prisma.message.findMany({
    where: {
      OR: [
        { senderId: me, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: me },
      ],
    },
    select: {
      id: true,
      content: true,
      senderId: true,
      receiverId: true,
      createdAt: true,
      replyToId: true,
      mediaUrl: true,
      mediaType: true,
      mediaName: true,
      mediaSize: true,
      sender: { select: { id: true, name: true, email: true } },
      replyTo: {
        select: {
          id: true,
          content: true,
          mediaType: true,
          mediaName: true,
          sender: { select: { name: true, email: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
    take: 200,
  })
}

// Get all users to chat with (everyone except self)
export async function getChatUsers() {
  const session = await requireSession()
  return prisma.user.findMany({
    where: { id: { not: session.id } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  })
}

// Mark messages from a user as read
export async function markMessagesRead(fromUserId: string) {
  const session = await requireSession()
  await prisma.message.updateMany({
    where: { senderId: fromUserId, receiverId: session.id, read: false },
    data: { read: true },
  })
}

// Get unread message counts per sender
export async function getUnreadCounts() {
  const session = await requireSession()
  const messages = await prisma.message.findMany({
    where: { receiverId: session.id, read: false },
    select: { senderId: true },
  })
  const counts: Record<string, number> = {}
  for (const m of messages) {
    counts[m.senderId] = (counts[m.senderId] ?? 0) + 1
  }
  return counts
}
