import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "eckintosh-secret-key-2026-change-in-production"
)
const COOKIE_NAME = "eckintosh_session"

// Routes that do NOT require the custom eckintosh_session cookie.
const PUBLIC_PREFIXES = ["/login", "/auth/complete", "/api/auth", "/api/"]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes through
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next()
  }

  const token = request.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(new URL("/login", request.url))
  }

  try {
    await jwtVerify(token, JWT_SECRET)
    return NextResponse.next()
  } catch {
    // Token invalid or expired — clear it and send to login
    const response = NextResponse.redirect(new URL("/login", request.url))
    response.cookies.delete(COOKIE_NAME)
    return response
  }
}

export const config = {
  matcher: [
    /*
     * Match all routes EXCEPT:
     * - _next/static (static files)
     * - _next/image  (image optimisation)
     * - favicon.ico, and common public asset extensions
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)",
  ],
}
