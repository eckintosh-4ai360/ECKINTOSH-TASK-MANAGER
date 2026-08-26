import prisma from "@/lib/prisma"
import { createNotificationForUser } from "@/lib/notifications"
import type { SettingsReminderLeadTime } from "@/lib/settings"

/**
 * Core sweep run by the cron endpoint (app/api/cron/reminders/route.ts).
 * Plain module, not a server action — it has no caller identity, it runs on
 * a schedule.
 *
 * Four jobs, each independent and individually toggleable per user:
 *   1. "Due soon" reminders — lead time before a task's due date.
 *   2. Overdue escalation — nudges the assignee and notifies the project owner.
 *   3. Daily digest — a once-per-24h summary.
 *   4. (Quiet hours) — a per-user window where sends are deferred, not lost;
 *      an unsent reminder just gets picked up on the next run.
 */

const LEAD_TIME_MS: Record<SettingsReminderLeadTime, number> = {
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "3d": 3 * 24 * 60 * 60_000,
}

const ACTIVE_STATUSES = ["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW"] as const
const DIGEST_INTERVAL_MS = 24 * 60 * 60_000

export type ReminderSweepSummary = {
  dueSoonSent: number
  overdueSent: number
  digestsSent: number
  skippedQuietHours: number
}

/** Current local time, as minutes since midnight, for a given IANA timezone. */
function localMinutesOfDay(timezone: string, at: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  }).formatToParts(at)

  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0)
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0)
  return hour * 60 + minute
}

function parseHHMM(value: string) {
  const [h, m] = value.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

/** Handles windows that wrap past midnight, e.g. 22:00 → 08:00. */
function isWithinQuietHours(pref: { quietHoursEnabled: boolean; quietHoursStart: string; quietHoursEnd: string }, timezone: string, now: Date) {
  if (!pref.quietHoursEnabled) return false

  const current = localMinutesOfDay(timezone, now)
  const start = parseHHMM(pref.quietHoursStart)
  const end = parseHHMM(pref.quietHoursEnd)

  if (start === end) return false
  if (start < end) return current >= start && current < end
  return current >= start || current < end
}

export async function runReminderSweep(now = new Date()): Promise<ReminderSweepSummary> {
  const summary: ReminderSweepSummary = { dueSoonSent: 0, overdueSent: 0, digestsSent: 0, skippedQuietHours: 0 }

  await Promise.all([
    runDueSoon(now, summary),
    runOverdueEscalation(now, summary),
    runDailyDigest(now, summary),
  ])

  return summary
}

async function runDueSoon(now: Date, summary: ReminderSweepSummary) {
  const candidates = await prisma.task.findMany({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      dueDate: { gt: now },
      assigneeId: { not: null },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      projectId: true,
      project: { select: { name: true, ownerId: true } },
      assignee: {
        select: {
          id: true,
          timezone: true,
          notificationPreference: {
            select: { taskRemindersEnabled: true, reminderLeadTime: true, quietHoursEnabled: true, quietHoursStart: true, quietHoursEnd: true },
          },
        },
      },
    },
  })

  for (const task of candidates) {
    const pref = task.assignee?.notificationPreference
    if (!task.assignee || !task.dueDate || pref?.taskRemindersEnabled === false) continue

    const leadTime = LEAD_TIME_MS[(pref?.reminderLeadTime as SettingsReminderLeadTime) ?? "1d"] ?? LEAD_TIME_MS["1d"]
    const dueInMs = task.dueDate.getTime() - now.getTime()
    if (dueInMs > leadTime) continue // not due soon yet

    const existing = await prisma.reminder.findUnique({
      where: { taskId_kind: { taskId: task.id, kind: "due_soon" } },
    })

    // Already sent for this exact due date — don't repeat until it changes.
    if (existing?.sent && existing.dueTime.getTime() === task.dueDate.getTime()) continue

    if (pref && isWithinQuietHours(pref, task.assignee.timezone ?? "UTC", now)) {
      summary.skippedQuietHours++
      continue
    }

    const message = `"${task.title}" is due ${formatRelativeDue(task.dueDate, now)} on ${task.project.name}.`

    await createNotificationForUser(task.assignee.id, {
      title: "Task due soon",
      message,
      type: "warning",
      link: `/tasks?taskId=${task.id}`,
      channel: "taskReminders",
      email: { senderId: task.project.ownerId, subject: `Reminder: ${task.title}` },
    })

    await prisma.reminder.upsert({
      where: { taskId_kind: { taskId: task.id, kind: "due_soon" } },
      update: { dueTime: task.dueDate, sent: true, message },
      create: { taskId: task.id, kind: "due_soon", dueTime: task.dueDate, sent: true, message },
    })

    summary.dueSoonSent++
  }
}

async function runOverdueEscalation(now: Date, summary: ReminderSweepSummary) {
  const overdue = await prisma.task.findMany({
    where: {
      status: { in: [...ACTIVE_STATUSES] },
      dueDate: { lt: now },
      assigneeId: { not: null },
    },
    select: {
      id: true,
      title: true,
      dueDate: true,
      project: { select: { name: true, ownerId: true } },
      assignee: {
        select: {
          id: true,
          timezone: true,
          notificationPreference: {
            select: { overdueEscalationEnabled: true, quietHoursEnabled: true, quietHoursStart: true, quietHoursEnd: true },
          },
        },
      },
    },
  })

  for (const task of overdue) {
    const pref = task.assignee?.notificationPreference
    if (!task.assignee || !task.dueDate || pref?.overdueEscalationEnabled === false) continue

    const existing = await prisma.reminder.findUnique({
      where: { taskId_kind: { taskId: task.id, kind: "overdue" } },
    })
    if (existing?.sent && existing.dueTime.getTime() === task.dueDate.getTime()) continue

    if (pref && isWithinQuietHours(pref, task.assignee.timezone ?? "UTC", now)) {
      summary.skippedQuietHours++
      continue
    }

    const message = `"${task.title}" on ${task.project.name} is overdue.`

    await createNotificationForUser(task.assignee.id, {
      title: "Task overdue",
      message,
      type: "error",
      link: `/tasks?taskId=${task.id}`,
      channel: "taskReminders",
      email: { senderId: task.project.ownerId, subject: `Overdue: ${task.title}` },
    })

    // Escalate to the project owner too, unless they're the one who's late.
    if (task.project.ownerId !== task.assignee.id) {
      await createNotificationForUser(task.project.ownerId, {
        title: "A task on your project is overdue",
        message,
        type: "warning",
        link: `/tasks?taskId=${task.id}`,
        channel: "teamUpdates",
      })
    }

    await prisma.reminder.upsert({
      where: { taskId_kind: { taskId: task.id, kind: "overdue" } },
      update: { dueTime: task.dueDate, sent: true, message },
      create: { taskId: task.id, kind: "overdue", dueTime: task.dueDate, sent: true, message },
    })

    summary.overdueSent++
  }
}

async function runDailyDigest(now: Date, summary: ReminderSweepSummary) {
  const candidates = await prisma.user.findMany({
    where: {
      notificationPreference: { dailyDigestEnabled: true },
    },
    select: {
      id: true,
      timezone: true,
      notificationPreference: {
        select: { lastDigestSentAt: true, quietHoursEnabled: true, quietHoursStart: true, quietHoursEnd: true },
      },
    },
  })

  for (const user of candidates) {
    const pref = user.notificationPreference
    if (!pref) continue

    if (pref.lastDigestSentAt && now.getTime() - pref.lastDigestSentAt.getTime() < DIGEST_INTERVAL_MS) continue
    if (isWithinQuietHours(pref, user.timezone ?? "UTC", now)) {
      summary.skippedQuietHours++
      continue
    }

    const [dueSoon, overdue, unread] = await Promise.all([
      prisma.task.count({
        where: {
          assigneeId: user.id,
          status: { in: [...ACTIVE_STATUSES] },
          dueDate: { gte: now, lte: new Date(now.getTime() + LEAD_TIME_MS["3d"]) },
        },
      }),
      prisma.task.count({
        where: { assigneeId: user.id, status: { in: [...ACTIVE_STATUSES] }, dueDate: { lt: now } },
      }),
      prisma.notification.count({ where: { userId: user.id, read: false } }),
    ])

    if (dueSoon === 0 && overdue === 0 && unread === 0) {
      // Nothing to report — still mark as sent so we don't check every run.
      await prisma.notificationPreference.update({ where: { userId: user.id }, data: { lastDigestSentAt: now } })
      continue
    }

    await createNotificationForUser(user.id, {
      title: "Your daily digest",
      message: `${dueSoon} task${dueSoon === 1 ? "" : "s"} due soon, ${overdue} overdue, ${unread} unread notification${unread === 1 ? "" : "s"}.`,
      type: "info",
      link: "/tasks",
      channel: "system",
    })

    await prisma.notificationPreference.update({ where: { userId: user.id }, data: { lastDigestSentAt: now } })
    summary.digestsSent++
  }
}

function formatRelativeDue(dueDate: Date, now: Date) {
  const hours = Math.round((dueDate.getTime() - now.getTime()) / (60 * 60_000))
  if (hours < 1) return "within the hour"
  if (hours < 24) return `in ${hours}h`
  return `in ${Math.round(hours / 24)}d`
}
