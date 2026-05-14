"use server"

import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

// Helper to get or create a default user
async function getDefaultUser() {
  let user = await prisma.user.findFirst()
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: "eckintosh@devflow.dev",
        name: "Eckintosh",
        title: "Lead Dev / Full Stack",
      },
    })
  }
  return user
}

export async function createProject(formData: {
  name: string
  description?: string
  priority?: string
  dueDate?: string
}) {
  try {
    const user = await getDefaultUser()

    const project = await prisma.project.create({
      data: {
        name: formData.name,
        description: formData.description || "",
        priority: (formData.priority || "medium").toLowerCase(),
        endDate: formData.dueDate ? new Date(formData.dueDate) : null,
        ownerId: user.id,
      },
    })

    revalidatePath("/")
    revalidatePath("/projects")

    return { success: true, project }
  } catch (error) {
    console.error("Failed to create project:", error)
    return { success: false, error: "Failed to create project" }
  }
}

export async function getProjects() {
  try {
    const projects = await prisma.project.findMany({
      include: {
        _count: {
          select: { tasks: true, members: true },
        },
        tasks: {
          where: { status: "COMPLETED" },
          select: { id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return projects.map((project) => {
      const totalTasks = project._count.tasks
      const completedTasks = project.tasks.length
      const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

      return {
        ...project,
        progress,
      }
    })
  } catch (error) {
    console.error("Failed to fetch projects:", error)
    return []
  }
}

export async function createTask(formData: {
  title: string
  projectId: string
  priority?: string
  dueDate?: string
}) {
  try {
    const task = await prisma.task.create({
      data: {
        title: formData.title,
        projectId: formData.projectId,
        priority: (formData.priority || "medium").toLowerCase(),
        dueDate: formData.dueDate ? new Date(formData.dueDate) : null,
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

export async function getTasks() {
  try {
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

export async function updateTaskStatus(taskId: string, status: string) {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: status as any },
    })

    revalidatePath("/")
    revalidatePath("/tasks")

    return { success: true, task }
  } catch (error) {
    console.error("Failed to update task:", error)
    return { success: false }
  }
}

export async function toggleTaskStatus(taskId: string, isCompleted: boolean) {
  try {
    const task = await prisma.task.update({
      where: { id: taskId },
      data: { status: isCompleted ? "COMPLETED" : "TODO" },
    })

    revalidatePath("/")
    revalidatePath("/tasks")

    return { success: true, task }
  } catch (error) {
    console.error("Failed to toggle task status:", error)
    return { success: false }
  }
}

export async function getDashboardStats() {
  try {
    const [totalProjects, completedProjects, activeProjects, pendingTasks, teamMembers] =
      await Promise.all([
        prisma.project.count(),
        prisma.project.count({ where: { status: "completed" } }),
        prisma.project.count({ where: { status: "active" } }),
        prisma.task.count({ where: { status: { in: ["TODO", "BACKLOG"] } } }),
        prisma.user.count(),
      ])

    // Sprint count
    let activeSprints = 0
    try {
      activeSprints = await prisma.sprint.count({ where: { status: "ACTIVE" } })
    } catch {
      // fallback if schema not synced
    }

    return {
      totalProjects,
      completedProjects,
      activeProjects,
      pendingTasks,
      activeSprints,
      teamMembers,
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
    }
  }
}
