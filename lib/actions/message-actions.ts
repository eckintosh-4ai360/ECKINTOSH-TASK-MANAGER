"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import { getPusherServer, WORKSPACE_PRESENCE_CHANNEL } from "@/lib/pusher/server"

// Get conversation history between current user and another user
export async function getConversation(otherUserId: string) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_messages")) return []
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
      edited: true,
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
  if (!hasPermission(session.role, "use_messages")) return []
  return prisma.user.findMany({
    where: { id: { not: session.id } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  })
}

// Mark messages from a user as read
export async function markMessagesRead(fromUserId: string) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_messages")) return
  await prisma.message.updateMany({
    where: { senderId: fromUserId, receiverId: session.id, read: false },
    data: { read: true },
  })
}

// Get unread message counts per sender
export async function getUnreadCounts() {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_messages")) return {}
  const unreadCounts = await prisma.message.groupBy({
    by: ["senderId"],
    where: { receiverId: session.id, read: false },
    _count: { _all: true },
  })

  return Object.fromEntries(
    unreadCounts.map((item) => [item.senderId, item._count._all])
  )
}

// ─── Realtime Message Mutation Actions ───────────────────────────────────────

export type SendMessageInput = {
  to: string
  content?: string | null
  replyToId?: string | null
  mediaUrl?: string | null
  mediaType?: string | null
  mediaName?: string | null
  mediaSize?: number | null
}

export async function sendMessageAction(input: SendMessageInput) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_messages")) {
    throw new Error("Unauthorized to send messages.")
  }

  const { to, content, replyToId, mediaUrl, mediaType, mediaName, mediaSize } = input

  if (!to || (!content?.trim() && !mediaUrl)) {
    throw new Error("Recipient and either content or media is required.")
  }

  // Persist to database
  const saved = await prisma.message.create({
    data: {
      senderId: session.id,
      receiverId: to,
      content: content?.trim() ?? null,
      ...(replyToId ? { replyToId } : {}),
      ...(mediaUrl ? { mediaUrl, mediaType, mediaName, mediaSize } : {}),
    },
    include: {
      sender: { select: { id: true, name: true, email: true } },
      replyTo: {
        select: {
          id: true,
          content: true,
          mediaType: true,
          mediaName: true,
          sender: { select: { id: true, name: true, email: true } },
        },
      },
    },
  })

  const payload = {
    id: saved.id,
    from: session.id,
    to,
    content: saved.content,
    senderName: saved.sender.name ?? saved.sender.email,
    replyToId: saved.replyToId ?? null,
    replyTo: saved.replyTo
      ? {
          id: saved.replyTo.id,
          content: saved.replyTo.content ?? `[${saved.replyTo.mediaType ?? "media"}]`,
          senderName: saved.replyTo.sender.name ?? saved.replyTo.sender.email,
        }
      : null,
    mediaUrl: saved.mediaUrl ?? null,
    mediaType: saved.mediaType ?? null,
    mediaName: saved.mediaName ?? null,
    mediaSize: saved.mediaSize ?? null,
    createdAt: saved.createdAt.toISOString(),
  }

  // Trigger Pusher event if configured
  const pusher = getPusherServer()
  if (pusher) {
    try {
      await pusher.trigger(WORKSPACE_PRESENCE_CHANNEL, "chat", payload)
    } catch (err) {
      console.error("[Pusher Trigger] Failed to broadcast message:", err)
    }
  }

  return payload
}

export async function deleteMessageAction(messageId: string) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_messages")) {
    throw new Error("Unauthorized to delete messages.")
  }

  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    select: { senderId: true, receiverId: true },
  })

  if (!msg || msg.senderId !== session.id) {
    throw new Error("Message not found or unauthorized to delete.")
  }

  await prisma.message.delete({ where: { id: messageId } })

  const pusher = getPusherServer()
  if (pusher) {
    try {
      await pusher.trigger(WORKSPACE_PRESENCE_CHANNEL, "delete_message", { id: messageId })
    } catch (err) {
      console.error("[Pusher Trigger] Failed to broadcast delete_message:", err)
    }
  }

  return { success: true, id: messageId }
}

export async function editMessageAction(messageId: string, content: string) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_messages")) {
    throw new Error("Unauthorized to edit messages.")
  }

  if (!content?.trim()) {
    throw new Error("Content is required.")
  }

  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    select: { senderId: true, receiverId: true },
  })

  if (!msg || msg.senderId !== session.id) {
    throw new Error("Message not found or unauthorized to edit.")
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: { content: content.trim(), edited: true },
  })

  const payload = {
    id: updated.id,
    content: updated.content,
    edited: true,
  }

  const pusher = getPusherServer()
  if (pusher) {
    try {
      await pusher.trigger(WORKSPACE_PRESENCE_CHANNEL, "edit_message", payload)
    } catch (err) {
      console.error("[Pusher Trigger] Failed to broadcast edit_message:", err)
    }
  }

  return payload
}
