import type { NextRequest, NextResponse } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/session"

const AUTH_COOKIE_PREFIXES = [
  SESSION_COOKIE_NAME,
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "authjs.callback-url",
  "__Secure-authjs.callback-url",
  "authjs.csrf-token",
  "__Host-authjs.csrf-token",
  "authjs.pkce.code_verifier",
  "__Secure-authjs.pkce.code_verifier",
  "authjs.state",
  "__Secure-authjs.state",
  "authjs.nonce",
  "__Secure-authjs.nonce",
  "authjs.challenge",
  "__Secure-authjs.challenge",
]

function isManagedAuthCookie(name: string) {
  return AUTH_COOKIE_PREFIXES.some((prefix) => name === prefix || name.startsWith(`${prefix}.`))
}

export function clearAuthCookies(response: NextResponse, request?: NextRequest | Request) {
  const cookieNames = new Set<string>()

  if (request && "cookies" in request) {
    for (const { name } of request.cookies.getAll()) {
      if (isManagedAuthCookie(name)) {
        cookieNames.add(name)
      }
    }
  }

  // Keep a small fallback list so logout still works even when no request cookies are visible.
  if (cookieNames.size === 0) {
    cookieNames.add(SESSION_COOKIE_NAME)
    cookieNames.add("authjs.session-token")
    cookieNames.add("__Secure-authjs.session-token")
    cookieNames.add("authjs.callback-url")
    cookieNames.add("__Secure-authjs.callback-url")
    cookieNames.add("authjs.csrf-token")
    cookieNames.add("__Host-authjs.csrf-token")
  }

  for (const name of cookieNames) {
    response.cookies.delete(name)
  }

  return response
}
