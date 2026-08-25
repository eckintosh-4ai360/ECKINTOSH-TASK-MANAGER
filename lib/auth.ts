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


export async function createSession(user: SessionUser) {
  const token = await createSessionToken(user)

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())
}

/**
 * Resolves the caller's identity, then re-reads the authoritative record.
 *
 * The JWT carries the role, but a cookie minted a week ago must not keep
 * granting access the admin has since revoked. Re-reading means a demotion or
 * deletion takes effect on the very next request. React.cache() collapses this
 * to one query per request, so the cost is a single indexed lookup.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  try {
    let identity: { id?: string; email: string } | null = null

    const cookieStore = await cookies()
    const token = cookieStore.get(SESSION_COOKIE_NAME)?.value

    if (token) {
      const claimed = await verifySessionToken(token)
      if (claimed) identity = { id: claimed.id, email: claimed.email }
    }

    if (!identity) {
      const authSession = await auth()
      const email = authSession?.user?.email
      if (email) identity = { email }
    }

    if (!identity) return null

    const dbUser = await prisma.user.findUnique({
      // Match on id when we have it so an email change doesn't orphan a session.
      where: identity.id ? { id: identity.id } : { email: identity.email },
      select: { id: true, email: true, name: true, role: true },
    })

    // Deleted user — the signed cookie is still valid, the account is not.
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
