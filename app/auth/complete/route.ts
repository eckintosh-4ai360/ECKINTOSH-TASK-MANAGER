import { auth } from "@/auth"
import { SESSION_COOKIE_NAME, createSessionToken, getSessionCookieOptions } from "@/lib/session"
import prisma from "@/lib/prisma"
import type { Session } from "next-auth"
import { NextResponse } from "next/server"

function redirectTo(request: Request, path: string) {
  return NextResponse.redirect(new URL(path, request.url))
}

/**
 * GET /auth/complete
 *
 * Bridge route handler that fires after GitHub OAuth finishes.
 * It reads the NextAuth session, looks up the DB user, mints a
 * custom JWT cookie (`eckintosh_session`), then redirects to /.
 *
 * Why a Route Handler instead of a page.tsx?
 * Next.js App Router forbids setting cookies from Server Components.
 * Route Handlers (GET/POST) are explicitly allowed to modify cookies.
 */
export async function GET(request: Request) {
  console.log("[auth/complete] Bridge route hit — reading NextAuth session…")

  let session: Session | null = null

  try {
    session = await auth()
    console.log(
      "[auth/complete] auth() returned:",
      session ? `user=${session.user?.email}` : "null"
    )
  } catch (err) {
    console.error("[auth/complete] auth() threw:", err)
    return redirectTo(request, "/login?error=session_error")
  }

  if (!session?.user?.email) {
    console.error(
      "[auth/complete] No session or email. session:",
      JSON.stringify(session)
    )
    return redirectTo(request, "/login?error=no_session")
  }

  const email = session.user.email
  // Look up user in DB
  let dbUser
  try {
    dbUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, name: true, role: true },
    })
    console.log(
      "[auth/complete] DB lookup result:",
      dbUser ? `id=${dbUser.id}` : "NOT FOUND"
    )
  } catch (err) {
    console.error("[auth/complete] DB lookup failed:", err)
    return redirectTo(request, "/login?error=db_error")
  }

  if (!dbUser) {
    console.error("[auth/complete] DB user not found for email:", email)
    return redirectTo(request, "/login?error=user_not_found")
  }

  // Set the custom JWT cookie on the same redirect response/host.
  const token = await createSessionToken({
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name ?? "Developer",
    role: dbUser.role as "ADMIN" | "USER" | "GUEST",
  })
  const response = redirectTo(request, "/")
  response.cookies.set(SESSION_COOKIE_NAME, token, getSessionCookieOptions())

  console.log(
    "[auth/complete] ✅ Session cookie created for:",
    email,
    "→ redirecting to /"
  )
  return response
}
