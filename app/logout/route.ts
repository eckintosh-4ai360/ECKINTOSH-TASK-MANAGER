import { type NextRequest, NextResponse } from "next/server"
import { signOut } from "@/auth"

const COOKIE_NAME = "eckintosh_session"

// GET /logout — clears both the custom session cookie AND the Auth.js OAuth session
export async function GET(_req: NextRequest) {
  // Clear custom JWT cookie
  const response = NextResponse.redirect(new URL("/login", _req.url))
  response.cookies.delete(COOKIE_NAME)

  // Also clear Auth.js session cookies (set by GitHub OAuth)
  response.cookies.delete("authjs.session-token")
  response.cookies.delete("authjs.callback-url")
  response.cookies.delete("authjs.csrf-token")
  // Secure variants
  response.cookies.delete("__Secure-authjs.session-token")
  response.cookies.delete("__Secure-authjs.callback-url")
  response.cookies.delete("__Host-authjs.csrf-token")

  return response
}
