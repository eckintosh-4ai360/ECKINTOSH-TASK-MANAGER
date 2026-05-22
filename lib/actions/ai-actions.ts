"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { createProject, createTask } from "@/lib/actions/project-actions"
import { createCalendarEvent } from "@/lib/actions/calendar-actions"
import { createSprint } from "@/lib/actions/sprint-actions"
import { createNote } from "@/lib/actions/note-actions"

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
  return createNote({
    title: args.title,
    content: args.content,
    color: args.color ?? "#00d4ff",
  })
}
