"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { hasPermission, getPermissionError } from "@/lib/rbac"

const VALID_ENVIRONMENTS = ["development", "staging", "production"]
const VALID_STATUSES = ["pending", "running", "success", "failed", "rolled_back"]
const MAX_NOTES_LENGTH = 500

export async function createDeploymentAction(input: {
  projectId: string
  version: string
  environment: string
  status?: string
  notes?: string
}) {
  const session = await requireSession()
  if (!hasPermission(session.role, "manage_projects")) {
    return { success: false, error: getPermissionError("manage_projects") }
  }

  const version = input.version.trim()
  if (!version) return { success: false, error: "Version is required." }
  if (!VALID_ENVIRONMENTS.includes(input.environment)) {
    return { success: false, error: "Invalid environment." }
  }

  const status = input.status && VALID_STATUSES.includes(input.status) ? input.status : "success"

  const project = await prisma.project.findUnique({ where: { id: input.projectId }, select: { id: true } })
  if (!project) return { success: false, error: "Project not found." }

  const deployment = await prisma.deployment.create({
    data: {
      projectId: input.projectId,
      version,
      environment: input.environment,
      status,
      deployedById: session.id,
      notes: input.notes?.trim().slice(0, MAX_NOTES_LENGTH) || null,
    },
  })

  revalidatePath("/")
  revalidatePath("/analytics")
  return { success: true, deployment }
}
