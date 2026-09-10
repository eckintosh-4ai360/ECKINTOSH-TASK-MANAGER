"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { requireWorkspace } from "@/lib/auth"
import { hasPermission, getPermissionError } from "@/lib/rbac"
import { validateInput, createDeploymentSchema } from "@/lib/validation"

export async function createDeploymentAction(input: {
  projectId: string
  version: string
  environment: string
  status?: string
  notes?: string
}) {
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "manage_projects")) {
    return { success: false, error: getPermissionError("manage_projects") }
  }

  const parsed = validateInput(createDeploymentSchema, input)
  if (!parsed.success) return { success: false, error: parsed.error }
  const validated = parsed.data

  const project = await prisma.project.findFirst({ where: { id: validated.projectId, workspaceId: session.workspaceId }, select: { id: true } })
  if (!project) return { success: false, error: "Project not found." }

  const deployment = await prisma.deployment.create({
    data: {
      projectId: validated.projectId,
      version: validated.version,
      environment: validated.environment,
      status: validated.status ?? "success",
      deployedById: session.id,
      notes: validated.notes || null,
    },
  })

  revalidatePath("/")
  revalidatePath("/analytics")
  return { success: true, deployment }
}
