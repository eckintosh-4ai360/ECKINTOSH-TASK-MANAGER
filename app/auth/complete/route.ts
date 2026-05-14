import { auth } from "@/auth"
import { createSession } from "@/lib/auth"
import prisma from "@/lib/prisma"
import type { Session } from "next-auth"
import { NextResponse } from "next/server"

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
export async function GET() {
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
    return NextResponse.redirect(new URL("/login?error=session_error", process.env.NEXTAUTH_URL ?? "http://localhost:3000"))
  }

  if (!session?.user?.email) {
    console.error(
      "[auth/complete] No session or email. session:",
      JSON.stringify(session)
    )
    return NextResponse.redirect(new URL("/login?error=no_session", process.env.NEXTAUTH_URL ?? "http://localhost:3000"))
  }

  const email = session.user.email
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000"

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
    return NextResponse.redirect(new URL("/login?error=db_error", baseUrl))
  }

  if (!dbUser) {
    console.error("[auth/complete] DB user not found for email:", email)
    return NextResponse.redirect(new URL("/login?error=user_not_found", baseUrl))
  }

  // Create the custom JWT session cookie
  await createSession({
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name ?? "Developer",
    role: dbUser.role as "ADMIN" | "USER" | "GUEST",
  })

  console.log(
    "[auth/complete] ✅ Session cookie created for:",
    email,
    "→ redirecting to /"
  )
  return NextResponse.redirect(new URL("/", baseUrl))
}
