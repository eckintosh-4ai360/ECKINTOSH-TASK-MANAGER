import { SignJWT, jwtVerify } from "jose"
import type { AppRole } from "@/lib/rbac"

// Development-only fallback. Production refuses to start without a real secret —
// a value committed to the repo would let anyone forge an ADMIN session.
const DEV_FALLBACK_SESSION_SECRET = "dev-only-insecure-session-secret"

let warnedAboutFallbackSecret = false

export const SESSION_COOKIE_NAME = "spagad_session"

export interface SessionUser {
  id: string
  email: string
  name: string
  role: AppRole
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  }
}

export function getSessionSecretValue() {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

  if (secret) {
    if (secret.length < 32 && process.env.NODE_ENV === "production") {
      throw new Error(
        "The session secret is too short. Set JWT_SECRET (or AUTH_SECRET / NEXTAUTH_SECRET) to at least 32 characters — generate one with `openssl rand -base64 32`.",
      )
    }
    return secret
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Missing session secret. Set JWT_SECRET (or AUTH_SECRET / NEXTAUTH_SECRET) in the production environment — generate one with `openssl rand -base64 32`.",
    )
  }

  if (!warnedAboutFallbackSecret) {
    console.warn(
      "[session] No JWT_SECRET/AUTH_SECRET/NEXTAUTH_SECRET set. Using an insecure development fallback — production will refuse to boot without a real secret.",
    )
    warnedAboutFallbackSecret = true
  }

  return DEV_FALLBACK_SESSION_SECRET
}

function getSessionSecret() {
  return new TextEncoder().encode(getSessionSecretValue())
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT({ user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSessionSecret())
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret())
    return (payload as { user?: SessionUser }).user ?? null
  } catch {
    return null
  }
}
