import type { AppRole } from "@/lib/rbac"

export type WorkspaceRole = "OWNER" | "ADMIN" | "MEMBER" | "VIEWER"

export function effectiveWorkspaceRole(globalRole: AppRole, workspaceRole: WorkspaceRole): AppRole {
  if (globalRole === "ADMIN" || workspaceRole === "OWNER" || workspaceRole === "ADMIN") return "ADMIN"
  if (globalRole === "GUEST" || workspaceRole === "VIEWER") return "GUEST"
  return "USER"
}
