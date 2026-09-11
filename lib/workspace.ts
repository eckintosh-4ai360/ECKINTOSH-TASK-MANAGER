import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { effectiveWorkspaceRole, type WorkspaceRole } from "@/lib/workspace-roles"

export const WORKSPACE_COOKIE_NAME = "spagad_workspace"

export { effectiveWorkspaceRole }
export type { WorkspaceRole }

export type WorkspaceOption = {
  id: string
  name: string
  slug: string
  role: WorkspaceRole
}

export async function getWorkspaceOptionsForUser(userId: string): Promise<WorkspaceOption[]> {
  const memberships = await prisma.workspaceMember.findMany({
    where: { userId },
    select: {
      role: true,
      workspace: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { workspace: { name: "asc" } },
  })

  return memberships.map((membership) => ({
    ...membership.workspace,
    role: membership.role as WorkspaceRole,
  }))
}

export async function getActiveWorkspaceMembership(userId: string, preferredWorkspaceId?: string | null) {
  if (preferredWorkspaceId) {
    const preferred = await prisma.workspaceMember.findFirst({
      where: { userId, workspaceId: preferredWorkspaceId },
      select: {
        workspaceId: true,
        role: true,
        workspace: { select: { id: true, name: true, slug: true } },
      },
    })
    if (preferred) return preferred
  }

  return prisma.workspaceMember.findFirst({
    where: { userId },
    select: {
      workspaceId: true,
      role: true,
      workspace: { select: { id: true, name: true, slug: true } },
    },
    orderBy: { joinedAt: "asc" },
  })
}

export async function getSelectedWorkspaceId() {
  const cookieStore = await cookies()
  return cookieStore.get(WORKSPACE_COOKIE_NAME)?.value ?? null
}

export async function setSelectedWorkspace(workspaceId: string) {
  const cookieStore = await cookies()
  cookieStore.set(WORKSPACE_COOKIE_NAME, workspaceId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  })
}

export async function clearSelectedWorkspace() {
  const cookieStore = await cookies()
  cookieStore.delete(WORKSPACE_COOKIE_NAME)
}
