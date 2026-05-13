import { type NextRequest, NextResponse } from "next/server"

const COOKIE_NAME = "eckintosh_session"

// GET /logout — clears the session cookie and redirects to /login
export async function GET(_req: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", _req.url))
  response.cookies.delete(COOKIE_NAME)
  return response
}
