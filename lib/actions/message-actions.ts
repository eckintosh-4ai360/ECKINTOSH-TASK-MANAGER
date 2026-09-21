"use server"

import prisma from "@/lib/prisma"
import { requireWorkspace } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import { getPusherServer, getWorkspacePresenceChannel } from "@/lib/pusher/server"

// Get conversation history between current user and another user
export async function getConversation(otherUserId: string) {
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "use_messages")) return []
  const me = session.id
  const otherMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: session.workspaceId, userId: otherUserId } },
    select: { userId: true },
  })
  if (!otherMember) return []

  return prisma.message.findMany({
    where: {
      workspaceId: session.workspaceId,
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
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "use_messages")) return []
  return prisma.user.findMany({
    where: { id: { not: session.id }, workspaceMemberships: { some: { workspaceId: session.workspaceId } } },
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  })
}

// Mark messages from a user as read
export async function markMessagesRead(fromUserId: string) {
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "use_messages")) return
  const senderMember = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: session.workspaceId, userId: fromUserId } },
    select: { userId: true },
  })
  if (!senderMember) return
  await prisma.message.updateMany({
    where: { workspaceId: session.workspaceId, senderId: fromUserId, receiverId: session.id, read: false },
    data: { read: true },
  })
}

// Get unread message counts per sender
export async function getUnreadCounts() {
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "use_messages")) return {}
  const unreadCounts = await prisma.message.groupBy({
    by: ["senderId"],
    where: { workspaceId: session.workspaceId, receiverId: session.id, read: false, sender: { workspaceMemberships: { some: { workspaceId: session.workspaceId } } } },
    _count: { _all: true },
  })

  return Object.fromEntries(
    unreadCounts.map((item) => [item.senderId, item._count._all])
  )
}

// ─── Presence fallback ──────────────────────────────────────────────

// A member counts as online while their heartbeat is younger than this. Kept
// comfortably above the client's poll interval so one slow request does not
// flicker somebody offline.
const PRESENCE_TTL_MS = 45_000

// Records that the caller is still here and reports who else is. Used only by
// deployments with no push transport, where presence cannot be event-driven.
export async function heartbeatPresence(): Promise<string[]> {
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "use_messages")) return []

  const now = new Date()
  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: session.workspaceId, userId: session.id } },
    data: { lastSeenAt: now },
  })

  const active = await prisma.workspaceMember.findMany({
    where: {
      workspaceId: session.workspaceId,
      userId: { not: session.id },
      lastSeenAt: { gte: new Date(now.getTime() - PRESENCE_TTL_MS) },
    },
    select: { userId: true },
  })

  return active.map((member) => member.userId)
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
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "use_messages")) {
    throw new Error("Unauthorized to send messages.")
  }

  const { to, content, replyToId, mediaUrl, mediaType, mediaName, mediaSize } = input

  if (!to || (!content?.trim() && !mediaUrl)) {
    throw new Error("Recipient and either content or media is required.")
  }

  const recipient = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: session.workspaceId, userId: to } },
    select: { userId: true },
  })
  if (!recipient) throw new Error("Recipient is not a member of the active workspace.")
  if (replyToId) {
    const reply = await prisma.message.findFirst({ where: { id: replyToId, workspaceId: session.workspaceId }, select: { id: true } })
    if (!reply) throw new Error("Reply target is not in the active workspace.")
  }

  // Persist to database
  const saved = await prisma.message.create({
    data: {
      senderId: session.id,
      receiverId: to,
      workspaceId: session.workspaceId,
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
      await pusher.trigger(getWorkspacePresenceChannel(session.workspaceId), "chat", payload)
    } catch (err) {
      console.error("[Pusher Trigger] Failed to broadcast message:", err)
    }
  }

  return payload
}

export async function deleteMessageAction(messageId: string) {
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "use_messages")) {
    throw new Error("Unauthorized to delete messages.")
  }

  const msg = await prisma.message.findUnique({
    where: { id: messageId, workspaceId: session.workspaceId },
    select: { senderId: true, receiverId: true },
  })

  if (!msg || msg.senderId !== session.id) {
    throw new Error("Message not found or unauthorized to delete.")
  }

  await prisma.message.delete({ where: { id: messageId } })

  const pusher = getPusherServer()
  if (pusher) {
    try {
      await pusher.trigger(getWorkspacePresenceChannel(session.workspaceId), "delete_message", { id: messageId })
    } catch (err) {
      console.error("[Pusher Trigger] Failed to broadcast delete_message:", err)
    }
  }

  return { success: true, id: messageId }
}

export async function editMessageAction(messageId: string, content: string) {
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "use_messages")) {
    throw new Error("Unauthorized to edit messages.")
  }

  if (!content?.trim()) {
    throw new Error("Content is required.")
  }

  const msg = await prisma.message.findUnique({
    where: { id: messageId, workspaceId: session.workspaceId },
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
      await pusher.trigger(getWorkspacePresenceChannel(session.workspaceId), "edit_message", payload)
    } catch (err) {
      console.error("[Pusher Trigger] Failed to broadcast edit_message:", err)
    }
  }

  return payload
}
