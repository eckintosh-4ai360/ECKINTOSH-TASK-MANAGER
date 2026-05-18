import { NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session"

// Routes that do NOT require the custom eckintosh_session cookie.
// /auth/complete is the OAuth bridge that creates the cookie after GitHub login.
// /api/auth is NextAuth's endpoint (callback, signin, etc.).
const PUBLIC_ROUTES = ["/login", "/auth/complete", "/auth/reset", "/api/auth"]
const AUTHJS_SESSION_COOKIE_NAMES = ["authjs.session-token", "__Secure-authjs.session-token"]

function hasAuthJsSessionCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some(({ name }) =>
      AUTHJS_SESSION_COOKIE_NAMES.some((cookieName) => name === cookieName || name.startsWith(`${cookieName}.`))
    )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value

  if (!token) {
    if (hasAuthJsSessionCookie(request)) {
      return NextResponse.next()
    }

    return NextResponse.redirect(new URL("/login", request.url))
  }

  const session = await verifySessionToken(token)
  if (session) {
    return NextResponse.next()
  }

  if (hasAuthJsSessionCookie(request)) {
    const response = NextResponse.next()
    response.cookies.delete(SESSION_COOKIE_NAME)
    return response
  }

  // Token invalid or expired
  const response = NextResponse.redirect(new URL("/login", request.url))
  response.cookies.delete(SESSION_COOKIE_NAME)
  return response
}

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - api routes
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico, icons, images in public/
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)",
  ],
}
