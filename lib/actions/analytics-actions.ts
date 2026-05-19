"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { getPermissionError, hasPermission } from "@/lib/rbac"

// ─── Types ────────────────────────────────────────────────────────────────────

export type MonthlyTrendItem = {
  month: string        // e.g. "Jan"
  year: number         // e.g. 2026
  label: string        // e.g. "Jan 2026"
  completed: number    // tasks completed in that month
  created: number      // tasks created in that month
}

export type ProjectStatusBreakdown = {
  active: number
  paused: number
  completed: number
  archived: number
}

export type TaskStatusBreakdown = {
  backlog: number
  todo: number
  inProgress: number
  inReview: number
  completed: number
}

export type PriorityBreakdown = {
  critical: number
  high: number
  medium: number
  low: number
}

export type AnalyticsData = {
  // KPI cards
  completedTasks: number
  completedTasksLastMonth: number
  activeProjects: number
  activeProjectsLastMonth: number
  teamMembers: number
  avgCompletionDays: number | null   // null when no completed tasks exist
  avgCompletionDaysLastMonth: number | null

  // Charts
  monthlyTrend: MonthlyTrendItem[]           // last 6 calendar months
  projectStatusBreakdown: ProjectStatusBreakdown
  taskStatusBreakdown: TaskStatusBreakdown
  priorityBreakdown: PriorityBreakdown

  // Extra
  overdueTasksCount: number
  completionRate: number   // 0-100
  totalHoursLogged: number // from TimeEntry table (minutes converted to hours)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Returns the first moment of the month N months ago (0 = this month). */
function monthStart(offset: number): Date {
  const d = new Date()
  d.setDate(1)
  d.setHours(0, 0, 0, 0)
  d.setMonth(d.getMonth() - offset)
  return d
}

/** Returns the last moment of the month N months ago (0 = this month). */
function monthEnd(offset: number): Date {
  const d = monthStart(offset - 1) // start of next month
  d.setMilliseconds(d.getMilliseconds() - 1)
  return d
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

// ─── Main Action ──────────────────────────────────────────────────────────────

export async function getAnalyticsData(): Promise<AnalyticsData | { error: string }> {
  const session = await requireSession()
  if (!hasPermission(session.role, "view_analytics")) {
    return { error: getPermissionError("view_analytics") }
  }

  const now = new Date()
  const startOfThisMonth = monthStart(0)
  const startOfLastMonth = monthStart(1)
  const endOfLastMonth = monthEnd(1)

  // Build 6-month window boundaries (newest first, then reverse for chart)
  const sixMonthsAgo = monthStart(5)

  const [
    // ── KPI raw counts ────────────────────────────────────────────────────
    completedTasks,
    completedTasksLastMonth,
    activeProjects,
    activeProjectsLastMonth,
    teamMembers,

    // ── Average completion time ───────────────────────────────────────────
    completedTasksForDuration,
    completedTasksLastMonthForDuration,

    // ── Charts ─────────────────────────────────────────────────────────────
    tasksCreatedLast6Months,
    tasksCompletedLast6Months,
    projectsByStatus,
    tasksByStatus,
    tasksByPriority,

    // ── Extras ─────────────────────────────────────────────────────────────
    totalTasks,
    overdueTasks,
    timeEntriesSum,
  ] = await Promise.all([
    // Completed tasks (all time)
    prisma.task.count({ where: { status: "COMPLETED" } }),

    // Completed tasks last calendar month
    prisma.task.count({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
    }),

    // Active projects (current)
    prisma.project.count({ where: { status: "active" } }),

    // Active projects last month snapshot — best approximation: projects created before end of last month
    prisma.project.count({
      where: {
        status: "active",
        createdAt: { lte: endOfLastMonth },
      },
    }),

    // Team members total
    prisma.user.count(),

    // Completed tasks with timestamps for avg duration (current period)
    prisma.task.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: startOfThisMonth },
      },
      select: { createdAt: true, updatedAt: true },
    }),

    // Completed tasks last month for avg duration
    prisma.task.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: startOfLastMonth, lte: endOfLastMonth },
      },
      select: { createdAt: true, updatedAt: true },
    }),

    // Tasks created in the last 6 months grouped by month
    prisma.task.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    }),

    // Tasks completed in the last 6 months grouped by month
    prisma.task.findMany({
      where: {
        status: "COMPLETED",
        updatedAt: { gte: sixMonthsAgo },
      },
      select: { updatedAt: true },
    }),

    // Project status counts
    prisma.project.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),

    // Task status counts
    prisma.task.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),

    // Task priority counts
    prisma.task.groupBy({
      by: ["priority"],
      _count: { _all: true },
    }),

    // Total tasks (for completion rate)
    prisma.task.count(),

    // Overdue tasks
    prisma.task.count({
      where: {
        dueDate: { lt: now },
        status: { notIn: ["COMPLETED", "ARCHIVED"] },
      },
    }),

    // Total logged hours from TimeEntry
    prisma.timeEntry.aggregate({ _sum: { duration: true } }),
  ])

  // ── Compute avg completion days ────────────────────────────────────────────
  function avgDays(tasks: { createdAt: Date; updatedAt: Date }[]): number | null {
    if (tasks.length === 0) return null
    const totalMs = tasks.reduce(
      (sum, t) => sum + (t.updatedAt.getTime() - t.createdAt.getTime()),
      0,
    )
    return Math.round((totalMs / tasks.length / (1000 * 60 * 60 * 24)) * 10) / 10
  }

  // ── Build 6-month trend ────────────────────────────────────────────────────
  const monthlyTrend: MonthlyTrendItem[] = []

  for (let i = 5; i >= 0; i--) {
    const start = monthStart(i)
    const end = monthEnd(i)

    const created = tasksCreatedLast6Months.filter(
      (t) => t.createdAt >= start && t.createdAt <= end,
    ).length

    const completed = tasksCompletedLast6Months.filter(
      (t) => t.updatedAt >= start && t.updatedAt <= end,
    ).length

    monthlyTrend.push({
      month: SHORT_MONTHS[start.getMonth()],
      year: start.getFullYear(),
      label: `${SHORT_MONTHS[start.getMonth()]} ${start.getFullYear()}`,
      created,
      completed,
    })
  }

  // ── Project status breakdown ───────────────────────────────────────────────
  const psByStatus: Record<string, number> = {}
  for (const row of projectsByStatus) {
    psByStatus[row.status] = row._count._all
  }

  const projectStatusBreakdown: ProjectStatusBreakdown = {
    active: psByStatus["active"] ?? 0,
    paused: psByStatus["paused"] ?? 0,
    completed: psByStatus["completed"] ?? 0,
    archived: psByStatus["archived"] ?? 0,
  }

  // ── Task status breakdown ──────────────────────────────────────────────────
  const tsByStatus: Record<string, number> = {}
  for (const row of tasksByStatus) {
    tsByStatus[row.status] = row._count._all
  }

  const taskStatusBreakdown: TaskStatusBreakdown = {
    backlog: tsByStatus["BACKLOG"] ?? 0,
    todo: tsByStatus["TODO"] ?? 0,
    inProgress: tsByStatus["IN_PROGRESS"] ?? 0,
    inReview: tsByStatus["IN_REVIEW"] ?? 0,
    completed: tsByStatus["COMPLETED"] ?? 0,
  }

  // ── Priority breakdown ─────────────────────────────────────────────────────
  const pByPriority: Record<string, number> = {}
  for (const row of tasksByPriority) {
    pByPriority[row.priority] = row._count._all
  }

  const priorityBreakdown: PriorityBreakdown = {
    critical: pByPriority["critical"] ?? 0,
    high: pByPriority["high"] ?? 0,
    medium: pByPriority["medium"] ?? 0,
    low: pByPriority["low"] ?? 0,
  }

  // ── Completion rate ────────────────────────────────────────────────────────
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // ── Total hours logged ─────────────────────────────────────────────────────
  const totalMinutes = timeEntriesSum._sum.duration ?? 0
  const totalHoursLogged = Math.round((totalMinutes / 60) * 10) / 10

  return {
    completedTasks,
    completedTasksLastMonth,
    activeProjects,
    activeProjectsLastMonth,
    teamMembers,
    avgCompletionDays: avgDays(completedTasksForDuration),
    avgCompletionDaysLastMonth: avgDays(completedTasksLastMonthForDuration),
    monthlyTrend,
    projectStatusBreakdown,
    taskStatusBreakdown,
    priorityBreakdown,
    overdueTasksCount: overdueTasks,
    completionRate,
    totalHoursLogged,
  }
}
