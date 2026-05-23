export type ProductivityTaskStatus =
  | "BACKLOG"
  | "TODO"
  | "IN_PROGRESS"
  | "IN_REVIEW"
  | "COMPLETED"
  | "ARCHIVED"
  | string

export type ProductivityTaskInput = {
  id: string
  title: string
  description?: string | null
  status: ProductivityTaskStatus
  priority: string
  dueDate?: Date | string | null
  estimate?: number | null
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
  tags?: string[] | null
  project?: {
    id?: string
    name: string
    color?: string | null
  } | null
  assignee?: {
    id?: string
    name?: string | null
    email?: string | null
  } | null
}

export type ProductivityEventInput = {
  id: string
  title: string
  type: string
  startTime: Date | string
  endTime: Date | string
  location?: string | null
}

export type ProductivityTimeEntryInput = {
  id: string
  duration: number
  startTime: Date | string
  endTime: Date | string
  task?: {
    title: string
    project?: { name: string } | null
    tags?: string[] | null
  } | null
}

export type ProductivityStandupInput = {
  id: string
  didYesterday: string
  doingToday: string
  blockers?: string | null
  mood: number
  date: Date | string
  project?: { name: string } | null
}

export type ProductivityCommitInput = {
  id: string
  message: string
  committedAt: Date | string
  branch: string
  projectName?: string
}

export type TaskPriorityScore = {
  score: number
  urgency: number
  importance: number
  delayRisk: number
  statusPressure: number
  effortPressure: number
  reasons: string[]
}

export type IntelligenceTask = ProductivityTaskInput & {
  dueDate: string | null
  createdAt: string | null
  updatedAt: string | null
  ai: TaskPriorityScore
}

export type ProductivityInsight = {
  title: string
  detail: string
  tone: "success" | "warning" | "danger" | "info"
}

export type PredictiveReminder = {
  taskId: string
  taskTitle: string
  projectName: string | null
  dueDate: string | null
  risk: number
  message: string
}

export type DailyPlanBlock = {
  time: string
  title: string
  detail: string
  kind: "focus" | "meeting" | "admin" | "break" | "review"
  taskId?: string
}

export type AIMemoryProfile = {
  preferredFocusWindow: string
  strongestProjectPattern: string
  recurringTaskThemes: string[]
  procrastinationSignals: string[]
  workloadMode: "light" | "balanced" | "heavy" | "overloaded"
}

export type ProductivityIntelligence = {
  generatedAt: string
  summary: {
    activeTasks: number
    overdueTasks: number
    dueSoonTasks: number
    inReviewTasks: number
    workloadRisk: number
    focusScore: number
  }
  topPriorities: IntelligenceTask[]
  predictiveReminders: PredictiveReminder[]
  insights: ProductivityInsight[]
  dailyPlan: DailyPlanBlock[]
  memory: AIMemoryProfile
  decisionQueue: string[]
}

const ACTIVE_STATUSES = new Set(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW"])
const PRIORITY_WEIGHT: Record<string, number> = {
  low: 10,
  medium: 22,
  high: 34,
  critical: 42,
}

function toDate(value?: Date | string | null) {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function toIsoDate(value?: Date | string | null) {
  return toDate(value)?.toISOString() ?? null
}

function daysBetween(left: Date, right: Date) {
  return Math.ceil((left.getTime() - right.getTime()) / 86_400_000)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function isActiveTask(task: ProductivityTaskInput) {
  return ACTIVE_STATUSES.has(String(task.status).toUpperCase())
}

function projectName(task: ProductivityTaskInput) {
  return task.project?.name ?? "No project"
}

function modeFromHour(hour: number) {
  if (hour < 12) return "morning"
  if (hour < 17) return "afternoon"
  if (hour < 21) return "evening"
  return "night"
}

function addCount(map: Map<string, number>, key?: string | null, increment = 1) {
  const normalized = key?.trim()
  if (!normalized) return
  map.set(normalized, (map.get(normalized) ?? 0) + increment)
}

function topKeys(map: Map<string, number>, take = 3) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, take)
    .map(([key]) => key)
}

export function scoreTaskPriority(task: ProductivityTaskInput, now = new Date()): TaskPriorityScore {
  const due = toDate(task.dueDate)
  const updatedAt = toDate(task.updatedAt)
  const createdAt = toDate(task.createdAt)
  const status = String(task.status).toUpperCase()
  const priority = String(task.priority || "medium").toLowerCase()

  const importance = PRIORITY_WEIGHT[priority] ?? PRIORITY_WEIGHT.medium
  let urgency = 4
  const reasons: string[] = []

  if (due) {
    const daysUntilDue = daysBetween(due, now)

    if (daysUntilDue < 0) {
      urgency = 38
      reasons.push(`${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) === 1 ? "" : "s"} overdue`)
    } else if (daysUntilDue === 0) {
      urgency = 34
      reasons.push("due today")
    } else if (daysUntilDue <= 1) {
      urgency = 30
      reasons.push("due tomorrow")
    } else if (daysUntilDue <= 3) {
      urgency = 24
      reasons.push(`due in ${daysUntilDue} days`)
    } else if (daysUntilDue <= 7) {
      urgency = 16
      reasons.push("due this week")
    } else if (daysUntilDue <= 14) {
      urgency = 9
      reasons.push("due in the next two weeks")
    }
  } else {
    reasons.push("no due date")
  }

  const staleDays = updatedAt ? Math.max(0, daysBetween(now, updatedAt)) : 0
  const ageDays = createdAt ? Math.max(0, daysBetween(now, createdAt)) : staleDays
  const statusPressure =
    status === "IN_PROGRESS" ? 14 :
    status === "IN_REVIEW" ? 12 :
    status === "TODO" ? 9 :
    status === "BACKLOG" ? 5 : 0
  const effortPressure = task.estimate
    ? task.estimate >= 8 ? 8 : task.estimate >= 4 ? 5 : 2
    : 3
  const stalenessPressure = status !== "COMPLETED" ? clamp(staleDays * 1.6, 0, 14) : 0

  if (priority === "critical" || priority === "high") {
    reasons.push(`${priority} importance`)
  }

  if (status === "IN_PROGRESS") {
    reasons.push("already in progress")
  }

  if (staleDays >= 5) {
    reasons.push(`stale for ${staleDays} days`)
  }

  if (ageDays >= 14 && status !== "COMPLETED") {
    reasons.push("older work item")
  }

  const delayRisk = clamp(
    urgency * 1.25 + stalenessPressure * 2 + (status === "BACKLOG" ? 8 : 0) + (priority === "critical" ? 10 : 0),
    0,
    100,
  )
  const score = clamp(Math.round(importance + urgency + statusPressure + effortPressure + stalenessPressure), 0, 100)

  return {
    score,
    urgency,
    importance,
    delayRisk: Math.round(delayRisk),
    statusPressure,
    effortPressure,
    reasons: reasons.slice(0, 4),
  }
}

function buildDailyPlan(
  tasks: IntelligenceTask[],
  events: ProductivityEventInput[],
  now: Date,
): DailyPlanBlock[] {
  const todayKey = now.toISOString().slice(0, 10)
  const todayEvents = events
    .map((event) => ({
      ...event,
      start: toDate(event.startTime),
      end: toDate(event.endTime),
    }))
    .filter((event) => event.start?.toISOString().slice(0, 10) === todayKey)
    .sort((left, right) => (left.start?.getTime() ?? 0) - (right.start?.getTime() ?? 0))

  const blocks: DailyPlanBlock[] = [
    {
      time: "08:30",
      title: "Triage and unblock",
      detail: "Review overdue work, due-soon tasks, and any blocked standup items.",
      kind: "admin",
    },
  ]

  const focusSlots = ["09:30", "11:15", "14:00", "16:00"]
  tasks.slice(0, 4).forEach((task, index) => {
    blocks.push({
      time: focusSlots[index] ?? "16:30",
      title: task.title,
      detail: `${projectName(task)} - AI score ${task.ai.score}. ${task.ai.reasons[0] ?? "High leverage work."}`,
      kind: index === 3 ? "review" : "focus",
      taskId: task.id,
    })
  })

  for (const event of todayEvents.slice(0, 4)) {
    if (!event.start) continue
    blocks.push({
      time: event.start.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false }),
      title: event.title,
      detail: event.location ? `${event.type} at ${event.location}` : event.type,
      kind: "meeting",
    })
  }

  blocks.push({
    time: "17:15",
    title: "Close the loop",
    detail: "Update task statuses, write standup notes, and set tomorrow's first focus block.",
    kind: "review",
  })

  return blocks.sort((left, right) => left.time.localeCompare(right.time)).slice(0, 8)
}

function buildMemoryProfile(params: {
  activeTasks: ProductivityTaskInput[]
  completedTasks: ProductivityTaskInput[]
  overdueTasks: ProductivityTaskInput[]
  timeEntries: ProductivityTimeEntryInput[]
}) {
  const focusWindows = new Map<string, number>()
  const completedProjects = new Map<string, number>()
  const tagCounts = new Map<string, number>()
  const overdueProjects = new Map<string, number>()
  const staleTags = new Map<string, number>()

  for (const entry of params.timeEntries) {
    const start = toDate(entry.startTime)
    if (!start) continue
    addCount(focusWindows, modeFromHour(start.getHours()), entry.duration)
  }

  for (const task of params.completedTasks) {
    addCount(completedProjects, task.project?.name)
    task.tags?.forEach((tag) => addCount(tagCounts, tag))
  }

  for (const task of params.overdueTasks) {
    addCount(overdueProjects, task.project?.name)
  }

  for (const task of params.activeTasks) {
    const updatedAt = toDate(task.updatedAt)
    const stale = updatedAt ? daysBetween(new Date(), updatedAt) >= 5 : false
    if (stale) task.tags?.forEach((tag) => addCount(staleTags, tag))
  }

  const preferredFocusWindow = topKeys(focusWindows, 1)[0] ?? "not enough time-tracking data yet"
  const strongestProjectPattern = topKeys(completedProjects, 1)[0] ?? "not enough completed work yet"
  const recurringTaskThemes = topKeys(tagCounts, 4)
  const overloaded = params.activeTasks.length >= 18 || params.overdueTasks.length >= 6
  const heavy = params.activeTasks.length >= 10 || params.overdueTasks.length >= 3
  const light = params.activeTasks.length <= 3

  const procrastinationSignals = [
    ...topKeys(overdueProjects, 2).map((name) => `${name} carries most overdue work`),
    ...topKeys(staleTags, 2).map((tag) => `${tag} tasks tend to go stale`),
  ]

  return {
    preferredFocusWindow,
    strongestProjectPattern,
    recurringTaskThemes,
    procrastinationSignals,
    workloadMode: overloaded ? "overloaded" : heavy ? "heavy" : light ? "light" : "balanced",
  } satisfies AIMemoryProfile
}

export function buildProductivityIntelligence({
  tasks,
  events = [],
  timeEntries = [],
  standups = [],
  commits = [],
  now = new Date(),
}: {
  tasks: ProductivityTaskInput[]
  events?: ProductivityEventInput[]
  timeEntries?: ProductivityTimeEntryInput[]
  standups?: ProductivityStandupInput[]
  commits?: ProductivityCommitInput[]
  now?: Date
}): ProductivityIntelligence {
  const activeTasks = tasks.filter(isActiveTask)
  const completedTasks = tasks.filter((task) => String(task.status).toUpperCase() === "COMPLETED")
  const scoredTasks: IntelligenceTask[] = activeTasks
    .map((task) => ({
      ...task,
      dueDate: toIsoDate(task.dueDate),
      createdAt: toIsoDate(task.createdAt),
      updatedAt: toIsoDate(task.updatedAt),
      ai: scoreTaskPriority(task, now),
    }))
    .sort((left, right) => right.ai.score - left.ai.score)

  const overdueTasks = activeTasks.filter((task) => {
    const due = toDate(task.dueDate)
    return Boolean(due && due < now)
  })
  const dueSoonTasks = activeTasks.filter((task) => {
    const due = toDate(task.dueDate)
    if (!due) return false
    const days = daysBetween(due, now)
    return days >= 0 && days <= 3
  })
  const inReviewTasks = activeTasks.filter((task) => String(task.status).toUpperCase() === "IN_REVIEW")
  const blockedStandups = standups.filter((standup) => Boolean(standup.blockers?.trim()))
  const commitsThisWeek = commits.filter((commit) => {
    const committedAt = toDate(commit.committedAt)
    return committedAt ? daysBetween(now, committedAt) <= 7 : false
  })

  const workloadRisk = clamp(
    overdueTasks.length * 12 + dueSoonTasks.length * 7 + activeTasks.length * 2 + blockedStandups.length * 8,
    0,
    100,
  )
  const focusScore = clamp(
    100 - overdueTasks.length * 9 - dueSoonTasks.length * 4 - blockedStandups.length * 7 + completedTasks.length * 0.8,
    0,
    100,
  )

  const predictiveReminders: PredictiveReminder[] = scoredTasks
    .filter((task) => task.ai.delayRisk >= 35 || task.ai.urgency >= 16)
    .slice(0, 6)
    .map((task) => ({
      taskId: task.id,
      taskTitle: task.title,
      projectName: task.project?.name ?? null,
      dueDate: task.dueDate,
      risk: task.ai.delayRisk,
      message: `${task.title} should be nudged now because it is ${task.ai.reasons.join(", ") || "showing elevated delay risk"}.`,
    }))

  const insights: ProductivityInsight[] = []

  if (overdueTasks.length > 0) {
    insights.push({
      title: "Delay risk detected",
      detail: `${overdueTasks.length} active task${overdueTasks.length === 1 ? "" : "s"} are overdue. Move the highest-scoring one into the next focus block.`,
      tone: overdueTasks.length >= 4 ? "danger" : "warning",
    })
  }

  if (dueSoonTasks.length > 0) {
    insights.push({
      title: "Near-deadline work",
      detail: `${dueSoonTasks.length} task${dueSoonTasks.length === 1 ? "" : "s"} are due within 3 days.`,
      tone: "warning",
    })
  }

  if (blockedStandups.length > 0) {
    insights.push({
      title: "Standup blockers",
      detail: `${blockedStandups.length} recent standup${blockedStandups.length === 1 ? "" : "s"} mention blockers. Review them before new task intake.`,
      tone: "danger",
    })
  }

  if (commitsThisWeek.length > 0) {
    insights.push({
      title: "Code momentum",
      detail: `${commitsThisWeek.length} commit${commitsThisWeek.length === 1 ? "" : "s"} landed this week. Pair Code Ops review with the active sprint before merging.`,
      tone: "success",
    })
  }

  if (inReviewTasks.length >= 3) {
    insights.push({
      title: "Review queue forming",
      detail: `${inReviewTasks.length} tasks are waiting in review. Clear review before starting more implementation work.`,
      tone: "info",
    })
  }

  if (insights.length === 0) {
    insights.push({
      title: "Workspace is stable",
      detail: "No urgent overload pattern is visible. Use the AI focus order to keep momentum predictable.",
      tone: "success",
    })
  }

  const memory = buildMemoryProfile({
    activeTasks,
    completedTasks,
    overdueTasks,
    timeEntries,
  })

  const decisionQueue = [
    scoredTasks[0] ? `Put "${scoredTasks[0].title}" first today.` : "Create a first priority task for today.",
    overdueTasks[0] ? `Renegotiate or split overdue task "${overdueTasks[0].title}".` : "Keep overdue queue empty.",
    blockedStandups[0] ? "Resolve the latest standup blocker before assigning more work." : "Use standup notes to confirm today's owners.",
    inReviewTasks.length ? "Dedicate one review block before new build work." : "Protect one review block for code quality.",
  ].slice(0, 4)

  return {
    generatedAt: now.toISOString(),
    summary: {
      activeTasks: activeTasks.length,
      overdueTasks: overdueTasks.length,
      dueSoonTasks: dueSoonTasks.length,
      inReviewTasks: inReviewTasks.length,
      workloadRisk: Math.round(workloadRisk),
      focusScore: Math.round(focusScore),
    },
    topPriorities: scoredTasks.slice(0, 8),
    predictiveReminders,
    insights: insights.slice(0, 5),
    dailyPlan: buildDailyPlan(scoredTasks, events, now),
    memory,
    decisionQueue,
  }
}
