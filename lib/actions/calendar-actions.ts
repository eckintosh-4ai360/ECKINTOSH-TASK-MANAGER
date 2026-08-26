"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { createNotificationsForUsers, getWorkspaceRecipientIds } from "@/lib/notifications"
import { getPermissionError, hasPermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import { validateInput, createCalendarEventSchema } from "@/lib/validation"

type CalendarEventInput = {
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  type?: string
  location?: string
}

const TYPE_COLORS: Record<string, string> = {
  meeting: "#3b82f6",
  call: "#06b6d4",
  presentation: "#22c55e",
  workshop: "#a855f7",
  review: "#f59e0b",
  deadline: "#ef4444",
  sprint: "#14b8a6",
  task: "#00d4ff",
}

function toDateTime(date: string, time: string | undefined, fallbackTime: string) {
  return new Date(`${date}T${time || fallbackTime}:00`)
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function serializeCalendarEvent(event: {
  id: string
  title: string
  description: string | null
  startTime: Date
  endTime: Date
  allDay: boolean
  type: string
  color: string | null
  location: string | null
  projectId: string | null
}) {
  return {
    ...event,
    startTime: event.startTime.toISOString(),
    endTime: event.endTime.toISOString(),
  }
}

function formatEventBody(input: CalendarEventInput, startTime: Date, endTime: Date, senderName: string) {
  const when = new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(startTime)

  const ends = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(endTime)

  return [
    `${senderName} scheduled a new ${input.type || "event"}.`,
    "",
    `Title: ${input.title.trim()}`,
    `When: ${when} - ${ends}`,
    input.location?.trim() ? `Location: ${input.location.trim()}` : null,
    input.description?.trim() ? "" : null,
    input.description?.trim() ? input.description.trim() : null,
  ].filter(Boolean).join("\n")
}

export type CalendarEventItem = ReturnType<typeof serializeCalendarEvent>

export async function getCalendarEvents() {
  await requireSession()
  const events = await prisma.calendarEvent.findMany({
    orderBy: { startTime: "asc" },
  })

  return events.map(serializeCalendarEvent)
}

export async function createCalendarEvent(input: CalendarEventInput) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_calendar")) {
    return { success: false, error: getPermissionError("manage_calendar") }
  }

  const parsed = validateInput(createCalendarEventSchema, input)
  if (!parsed.success) return { success: false, error: parsed.error }
  const validated = parsed.data

  const startTime = toDateTime(validated.date, validated.startTime, "09:00")
  let endTime = validated.endTime ? toDateTime(validated.date, validated.endTime, "09:30") : addMinutes(startTime, 30)

  if (endTime <= startTime) {
    endTime = addMinutes(startTime, 30)
  }

  const eventType = validated.type || "meeting"
  const recipientIds = await getWorkspaceRecipientIds(session.id)

  const body = formatEventBody(validated, startTime, endTime, session.name)
  const subject = `Scheduled: ${validated.title}`

  const event = await prisma.calendarEvent.create({
    data: {
      title: validated.title,
      description: validated.description || null,
      startTime,
      endTime,
      type: eventType,
      color: TYPE_COLORS[eventType] ?? TYPE_COLORS.meeting,
      location: validated.location || null,
    },
  })

  if (recipientIds.length > 0) {
    await createNotificationsForUsers({
      userIds: recipientIds,
      channel: "teamUpdates",
      title: "New scheduled event",
      message: `${session.name} scheduled ${validated.title}.`,
      type: "info",
      link: "/calendar",
      email: {
        senderId: session.id,
        subject,
        body,
      },
    })
  }

  revalidatePath("/")
  revalidatePath("/calendar")
  revalidatePath("/emails")
  return { success: true, event: serializeCalendarEvent(event) }
}

export async function updateCalendarEvent(eventId: string, input: CalendarEventInput) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_calendar")) {
    return { success: false, error: getPermissionError("manage_calendar") }
  }

  if (!input.title.trim() || !input.date) {
    return { success: false, error: "Event title and date are required" }
  }

  const startTime = toDateTime(input.date, input.startTime, "09:00")
  let endTime = input.endTime ? toDateTime(input.date, input.endTime, "09:30") : addMinutes(startTime, 30)

  if (endTime <= startTime) {
    endTime = addMinutes(startTime, 30)
  }

  const eventType = input.type || "meeting"
  const event = await prisma.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: input.title.trim(),
      description: input.description?.trim() || null,
      startTime,
      endTime,
      type: eventType,
      color: TYPE_COLORS[eventType] ?? TYPE_COLORS.meeting,
      location: input.location?.trim() || null,
    },
  })

  const recipients = await getWorkspaceRecipientIds(session.id)
  await createNotificationsForUsers({
    userIds: recipients,
    channel: "teamUpdates",
    title: "Calendar event updated",
    message: `${session.name} updated ${event.title}.`,
    type: "info",
    link: "/calendar",
    email: {
      senderId: session.id,
      subject: `Calendar event updated: ${event.title}`,
    },
  })

  revalidatePath("/calendar")
  return { success: true, event: serializeCalendarEvent(event) }
}

export async function deleteCalendarEvent(eventId: string) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_calendar")) {
    return { success: false, error: getPermissionError("manage_calendar") }
  }

  const event = await prisma.calendarEvent.findUnique({
    where: { id: eventId },
    select: { title: true },
  })

  await prisma.calendarEvent.delete({
    where: { id: eventId },
  })

  const recipients = await getWorkspaceRecipientIds(session.id)
  await createNotificationsForUsers({
    userIds: recipients,
    channel: "teamUpdates",
    title: "Calendar event removed",
    message: `${session.name} deleted ${event?.title ?? "a scheduled event"}.`,
    type: "warning",
    link: "/calendar",
    email: {
      senderId: session.id,
      subject: `Calendar event removed: ${event?.title ?? "Event"}`,
    },
  })

  revalidatePath("/calendar")
  return { success: true }
}
