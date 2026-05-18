import { NextResponse } from "next/server"
import { clearAuthCookies } from "@/lib/auth-cookie-cleanup"

export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login?error=session_reset", request.url))
  response.headers.set("Clear-Site-Data", '"cookies", "storage", "cache"')
  return clearAuthCookies(response)
}
