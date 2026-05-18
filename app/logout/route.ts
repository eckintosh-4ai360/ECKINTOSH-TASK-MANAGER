import { type NextRequest, NextResponse } from "next/server"
import { clearAuthCookies } from "@/lib/auth-cookie-cleanup"

// GET /logout — clears both the custom session cookie AND the Auth.js OAuth session
export async function GET(_req: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", _req.url))
  return clearAuthCookies(response, _req)
}
