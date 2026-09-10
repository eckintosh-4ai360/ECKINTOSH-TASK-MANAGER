"use server"

import prisma from "@/lib/prisma"
import { requireWorkspace } from "@/lib/auth"
import { syncProjectRepository, getGitHubWorkspaceData } from "@/lib/actions/github-actions"
import { createNotificationsForUsers, getWorkspaceRecipientIds } from "@/lib/notifications"
import { canUpdateTaskStatus, getPermissionError, hasPermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"
import {
  validateInput,
  createProjectSchema,
  updateProjectSchema,
  createTaskSchema,
  updateTaskSchema,
  taskStatusSchema,
} from "@/lib/validation"

async function resolveSprintAssignment(projectId: string, sprintId?: string | null, workspaceId?: string) {
  const normalizedSprintId = sprintId?.trim()

  if (!normalizedSprintId) {
    return { sprintId: null }
  }

  const sprint = await prisma.sprint.findUnique({
    where: { id: normalizedSprintId, ...(workspaceId ? { project: { workspaceId } } : {}) },
    select: {
      id: true,
      projectId: true,
    },
  })

  if (!sprint) {
    return { error: "Selected sprint could not be found." }
  }

  if (sprint.projectId !== projectId) {
    return { error: "Selected sprint must belong to the same project as the task." }
  }

  return { sprintId: sprint.id }
}

export async function createProject(formData: {
  name: string
  description?: string
  priority?: string
  dueDate?: string
  repositoryUrl?: string
  teamLeaderId?: string
}) {
  try {
    const session = await requireWorkspace()
    if (!hasPermission(session.role, "manage_projects")) {
      return { success: false, error: getPermissionError("manage_projects") }
    }

    const parsed = validateInput(createProjectSchema, formData)
    if (!parsed.success) return { success: false, error: parsed.error }
    const input = parsed.data

    const teamLeader = await prisma.user.findUnique({
      where: { id: input.teamLeaderId },
      select: { id: true, name: true, email: true, role: true },
    })
    const teamLeaderMembership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: session.workspaceId, userId: input.teamLeaderId } },
      select: { role: true },
    })

    if (!teamLeader || teamLeader.role === "GUEST" || !teamLeaderMembership || teamLeaderMembership.role === "VIEWER") {
      return { success: false, error: "Select an active workspace member as team leader." }
    }

    const project = await prisma.project.create({
      data: {
        name: input.name,
        description: input.description || "",
        priority: input.priority ?? "medium",
        endDate: input.dueDate ? new Date(input.dueDate) : null,
        tech: [],
        workspaceId: session.workspaceId,
        ownerId: teamLeader.id,
        members: {
          create: {
            user: {
              connect: { id: teamLeader.id },
            },
            role: "lead",
          },
        },
      },
    })

    let repositoryWarning: string | undefined
    if (input.repositoryUrl?.trim()) {
      const repositoryResult = await syncProjectRepository(project.id, input.repositoryUrl)
      if (!repositoryResult.success) {
        repositoryWarning = repositoryResult.error ?? "The project was created, but the repository could not be connected yet."
      }
    }

    const recipients = await getWorkspaceRecipientIds(session.workspaceId, session.id)
    await createNotificationsForUsers({
      userIds: recipients,
      workspaceId: session.workspaceId,
      channel: "teamUpdates",
      title: "New project created",
      message: `${session.name} created ${project.name} with ${teamLeader.name ?? teamLeader.email} as team leader.`,
      type: "info",
      link: "/projects",
      email: {
        senderId: session.id,
        subject: `Project created: ${project.name}`,
      },
    })

    revalidatePath("/")
    revalidatePath("/projects")

    return { success: true, project, repositoryWarning }
  } catch (error) {
    console.error("Failed to create project:", error)
    return { success: false, error: "Failed to create project" }
  }
}

export async function updateProject(input: {
  id: string
  name: string
  description?: string
  priority?: string
  status?: string
  dueDate?: string
  repositoryUrl?: string
}) {
  try {
    const session = await requireWorkspace()
    if (!hasPermission(session.role, "manage_projects")) {
      return { success: false, error: getPermissionError("manage_projects") }
    }

    const parsed = validateInput(updateProjectSchema, input)
    if (!parsed.success) return { success: false, error: parsed.error }
    const validated = parsed.data

    const project = await prisma.project.update({
      where: { id: validated.id, workspaceId: session.workspaceId },
      data: {
        name: validated.name,
        description: validated.description || "",
        priority: validated.priority ?? "medium",
        status: validated.status ?? "active",
        endDate: validated.dueDate ? new Date(validated.dueDate) : null,
      },
    })

    const repositoryResult = await syncProjectRepository(validated.id, validated.repositoryUrl)
    if (!repositoryResult.success) {
      return {
        success: false,
        error: repositoryResult.error ?? "The repository connection could not be updated.",
      }
    }

    const recipients = await getWorkspaceRecipientIds(session.workspaceId, session.id)
    await createNotificationsForUsers({
      userIds: recipients,
      workspaceId: session.workspaceId,
      channel: "teamUpdates",
      title: "Project updated",
      message: `${session.name} updated ${project.name}.`,
      type: "info",
      link: "/projects",
      email: {
        senderId: session.id,
        subject: `Project updated: ${project.name}`,
      },
    })

    revalidatePath("/")
    revalidatePath("/projects")
    revalidatePath("/tasks")
    revalidatePath("/sprints")

    return { success: true, project }
  } catch (error) {
    console.error("Failed to update project:", error)
    return { success: false, error: "Failed to update project" }
  }
}

export async function deleteProject(projectId: string) {
  try {
    const session = await requireWorkspace()
    if (!hasPermission(session.role, "manage_projects")) {
      return { success: false, error: getPermissionError("manage_projects") }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId, workspaceId: session.workspaceId },
      select: { name: true },
    })

    await prisma.project.delete({
      where: { id: projectId, workspaceId: session.workspaceId },
    })

    const recipients = await getWorkspaceRecipientIds(session.workspaceId, session.id)
    await createNotificationsForUsers({
      userIds: recipients,
      workspaceId: session.workspaceId,
      channel: "teamUpdates",
      title: "Project removed",
      message: `${session.name} deleted ${project?.name ?? "a project"}.`,
      type: "warning",
      link: "/projects",
      email: {
        senderId: session.id,
        subject: `Project removed: ${project?.name ?? "Project"}`,
      },
    })

    revalidatePath("/")
    revalidatePath("/projects")
    revalidatePath("/tasks")
    revalidatePath("/sprints")
    revalidatePath("/standups")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete project:", error)
    return { success: false, error: "Failed to delete project" }
  }
}

export async function getProjects() {
  try {
    const session = await requireWorkspace()
    const [projects, completedTaskCounts] = await Promise.all([
      prisma.project.findMany({
        where: { workspaceId: session.workspaceId },
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          priority: true,
          color: true,
          tech: true,
          startDate: true,
          endDate: true,
          ownerId: true,
          owner: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          createdAt: true,
          updatedAt: true,
          repository: {
            select: {
              url: true,
              defaultBranch: true,
              provider: true,
            },
          },
          _count: {
            select: { tasks: true, members: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.task.groupBy({
        by: ["projectId"],
        where: { status: "COMPLETED", project: { workspaceId: session.workspaceId } },
        _count: { _all: true },
      }),
    ])

    const completedTasksByProject = new Map(
      completedTaskCounts.map((item) => [item.projectId, item._count._all])
    )

    return projects.map((project) => {
      const totalTasks = project._count.tasks
      const completedTasks = completedTasksByProject.get(project.id) ?? 0
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      return {
        ...project,
        progress,
        repositoryUrl: project.repository?.url ?? null,
        repositoryProvider: project.repository?.provider ?? null,
        repositoryDefaultBranch: project.repository?.defaultBranch ?? null,
      }
    })
  } catch (error) {
    console.error("Failed to fetch projects:", error)
    return []
  }
}

export async function createTask(formData: {
  title: string
  description?: string
  projectId: string
  sprintId?: string
  priority?: string
  dueDate?: string
  tags?: string
}) {
  try {
    const session = await requireWorkspace()
    if (!hasPermission(session.role, "manage_tasks")) {
      return { success: false, error: getPermissionError("manage_tasks") }
    }

    const parsed = validateInput(createTaskSchema, formData)
    if (!parsed.success) return { success: false, error: parsed.error }
    const input = parsed.data

    const project = await prisma.project.findFirst({ where: { id: input.projectId, workspaceId: session.workspaceId }, select: { id: true } })
    if (!project) return { success: false, error: "Project not found in the active workspace." }

    const sprintAssignment = await resolveSprintAssignment(input.projectId, input.sprintId, session.workspaceId)
    if ("error" in sprintAssignment) {
      return { success: false, error: sprintAssignment.error }
    }

    const task = await prisma.task.create({
      data: {
        title: input.title,
        description: input.description || "",
        projectId: input.projectId,
        sprintId: sprintAssignment.sprintId,
        priority: input.priority ?? "medium",
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        tags: input.tags
          ? input.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
      },
    })

    const recipients = await getWorkspaceRecipientIds(session.workspaceId, session.id)
    await createNotificationsForUsers({
      userIds: recipients,
      workspaceId: session.workspaceId,
      channel: "teamUpdates",
      title: "New task created",
      message: `${session.name} created ${task.title}.`,
      type: "info",
      link: "/tasks",
      email: {
        senderId: session.id,
        subject: `Task created: ${task.title}`,
      },
    })

    revalidatePath("/")
    revalidatePath("/tasks")
    revalidatePath("/projects")
    revalidatePath("/sprints")

    return { success: true, task }
  } catch (error) {
    console.error("Failed to create task:", error)
    return { success: false, error: "Failed to create task" }
  }
}

export async function updateTask(input: {
  id: string
  title: string
  description?: string
  projectId: string
  sprintId?: string
  priority?: string
  dueDate?: string
  tags?: string
  status?: string
  assigneeId?: string
}) {
  try {
    const session = await requireWorkspace()
    if (!hasPermission(session.role, "manage_tasks")) {
      return { success: false, error: getPermissionError("manage_tasks") }
    }

    const parsed = validateInput(updateTaskSchema, input)
    if (!parsed.success) return { success: false, error: parsed.error }
    const validated = parsed.data

    const sprintAssignment = await resolveSprintAssignment(validated.projectId, validated.sprintId, session.workspaceId)
    if ("error" in sprintAssignment) {
      return { success: false, error: sprintAssignment.error }
    }

    const existingTask = await prisma.task.findFirst({
      where: { id: validated.id, project: { workspaceId: session.workspaceId } },
      select: { id: true },
    })
    const project = await prisma.project.findFirst({
      where: { id: validated.projectId, workspaceId: session.workspaceId },
      select: { id: true },
    })
    if (!existingTask || !project) return { success: false, error: "Task or project not found in the active workspace." }
    if (validated.assigneeId) {
      const assignee = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: session.workspaceId, userId: validated.assigneeId } },
        select: { userId: true },
      })
      if (!assignee) return { success: false, error: "Assignee is not a member of the active workspace." }
    }

    const task = await prisma.task.update({
      where: { id: existingTask.id },
      data: {
        title: validated.title,
        description: validated.description || "",
        projectId: validated.projectId,
        sprintId: sprintAssignment.sprintId,
        priority: validated.priority ?? "medium",
        dueDate: validated.dueDate ? new Date(validated.dueDate) : null,
        status: validated.status ?? "TODO",
        assigneeId: validated.assigneeId || null,
        tags: validated.tags
          ? validated.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
      },
      select: {
        id: true,
        title: true,
        assigneeId: true,
      },
    })

    const workspaceRecipients = await getWorkspaceRecipientIds(session.workspaceId, session.id)
    await createNotificationsForUsers({
      userIds: workspaceRecipients,
      workspaceId: session.workspaceId,
      channel: "teamUpdates",
      title: "Task updated",
      message: `${session.name} updated ${task.title}.`,
      type: "info",
      link: "/tasks",
      email: {
        senderId: session.id,
        subject: `Task updated: ${task.title}`,
      },
    })

    if (task.assigneeId && task.assigneeId !== session.id) {
      await createNotificationsForUsers({
        userIds: [task.assigneeId],
        workspaceId: session.workspaceId,
        channel: "taskReminders",
        title: "Task assigned or updated",
        message: `${session.name} updated ${task.title} and it is assigned to you.`,
        type: "info",
        link: "/tasks",
        email: {
          senderId: session.id,
          subject: `Task assigned: ${task.title}`,
        },
      })
    }

    revalidatePath("/")
    revalidatePath("/tasks")
    revalidatePath("/projects")
    revalidatePath("/sprints")

    return { success: true, task }
  } catch (error) {
    console.error("Failed to update task:", error)
    return { success: false, error: "Failed to update task" }
  }
}

export async function deleteTask(taskId: string) {
  try {
    const session = await requireWorkspace()
    if (!hasPermission(session.role, "manage_tasks")) {
      return { success: false, error: getPermissionError("manage_tasks") }
    }

    const task = await prisma.task.findFirst({
      where: { id: taskId, project: { workspaceId: session.workspaceId } },
      select: { title: true },
    })
    if (!task) return { success: false, error: "Task not found in the active workspace." }

    await prisma.task.delete({
      where: { id: taskId },
    })

    const recipients = await getWorkspaceRecipientIds(session.workspaceId, session.id)
    await createNotificationsForUsers({
      userIds: recipients,
      workspaceId: session.workspaceId,
      channel: "teamUpdates",
      title: "Task deleted",
      message: `${session.name} deleted ${task?.title ?? "a task"}.`,
      type: "warning",
      link: "/tasks",
      email: {
        senderId: session.id,
        subject: `Task removed: ${task?.title ?? "Task"}`,
      },
    })

    revalidatePath("/")
    revalidatePath("/tasks")
    revalidatePath("/projects")
    revalidatePath("/sprints")

    return { success: true }
  } catch (error) {
    console.error("Failed to delete task:", error)
    return { success: false, error: "Failed to delete task" }
  }
}

export async function getTasks() {
  try {
    const session = await requireWorkspace()
    const tasks = await prisma.task.findMany({
      include: {
        project: {
          select: { name: true, color: true },
        },
        sprint: {
          select: { id: true, name: true },
        },
        assignee: {
          select: { name: true, avatar: true },
        },
        subtasks: {
          select: { completed: true },
        },
        _count: {
          select: { comments: true },
        },
      },
      where: { project: { workspaceId: session.workspaceId } },
      orderBy: { createdAt: "desc" },
    })
    return tasks.map((task) => ({
      ...task,
      subtaskSummary:
        task.subtasks.length > 0
          ? { total: task.subtasks.length, completed: task.subtasks.filter((s) => s.completed).length }
          : null,
    }))
  } catch (error) {
    console.error("Failed to fetch tasks:", error)
    return []
  }
}

export async function getWorkspaceUsers() {
  try {
    const session = await requireWorkspace()
    return await prisma.user.findMany({
      where: { workspaceMemberships: { some: { workspaceId: session.workspaceId } } },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: [{ role: "asc" }, { name: "asc" }],
    })
  } catch (error) {
    console.error("Failed to fetch workspace users:", error)
    return []
  }
}

export async function updateTaskStatus(taskId: string, status: string) {
  try {
    const session = await requireWorkspace()
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, project: { workspaceId: session.workspaceId } },
      select: { assigneeId: true },
    })

    if (!existingTask) {
      return { success: false, error: "Task not found" }
    }

    if (!canUpdateTaskStatus(session, { assigneeId: existingTask.assigneeId })) {
      return { success: false, error: getPermissionError("update_assigned_task_status") }
    }

    const parsedStatus = validateInput(taskStatusSchema, status)
    if (!parsedStatus.success) return { success: false, error: parsedStatus.error }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: parsedStatus.data },
      select: {
        title: true,
        assigneeId: true,
      },
    })

    if (task.assigneeId && task.assigneeId !== session.id) {
      await createNotificationsForUsers({
        userIds: [task.assigneeId],
        workspaceId: session.workspaceId,
        channel: "taskReminders",
        title: "Task status changed",
        message: `${session.name} changed ${task.title} to ${status.replace(/_/g, " ").toLowerCase()}.`,
        type: "info",
        link: "/tasks",
        email: {
          senderId: session.id,
          subject: `Task status changed: ${task.title}`,
        },
      })
    }

    revalidatePath("/")
    revalidatePath("/tasks")

    return { success: true, task }
  } catch (error) {
    console.error("Failed to update task:", error)
    return { success: false, error: "Failed to update task" }
  }
}

export async function toggleTaskStatus(taskId: string, isCompleted: boolean) {
  try {
    const session = await requireWorkspace()
    const existingTask = await prisma.task.findFirst({
      where: { id: taskId, project: { workspaceId: session.workspaceId } },
      select: { assigneeId: true },
    })

    if (!existingTask) {
      return { success: false, error: "Task not found" }
    }

    if (!canUpdateTaskStatus(session, { assigneeId: existingTask.assigneeId })) {
      return { success: false, error: getPermissionError("update_assigned_task_status") }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: isCompleted ? "COMPLETED" : "TODO" },
      select: {
        title: true,
        assigneeId: true,
      },
    })

    if (task.assigneeId && task.assigneeId !== session.id) {
      await createNotificationsForUsers({
        userIds: [task.assigneeId],
        workspaceId: session.workspaceId,
        channel: "taskReminders",
        title: isCompleted ? "Task completed" : "Task reopened",
        message: `${session.name} ${isCompleted ? "completed" : "reopened"} ${task.title}.`,
        type: isCompleted ? "success" : "info",
        link: "/tasks",
        email: {
          senderId: session.id,
          subject: `${isCompleted ? "Task completed" : "Task reopened"}: ${task.title}`,
        },
      })
    }

    revalidatePath("/")
    revalidatePath("/tasks")

    return { success: true, task }
  } catch (error) {
    console.error("Failed to toggle task status:", error)
    return { success: false, error: "Failed to update task status" }
  }
}

export async function getDashboardStats() {
  try {
    const session = await requireWorkspace()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalProjects, completedProjects, activeProjects, pendingTasks, teamMembers, activeSprints, deployments, workspaceData] =
      await Promise.all([
        prisma.project.count({ where: { workspaceId: session.workspaceId } }),
        prisma.project.count({ where: { workspaceId: session.workspaceId, status: "completed" } }),
        prisma.project.count({ where: { workspaceId: session.workspaceId, status: "active" } }),
        prisma.task.count({ where: { status: { in: ["TODO", "BACKLOG"] }, project: { workspaceId: session.workspaceId } } }),
        prisma.workspaceMember.count({ where: { workspaceId: session.workspaceId } }),
        prisma.sprint.count({ where: { status: "ACTIVE", project: { workspaceId: session.workspaceId } } }),
        prisma.deployment.count({ where: { deployedAt: { gte: weekAgo }, project: { workspaceId: session.workspaceId } } }),
        getGitHubWorkspaceData().catch(() => null)
      ])

    let commitsToday = 0
    if (workspaceData && workspaceData.activityStream) {
      commitsToday = workspaceData.activityStream.filter(c => new Date(c.committedAt) >= today).length
    }

    return {
      totalProjects,
      completedProjects,
      activeProjects,
      pendingTasks,
      activeSprints,
      teamMembers,
      deployments,
      commitsToday,
    }
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error)
    return {
      totalProjects: 0,
      completedProjects: 0,
      activeProjects: 0,
      pendingTasks: 0,
      activeSprints: 0,
      teamMembers: 0,
      deployments: 0,
      commitsToday: 0,
    }
  }
}

export async function getDeployments() {
  try {
    const session = await requireWorkspace()
    return await prisma.deployment.findMany({
      where: { project: { workspaceId: session.workspaceId } },
      include: {
        project: {
          select: { name: true, color: true },
        },
      },
      orderBy: { deployedAt: "desc" },
      take: 20,
    })
  } catch (error) {
    console.error("Failed to fetch deployments:", error)
    return []
  }
}
