"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { requireSession, requireWorkspace } from "@/lib/auth"
import { getWorkspaceOptionsForUser, setSelectedWorkspace, type WorkspaceRole } from "@/lib/workspace"

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "workspace"
}

export async function getWorkspaceOptionsAction() {
  const session = await requireSession()
  return getWorkspaceOptionsForUser(session.id)
}

export async function switchWorkspaceAction(workspaceId: string) {
  const session = await requireSession()
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.id, workspaceId },
    select: { workspaceId: true },
  })

  if (!membership) return { success: false, error: "You are not a member of that workspace." }

  await setSelectedWorkspace(workspaceId)
  revalidatePath("/", "layout")
  return { success: true }
}

export async function createWorkspaceAction(input: { name: string; description?: string }) {
  const session = await requireSession()
  if (session.role === "GUEST") return { success: false, error: "Viewers cannot create workspaces." }
  const name = input.name.trim().slice(0, 120)
  if (!name) return { success: false, error: "Workspace name is required." }

  const baseSlug = slugify(name)
  let slug = baseSlug
  for (let attempt = 2; attempt <= 100; attempt += 1) {
    const exists = await prisma.workspace.findUnique({ where: { slug }, select: { id: true } })
    if (!exists) break
    slug = `${baseSlug}-${attempt}`
  }

  const workspace = await prisma.workspace.create({
    data: {
      name,
      slug,
      description: input.description?.trim().slice(0, 500) || null,
      createdById: session.id,
      members: {
        create: { userId: session.id, role: "OWNER" },
      },
    },
    select: { id: true },
  })

  await setSelectedWorkspace(workspace.id)
  revalidatePath("/", "layout")
  return { success: true, workspaceId: workspace.id }
}

export async function getCurrentWorkspaceAction() {
  const session = await requireWorkspace()
  return {
    id: session.workspaceId,
    name: session.workspaceName,
    slug: session.workspaceSlug,
    role: session.workspaceRole as WorkspaceRole,
  }
}
