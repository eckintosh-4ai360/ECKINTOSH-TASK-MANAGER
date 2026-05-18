import type { NextResponse } from "next/server"
import { SESSION_COOKIE_NAME } from "@/lib/session"

const AUTH_COOKIE_NAMES = [
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

export function clearAuthCookies(response: NextResponse) {
  for (const name of AUTH_COOKIE_NAMES) {
    response.cookies.delete(name)

    // Auth.js can split large cookies into numbered chunks.
    for (let index = 0; index < 8; index += 1) {
      response.cookies.delete(`${name}.${index}`)
    }
  }

  return response
}
