"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { listGitHubCommits, parseGitHubRepositoryUrl, isGitHubConfigured } from "@/lib/github"
import { getPusherServer, WORKSPACE_PRESENCE_CHANNEL } from "@/lib/pusher/server"

export type TeamMemberActivity = {
  id: string
  name: string
  initials: string
  role: string
  color: string
  online: boolean
  tasksToday: number
  commits: number
  hoursLogged: number
  project: string
}

const PREDEFINED_COLORS: Record<string, string> = {
  Spagad: "#00d4ff",
  Jay: "#a855f7",
  Kemi: "#10b981",
  Tunde: "#f59e0b",
}

const FALLBACK_COLORS = ["#ec4899", "#3b82f6", "#ef4444", "#06b6d4", "#8b5cf6"]

function getInitials(name?: string | null, email?: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  return email ? email.slice(0, 2).toUpperCase() : "US"
}

/**
 * Fetch today's GitHub commits across all connected repositories.
 * Returns an array of lowercase author identifiers (GitHub login or git author name).
 * Returns [] silently if GitHub is not configured or the API call fails.
 */
async function getTodaysCommitAuthors(startOfToday: Date): Promise<string[]> {
  if (!isGitHubConfigured()) return []

  try {
    const repos = await prisma.repository.findMany({
      select: { url: true, defaultBranch: true },
    })

    if (repos.length === 0) return []

    const results = await Promise.allSettled(
      repos.map(async (repo) => {
        const parsed = parseGitHubRepositoryUrl(repo.url)
        if (!parsed) return []

        // Fetch up to 30 recent commits — enough to cover a working day
        const commits = await listGitHubCommits(parsed.owner, parsed.repo, repo.defaultBranch, 30)

        return commits
          .filter((c) => {
            const date = c.commit.author?.date
            return date ? new Date(date) >= startOfToday : false
          })
          .map((c) =>
            // Prefer the GitHub login (e.g. "spagad"), fall back to git author name
            (c.author?.login ?? c.commit.author?.name ?? "").toLowerCase().trim()
          )
          .filter(Boolean)
      })
    )

    return results.flatMap((r) => (r.status === "fulfilled" ? r.value : []))
  } catch {
    // GitHub API may be unavailable — degrade gracefully
    return []
  }
}

export async function getTeamActivityData(): Promise<TeamMemberActivity[]> {
  await requireSession()

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  // ── Fetch all users ────────────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, title: true },
    orderBy: { name: "asc" },
  })

  // ── Fetch today's commit author identifiers from GitHub (one call, shared) ─
  const todaysAuthors = await getTodaysCommitAuthors(startOfToday)

  // ── Online presence via Pusher presence channel or local sockets ───────────
  const onlineUserIds = new Set<string>()
  const clientsMap = (global as any).onlineUsersSet as Map<string, any> | undefined
  if (clientsMap) {
    for (const [userId, sockets] of clientsMap.entries()) {
      if (sockets && (sockets instanceof Set ? sockets.size > 0 : true)) {
        onlineUserIds.add(userId)
      }
    }
  } else {
    const pusher = getPusherServer()
    if (pusher) {
      try {
        const res = await pusher.get({ path: `/channels/${WORKSPACE_PRESENCE_CHANNEL}/users` })
        if (res.status === 200) {
          const body = (await res.json()) as { users: { id: string }[] }
          if (body?.users) {
            body.users.forEach((u) => onlineUserIds.add(u.id))
          }
        }
      } catch {
        // Fallback gracefully
      }
    }
  }

  // ── Build per-user activity records ───────────────────────────────────────
  const activities: TeamMemberActivity[] = await Promise.all(
    users.map(async (user, index) => {
      const displayName = user.name ?? user.email.split("@")[0]
      // Both identifiers lowercased for case-insensitive GitHub matching
      const nameLower = displayName.toLowerCase()
      const emailPrefix = user.email.split("@")[0].toLowerCase()

      // Tasks completed today
      const tasksCompletedToday = await prisma.task.count({
        where: {
          assigneeId: user.id,
          status: "COMPLETED",
          updatedAt: { gte: startOfToday },
        },
      })

      // Hours logged today from TimeEntry records
      const timeEntriesToday = await prisma.timeEntry.aggregate({
        _sum: { duration: true },
        where: { userId: user.id, startTime: { gte: startOfToday } },
      })
      const minutesToday = timeEntriesToday._sum.duration ?? 0
      const hoursLogged = Math.round((minutesToday / 60) * 10) / 10

      // Active project — name of the project from the most recently updated task
      const latestTask = await prisma.task.findFirst({
        where: { assigneeId: user.id },
        orderBy: { updatedAt: "desc" },
        select: { project: { select: { name: true } } },
      })
      const activeProjectName = latestTask?.project.name ?? "DevFlow Platform"

      // Real-time online status via presence
      const online = onlineUserIds.has(user.id)

      const initials = getInitials(user.name, user.email)
      const roleTitle = user.title ?? (user.role === "ADMIN" ? "Lead Developer" : "Software Engineer")
      const color = PREDEFINED_COLORS[displayName] ?? FALLBACK_COLORS[index % FALLBACK_COLORS.length]

      // ── Real commit count ────────────────────────────────────────────────
      // Match the GitHub commit's authorName (login or git name, lowercased)
      // against the user's display name or email prefix — both also lowercased.
      const commits = todaysAuthors.filter(
        (author) => author === nameLower || author === emailPrefix
      ).length

      return {
        id: user.id,
        name: displayName,
        initials,
        role: roleTitle,
        color,
        online,
        tasksToday: tasksCompletedToday,
        commits,
        hoursLogged,
        project: activeProjectName,
      }
    })
  )

  return activities
}
