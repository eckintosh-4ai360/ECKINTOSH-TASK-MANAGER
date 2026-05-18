import { cache } from "react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import prisma from "@/lib/prisma"
import { type Permission, hasPermission } from "@/lib/rbac"
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionCookieOptions,
  verifySessionToken,
  type SessionUser,
} from "@/lib/session"

export type { SessionUser } from "@/lib/session"

// ─── Create + store session ───────────────────────────────────────────────────
// Called by: email/password loginAction AND /auth/complete (OAuth bridge)
export async function createSession(user: SessionUser) {
  const token = await createSessionToken(user)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())
}

// ─── Read session ─────────────────────────────────────────────────────────────
// Reads the custom JWT cookie set by createSession().
// Both email/password login and GitHub OAuth (via /auth/complete) set this cookie.
// Wrapped in React.cache() so repeated calls in the same render tree (layout,
// sidebar, header, page) share one result — no redundant DB round-trips.
export const getSession = cache(async (): Promise<SessionUser | null> => {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (token) {
      const session = await verifySessionToken(token)
      if (session) return session
    }

    const authSession = await auth()
    const email = authSession?.user?.email
    if (!email) return null

    const dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    })

    if (!dbUser) return null

    return {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name ?? "User",
      role: dbUser.role,
    }
  } catch {
    return null
  }
})

// ─── Require session (redirects to /login if not authenticated) ───────────────
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession()
  if (!session) redirect("/login")
  return session
}

// ─── Require admin role ───────────────────────────────────────────────────────
export async function requireAdmin(): Promise<SessionUser> {
  const session = await requireSession()
  if (session.role !== "ADMIN") redirect("/")
  return session
}

export async function requirePermission(permission: Permission, redirectTo = "/"): Promise<SessionUser> {
  const session = await requireSession()
  if (!hasPermission(session.role, permission)) redirect(redirectTo)
  return session
}

// ─── Destroy session ──────────────────────────────────────────────────────────
export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
