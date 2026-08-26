import { z } from "zod"

/**
 * Zod schemas for the highest-risk server actions — the ones that take
 * admin-privileged input (user/role/email-credential management) or write
 * raw strings into the database from a form (projects, tasks, sprints,
 * calendar events, standups, notes, comments, invites, deployments, support
 * tickets). Every action wired to one of these gets a clear, single-string
 * error instead of an opaque Prisma failure or a silently-stored garbage
 * value (e.g. updateTask used to do `status: (input.status as any) || "TODO"`
 * — any string at all would pass through uncast).
 *
 * Not exhaustive: read-only getters and lower-risk actions weren't in scope
 * for this pass.
 */

// ─── Shared helper ────────────────────────────────────────────────────────────

export type ValidationResult<T> = { success: true; data: T } | { success: false; error: string }

/**
 * Runs a schema and collapses its result into the single-string error shape
 * every action here already returns on failure, so wiring this in is a
 * drop-in rather than a shape change for callers.
 */
export function validateInput<S extends z.ZodTypeAny>(
  schema: S,
  input: unknown,
): ValidationResult<z.infer<S>> {
  const result = schema.safeParse(input)
  if (result.success) return { success: true, data: result.data }

  const issue = result.error.issues[0]
  return { success: false, error: issue?.message ?? "Invalid input." }
}

// ─── Shared primitives ────────────────────────────────────────────────────────

const cuid = z.string().cuid("Invalid ID.")
const optionalCuid = cuid.optional()

const dateString = z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Invalid date.")

const priority = z
  .string()
  .transform((v) => v.toLowerCase())
  .pipe(z.enum(["low", "medium", "high", "critical"]))

const title = (max = 200) => z.string().trim().min(1, "This field is required.").max(max)
const optionalText = (max = 5000) => z.string().trim().max(max).optional()

// ─── Projects ─────────────────────────────────────────────────────────────────

export const createProjectSchema = z.object({
  name: title(120),
  description: optionalText(2000),
  priority: priority.optional(),
  dueDate: dateString.optional(),
  // Format is validated downstream by syncProjectRepository against GitHub's
  // owner/repo shape specifically — kept loose here so the two never disagree.
  repositoryUrl: z.string().trim().max(500).optional(),
  teamLeaderId: z
    .string({ required_error: "Select a team leader for this project." })
    .cuid("Select a team leader for this project."),
})

export const updateProjectSchema = createProjectSchema.omit({ teamLeaderId: true }).extend({
  id: cuid,
  status: z.enum(["active", "paused", "completed", "archived"]).optional(),
})

// ─── Tasks ────────────────────────────────────────────────────────────────────

export const createTaskSchema = z.object({
  title: title(200),
  description: optionalText(5000),
  projectId: cuid,
  sprintId: optionalCuid,
  priority: priority.optional(),
  dueDate: dateString.optional(),
  tags: z.string().max(300).optional(),
})

export const taskStatusSchema = z.enum(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "COMPLETED", "ARCHIVED"])

export const updateTaskSchema = createTaskSchema.extend({
  id: cuid,
  status: taskStatusSchema.optional(),
  assigneeId: optionalCuid,
})

// ─── Sprints ──────────────────────────────────────────────────────────────────

export const createSprintSchema = z.object({
  name: title(120),
  goal: optionalText(1000),
  projectId: cuid,
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  startDate: dateString.optional(),
  endDate: dateString.optional(),
})

// ─── Calendar ─────────────────────────────────────────────────────────────────

export const createCalendarEventSchema = z.object({
  title: title(200),
  description: optionalText(2000),
  date: dateString,
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time.")
    .optional(),
  endTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Invalid time.")
    .optional(),
  type: z
    .enum(["meeting", "call", "presentation", "workshop", "review", "deadline", "sprint", "task"])
    .optional(),
  location: optionalText(200),
})

// ─── Standups ─────────────────────────────────────────────────────────────────

export const createStandupSchema = z.object({
  didYesterday: title(2000),
  doingToday: title(2000),
  blockers: optionalText(2000),
  // Bad input falls back to 3 rather than erroring, matching the existing
  // Math.max(1, Math.min(5, Number(input.mood) || 3)) behavior it replaces.
  mood: z.coerce.number().int().min(1).max(5).catch(3),
  projectId: optionalCuid,
})

// ─── Notes ────────────────────────────────────────────────────────────────────

export const noteInputSchema = z.object({
  title: z.string().trim().max(200).optional(),
  content: z.string().max(50_000).optional(), // sanitized separately before storage
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/, "Invalid color.")
    .optional(),
})

// ─── Task comments ────────────────────────────────────────────────────────────

export const taskCommentSchema = z.object({
  taskId: cuid,
  content: z.string().trim().min(1, "Comment cannot be empty.").max(4000),
})

// ─── Admin: users ─────────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: title(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  role: z.enum(["ADMIN", "USER", "GUEST"]),
})

export const updateUserRoleSchema = z.object({
  userId: cuid,
  role: z.enum(["ADMIN", "USER", "GUEST"]),
})

// ─── Workspace invites ────────────────────────────────────────────────────────

export const sendWorkspaceInvitesSchema = z.object({
  emails: z
    .array(z.string().trim().toLowerCase().email())
    .min(1, "Provide at least one valid email address.")
    .max(25, "Send at most 25 invitations at a time."),
  role: z.string().optional(),
  message: z.string().trim().max(500).optional(),
})

// ─── Email delivery settings ──────────────────────────────────────────────────

export const emailSettingsSchema = z.object({
  provider: z.enum(["gmail", "smtp"]),
  host: z.string().trim().min(1, "SMTP host is required.").max(255),
  port: z.coerce.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().trim().min(1, "SMTP username is required.").max(255),
  password: z.string().optional(),
  fromEmail: z.string().trim().toLowerCase().email("Enter a valid 'from' email address."),
  fromName: z.string().trim().min(1).max(120),
  enabled: z.boolean(),
})

// ─── Deployments ──────────────────────────────────────────────────────────────

export const createDeploymentSchema = z.object({
  projectId: cuid,
  version: z.string().trim().min(1, "Version is required.").max(60),
  environment: z.enum(["development", "staging", "production"]),
  status: z.enum(["pending", "running", "success", "failed", "rolled_back"]).optional(),
  notes: optionalText(500),
})

// ─── Support tickets ──────────────────────────────────────────────────────────

export const createSupportTicketSchema = z.object({
  category: z.enum(["bug", "feature", "question", "security", "billing", "performance"]),
  priority: z.enum(["low", "medium", "high", "critical"]).catch("medium" as const),
  subject: title(200),
  message: title(5000),
})
