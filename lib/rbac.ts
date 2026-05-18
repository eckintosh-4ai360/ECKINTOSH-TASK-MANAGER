export type AppRole = "ADMIN" | "USER" | "GUEST"

export type Permission =
  | "manage_users"
  | "manage_projects"
  | "manage_tasks"
  | "update_assigned_task_status"
  | "manage_sprints"
  | "post_standups"
  | "manage_calendar"
  | "manage_team"
  | "use_messages"
  | "use_email"
  | "use_repository_workspace"
  | "merge_pull_requests"
  | "manage_own_notes"
  | "view_analytics"
  | "export_reports"

type Actor = {
  id: string
  role: AppRole
}

type TaskActorScope = {
  assigneeId: string | null
}

const ALL_PERMISSIONS: Permission[] = [
  "manage_users",
  "manage_projects",
  "manage_tasks",
  "update_assigned_task_status",
  "manage_sprints",
  "post_standups",
  "manage_calendar",
  "manage_team",
  "use_messages",
  "use_email",
  "use_repository_workspace",
  "merge_pull_requests",
  "manage_own_notes",
  "view_analytics",
  "export_reports",
]

const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  ADMIN: ALL_PERMISSIONS,
  USER: [
    "update_assigned_task_status",
    "post_standups",
    "use_messages",
    "use_email",
    "use_repository_workspace",
    "manage_own_notes",
    "view_analytics",
  ],
  GUEST: [],
}

const PERMISSION_ERRORS: Record<Permission, string> = {
  manage_users: "Only admins can manage workspace users.",
  manage_projects: "Only admins can create, edit, or delete projects.",
  manage_tasks: "Only admins can create, edit, or delete tasks.",
  update_assigned_task_status: "You can only update the status of tasks assigned to you.",
  manage_sprints: "Only admins can create, edit, or delete sprints.",
  post_standups: "Only admins and active team members can post standups.",
  manage_calendar: "Only admins can schedule, edit, or delete calendar events.",
  manage_team: "Only admins can manage team membership.",
  use_messages: "Your role does not allow direct messaging.",
  use_email: "Your role does not allow internal email.",
  use_repository_workspace: "Your role does not allow repository workspace access.",
  merge_pull_requests: "Only admins can merge pull requests from inside the workspace.",
  manage_own_notes: "Your role does not allow private notes.",
  view_analytics: "Your role does not have access to analytics.",
  export_reports: "Only admins can export workspace reports.",
}

export function hasPermission(role: AppRole, permission: Permission) {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissionError(permission: Permission) {
  return PERMISSION_ERRORS[permission]
}

export function canUpdateTaskStatus(actor: Actor, task: TaskActorScope) {
  return hasPermission(actor.role, "manage_tasks")
    || (hasPermission(actor.role, "update_assigned_task_status") && task.assigneeId === actor.id)
}

export function canManageStandup(actor: Actor, standupUserId: string) {
  return hasPermission(actor.role, "post_standups") && actor.id === standupUserId
    || hasPermission(actor.role, "manage_projects")
}
