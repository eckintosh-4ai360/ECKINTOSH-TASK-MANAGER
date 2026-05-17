import { cookies } from "next/headers"
import { redirect } from "next/navigation"
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
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value
    if (!token) return null

    return verifySessionToken(token)
  } catch {
    return null
  }
}

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
