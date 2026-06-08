import { SignJWT, jwtVerify } from "jose"
import type { AppRole } from "@/lib/rbac"

const FALLBACK_SESSION_SECRET = "spagad-secret-key-2026-change-in-production"

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

function getSessionSecretValue() {
  const secret = process.env.JWT_SECRET ?? process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET

  if (!secret && process.env.NODE_ENV === "production" && !warnedAboutFallbackSecret) {
    console.warn("[session] Missing JWT_SECRET/AUTH_SECRET/NEXTAUTH_SECRET. Using fallback session secret.")
    warnedAboutFallbackSecret = true
  }

  return secret ?? FALLBACK_SESSION_SECRET
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
