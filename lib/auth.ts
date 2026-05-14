import { SignJWT, jwtVerify } from "jose"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "eckintosh-secret-key-2026-change-in-production"
)

const COOKIE_NAME = "eckintosh_session"

export interface SessionUser {
  id: string
  email: string
  name: string
  role: "ADMIN" | "USER" | "GUEST"
}

// ─── Create + store session ───────────────────────────────────────────────────
// Called by: email/password loginAction AND /auth/complete (OAuth bridge)
export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET)

  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  })
}

// ─── Read session ─────────────────────────────────────────────────────────────
// Reads the custom JWT cookie set by createSession().
// Both email/password login and GitHub OAuth (via /auth/complete) set this cookie.
export async function getSession(): Promise<SessionUser | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(COOKIE_NAME)?.value
    if (!token) return null

    const { payload } = await jwtVerify(token, JWT_SECRET)
    return (payload as any).user as SessionUser
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

// ─── Destroy session ──────────────────────────────────────────────────────────
export async function destroySession() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
}
