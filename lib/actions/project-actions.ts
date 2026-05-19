"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { syncProjectRepository, getGitHubWorkspaceData } from "@/lib/actions/github-actions"
import { createNotificationsForUsers, getWorkspaceRecipientIds } from "@/lib/notifications"
import { canUpdateTaskStatus, getPermissionError, hasPermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

export async function createProject(formData: {
  name: string
  description?: string
  priority?: string
  dueDate?: string
  repositoryUrl?: string
  teamLeaderId?: string
}) {
  try {
    const session = await requireSession()
    if (!hasPermission(session.role, "manage_projects")) {
      return { success: false, error: getPermissionError("manage_projects") }
    }

    const name = formData.name.trim()
    if (!name) {
      return { success: false, error: "Project name is required." }
    }

    if (!formData.teamLeaderId) {
      return { success: false, error: "Select a team leader for this project." }
    }

    const teamLeader = await prisma.user.findUnique({
      where: { id: formData.teamLeaderId },
      select: { id: true, name: true, email: true, role: true },
    })

    if (!teamLeader || teamLeader.role === "GUEST") {
      return { success: false, error: "Select an active workspace member as team leader." }
    }

    const project = await prisma.project.create({
      data: {
        name,
        description: formData.description?.trim() || "",
        priority: (formData.priority || "medium").toLowerCase(),
        endDate: formData.dueDate ? new Date(formData.dueDate) : null,
        tech: [],
        owner: {
          connect: { id: teamLeader.id },
        },
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
    if (formData.repositoryUrl?.trim()) {
      const repositoryResult = await syncProjectRepository(project.id, formData.repositoryUrl)
      if (!repositoryResult.success) {
        repositoryWarning = repositoryResult.error ?? "The project was created, but the repository could not be connected yet."
      }
    }

    const recipients = await getWorkspaceRecipientIds(session.id)
    await createNotificationsForUsers({
      userIds: recipients,
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
    const session = await requireSession()
    if (!hasPermission(session.role, "manage_projects")) {
      return { success: false, error: getPermissionError("manage_projects") }
    }

    const project = await prisma.project.update({
      where: { id: input.id },
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || "",
        priority: (input.priority || "medium").toLowerCase(),
        status: (input.status || "active").toLowerCase(),
        endDate: input.dueDate ? new Date(input.dueDate) : null,
      },
    })

    const repositoryResult = await syncProjectRepository(input.id, input.repositoryUrl)
    if (!repositoryResult.success) {
      return {
        success: false,
        error: repositoryResult.error ?? "The repository connection could not be updated.",
      }
    }

    const recipients = await getWorkspaceRecipientIds(session.id)
    await createNotificationsForUsers({
      userIds: recipients,
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
    const session = await requireSession()
    if (!hasPermission(session.role, "manage_projects")) {
      return { success: false, error: getPermissionError("manage_projects") }
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    })

    await prisma.project.delete({
      where: { id: projectId },
    })

    const recipients = await getWorkspaceRecipientIds(session.id)
    await createNotificationsForUsers({
      userIds: recipients,
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
    await requireSession()
    const [projects, completedTaskCounts] = await Promise.all([
      prisma.project.findMany({
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
        where: { status: "COMPLETED" },
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
  priority?: string
  dueDate?: string
  tags?: string
}) {
  try {
    const session = await requireSession()
    if (!hasPermission(session.role, "manage_tasks")) {
      return { success: false, error: getPermissionError("manage_tasks") }
    }

    const task = await prisma.task.create({
      data: {
        title: formData.title,
        description: formData.description || "",
        projectId: formData.projectId,
        priority: (formData.priority || "medium").toLowerCase(),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
        tags: formData.tags
          ? formData.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
      },
    })

    const recipients = await getWorkspaceRecipientIds(session.id)
    await createNotificationsForUsers({
      userIds: recipients,
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
    revalidatePath(`/projects/${formData.projectId}`)

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
  priority?: string
  dueDate?: string
  tags?: string
  status?: string
  assigneeId?: string
}) {
  try {
    const session = await requireSession()
    if (!hasPermission(session.role, "manage_tasks")) {
      return { success: false, error: getPermissionError("manage_tasks") }
    }

    const task = await prisma.task.update({
      where: { id: input.id },
      data: {
        title: input.title.trim(),
        description: input.description?.trim() || "",
        projectId: input.projectId,
        priority: (input.priority || "medium").toLowerCase(),
        dueDate: input.dueDate ? new Date(input.dueDate) : null,
        status: (input.status as any) || "TODO",
        assigneeId: input.assigneeId || null,
        tags: input.tags
          ? input.tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
      },
      select: {
        id: true,
        title: true,
        assigneeId: true,
      },
    })

    const workspaceRecipients = await getWorkspaceRecipientIds(session.id)
    await createNotificationsForUsers({
      userIds: workspaceRecipients,
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
    const session = await requireSession()
    if (!hasPermission(session.role, "manage_tasks")) {
      return { success: false, error: getPermissionError("manage_tasks") }
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      select: { title: true },
    })

    await prisma.task.delete({
      where: { id: taskId },
    })

    const recipients = await getWorkspaceRecipientIds(session.id)
    await createNotificationsForUsers({
      userIds: recipients,
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
    await requireSession()
    const tasks = await prisma.task.findMany({
      include: {
        project: {
          select: { name: true, color: true },
        },
        assignee: {
          select: { name: true, avatar: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })
    return tasks
  } catch (error) {
    console.error("Failed to fetch tasks:", error)
    return []
  }
}

export async function getWorkspaceUsers() {
  try {
    await requireSession()
    return await prisma.user.findMany({
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
    const session = await requireSession()
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
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
      data: { status: status as any },
      select: {
        title: true,
        assigneeId: true,
      },
    })

    if (task.assigneeId && task.assigneeId !== session.id) {
      await createNotificationsForUsers({
        userIds: [task.assigneeId],
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
    const session = await requireSession()
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
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
    await requireSession()
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [totalProjects, completedProjects, activeProjects, pendingTasks, teamMembers, activeSprints, deployments, workspaceData] =
      await Promise.all([
        prisma.project.count(),
        prisma.project.count({ where: { status: "completed" } }),
        prisma.project.count({ where: { status: "active" } }),
        prisma.task.count({ where: { status: { in: ["TODO", "BACKLOG"] } } }),
        prisma.user.count(),
        prisma.sprint.count({ where: { status: "ACTIVE" } }),
        prisma.deployment.count({ where: { deployedAt: { gte: weekAgo } } }),
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
    await requireSession()
    return await prisma.deployment.findMany({
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
