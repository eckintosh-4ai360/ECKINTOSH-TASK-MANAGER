"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { sanitizeNoteHtml } from "@/lib/sanitize-html"
import { createProject, createTask } from "@/lib/actions/project-actions"
import { createCalendarEvent } from "@/lib/actions/calendar-actions"
import { createSprint } from "@/lib/actions/sprint-actions"
import { createNote } from "@/lib/actions/note-actions"
import { getGitHubWorkspaceData } from "@/lib/actions/github-actions"
import { generateGroqJson } from "@/lib/ai/groq"
import {
  buildProductivityIntelligence,
  type ProductivityIntelligence,
} from "@/lib/ai/productivity-engine"
import { marked } from "marked"


// ─── Workspace Context ──────────────────────────────────────────────────────

export async function getAIWorkspaceContext() {
  try {
    const session = await requireSession()

    const [projects, tasks, calendarEvents, sprints, notes] = await Promise.all([
      prisma.project.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          priority: true,
          color: true,
          _count: { select: { tasks: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.task.findMany({
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          project: { select: { id: true, name: true } },
          sprint: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.calendarEvent.findMany({
        select: {
          id: true,
          title: true,
          type: true,
          startTime: true,
          endTime: true,
          location: true,
        },
        where: {
          startTime: { gte: new Date() },
        },
        orderBy: { startTime: "asc" },
        take: 15,
      }),
      prisma.sprint.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          goal: true,
          startDate: true,
          endDate: true,
          project: { select: { id: true, name: true } },
          _count: { select: { tasks: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        take: 10,
      }),
      prisma.note.findMany({
        select: {
          id: true,
          title: true,
          content: true,
          pinned: true,
          updatedAt: true,
        },
        orderBy: [{ pinned: "desc" }, { updatedAt: "desc" }],
        take: 10,
      }),
    ])

    const teamMembers = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true },
      orderBy: { name: "asc" },
    })

    return {
      user: {
        id: session.id,
        name: session.name,
        email: session.email,
        role: session.role,
      },
      projects: projects.map((p) => ({
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        taskCount: p._count.tasks,
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate?.toISOString() ?? null,
        project: t.project?.name ?? null,
        projectId: t.project?.id ?? null,
        sprint: t.sprint?.name ?? null,
        sprintId: t.sprint?.id ?? null,
      })),
      calendarEvents: calendarEvents.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        startTime: e.startTime.toISOString(),
        endTime: e.endTime.toISOString(),
        location: e.location ?? null,
      })),
      sprints: sprints.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        goal: s.goal ?? null,
        startDate: s.startDate?.toISOString() ?? null,
        endDate: s.endDate?.toISOString() ?? null,
        project: s.project?.name ?? null,
        projectId: s.project?.id ?? null,
        taskCount: s._count.tasks,
      })),
      notes: notes.map((n) => ({
        id: n.id,
        title: n.title,
        content: n.content.replace(/<[^>]*>/g, "").slice(0, 200),
        pinned: n.pinned,
        updatedAt: n.updatedAt.toISOString(),
      })),
      teamMembers: teamMembers.map((m) => ({
        id: m.id,
        name: m.name ?? m.email,
        role: m.role,
      })),
    }
  } catch (error) {
    console.error("Failed to fetch AI workspace context:", error)
    return null
  }
}

// ─── Productivity Intelligence ───────────────────────────────────────────────

export async function getAIProductivityIntelligence(): Promise<ProductivityIntelligence> {
  const session = await requireSession()
  const now = new Date()
  const recentWindow = new Date(now)
  recentWindow.setDate(recentWindow.getDate() - 45)

  const [tasks, calendarEvents, timeEntries, standups, githubWorkspace] = await Promise.all([
    prisma.task.findMany({
      where: {
        OR: [
          { status: { notIn: ["COMPLETED", "ARCHIVED"] } },
          { updatedAt: { gte: recentWindow } },
        ],
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        estimate: true,
        createdAt: true,
        updatedAt: true,
        tags: true,
        project: { select: { id: true, name: true, color: true } },
        assignee: { select: { id: true, name: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
      take: 120,
    }),
    prisma.calendarEvent.findMany({
      where: {
        startTime: {
          gte: now,
        },
      },
      select: {
        id: true,
        title: true,
        type: true,
        startTime: true,
        endTime: true,
        location: true,
      },
      orderBy: { startTime: "asc" },
      take: 30,
    }),
    prisma.timeEntry.findMany({
      where: {
        userId: session.id,
        startTime: { gte: recentWindow },
      },
      select: {
        id: true,
        duration: true,
        startTime: true,
        endTime: true,
        task: {
          select: {
            title: true,
            tags: true,
            project: { select: { name: true } },
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: 120,
    }),
    prisma.standup.findMany({
      where: {
        date: { gte: recentWindow },
      },
      select: {
        id: true,
        didYesterday: true,
        doingToday: true,
        blockers: true,
        mood: true,
        date: true,
        project: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      take: 40,
    }),
    getGitHubWorkspaceData().catch(() => null),
  ])

  return buildProductivityIntelligence({
    tasks,
    events: calendarEvents,
    timeEntries,
    standups,
    commits: githubWorkspace?.activityStream ?? [],
    now,
  })
}

// ─── Smart Task Capture ──────────────────────────────────────────────────────

export type SmartTaskDraft = {
  title: string
  description: string
  priority: "low" | "medium" | "high" | "critical"
  dueDate: string | null
  tags: string[]
  projectId: string | null
  confidence: number
  explanation: string
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10)
}

function fallbackSmartTaskDraft(input: {
  text: string
  projects: { id: string; name: string }[]
  defaultProjectId?: string | null
}): SmartTaskDraft {
  const text = input.text.trim()
  const lower = text.toLowerCase()
  const today = new Date()
  let dueDate: string | null = null

  if (/\btomorrow\b/.test(lower)) {
    dueDate = formatDateOnly(addDays(today, 1))
  } else if (/\btoday\b/.test(lower)) {
    dueDate = formatDateOnly(today)
  } else if (/\bnext week\b/.test(lower)) {
    dueDate = formatDateOnly(addDays(today, 7))
  }

  const explicitDate = lower.match(/\b(20\d{2}-\d{2}-\d{2})\b/)
  if (explicitDate) dueDate = explicitDate[1]

  const priority =
    /\b(urgent|critical|blocker|asap)\b/.test(lower) ? "critical" :
    /\b(high|important)\b/.test(lower) ? "high" :
    /\b(low|later|someday)\b/.test(lower) ? "low" : "medium"

  const matchedProject = input.projects.find((project) =>
    lower.includes(project.name.toLowerCase()),
  )

  const tags = [
    /\bbug|fix|error|issue\b/.test(lower) ? "bug" : null,
    /\bmeeting|sync|call\b/.test(lower) ? "meeting" : null,
    /\bdoc|docs|documentation\b/.test(lower) ? "documentation" : null,
    /\bdesign|ui|ux\b/.test(lower) ? "design" : null,
  ].filter((tag): tag is string => Boolean(tag))

  return {
    title: text.replace(/\s+/g, " ").slice(0, 120),
    description: text,
    priority,
    dueDate,
    tags,
    projectId: matchedProject?.id ?? input.defaultProjectId ?? input.projects[0]?.id ?? null,
    confidence: dueDate || matchedProject ? 0.72 : 0.55,
    explanation: "Drafted from keyword and date-pattern parsing.",
  }
}

export async function aiParseTaskCapture(input: {
  text: string
  projects: { id: string; name: string }[]
  defaultProjectId?: string | null
}): Promise<{ success: true; draft: SmartTaskDraft } | { success: false; error: string }> {
  await requireSession()

  const text = input.text.trim()
  if (!text) {
    return { success: false, error: "Describe the task first." }
  }

  const fallback = fallbackSmartTaskDraft(input)
  const today = formatDateOnly(new Date())

  const draft = await generateGroqJson<SmartTaskDraft>({
    fallback,
    system: "You extract task management fields from natural language. Return strict JSON only.",
    prompt: JSON.stringify({
      today,
      instruction:
        "Extract a practical task draft. Pick projectId only from the supplied projects. Use YYYY-MM-DD for dueDate or null. Keep title short. Priority must be low, medium, high, or critical. Tags should be lowercase one-word labels.",
      text,
      projects: input.projects,
      defaultProjectId: input.defaultProjectId ?? null,
      shape: {
        title: "string",
        description: "string",
        priority: "low | medium | high | critical",
        dueDate: "YYYY-MM-DD | null",
        tags: ["string"],
        projectId: "string | null",
        confidence: "0 to 1",
        explanation: "string",
      },
    }),
  })

  const projectIds = new Set(input.projects.map((project) => project.id))
  const normalizedDraft: SmartTaskDraft = {
    title: draft.title?.trim() || fallback.title,
    description: draft.description?.trim() || fallback.description,
    priority: ["low", "medium", "high", "critical"].includes(draft.priority)
      ? draft.priority
      : fallback.priority,
    dueDate: draft.dueDate && /^\d{4}-\d{2}-\d{2}$/.test(draft.dueDate) ? draft.dueDate : fallback.dueDate,
    tags: Array.isArray(draft.tags)
      ? draft.tags.map((tag) => String(tag).trim().toLowerCase()).filter(Boolean).slice(0, 6)
      : fallback.tags,
    projectId: draft.projectId && projectIds.has(draft.projectId) ? draft.projectId : fallback.projectId,
    confidence: Math.max(0, Math.min(1, Number(draft.confidence) || fallback.confidence)),
    explanation: draft.explanation?.trim() || fallback.explanation,
  }

  return { success: true, draft: normalizedDraft }
}

// ─── AI Tool Executors ───────────────────────────────────────────────────────

export async function aiCreateProject(args: {
  name: string
  description?: string
  priority?: string
  dueDate?: string
  teamLeaderId?: string
}) {
  return createProject(args)
}

export async function aiCreateTask(args: {
  title: string
  description?: string
  projectId: string
  sprintId?: string
  priority?: string
  dueDate?: string
  tags?: string
}) {
  return createTask(args)
}

export async function aiCreateCalendarEvent(args: {
  title: string
  description?: string
  date: string
  startTime?: string
  endTime?: string
  type?: string
  location?: string
}) {
  return createCalendarEvent(args)
}

export async function aiCreateSprint(args: {
  name: string
  goal?: string
  projectId: string
  status?: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED"
  startDate?: string
  endDate?: string
}) {
  return createSprint(args)
}

export async function aiCreateNote(args: {
  title: string
  content: string
  color?: string
}) {
  // marked does not sanitize, and this is model output heading straight for
  // dangerouslySetInnerHTML.
  const htmlContent = sanitizeNoteHtml(await marked.parse(args.content))
  return createNote({
    title: args.title,
    content: htmlContent,
    color: args.color ?? "#00d4ff",
  })
}
