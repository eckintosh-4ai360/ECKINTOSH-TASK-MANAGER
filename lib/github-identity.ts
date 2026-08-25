import prisma from "@/lib/prisma"
import { decryptSecret } from "@/lib/secure-store"

/**
 * Resolves the GitHub token that a given user's writes should run under.
 *
 * Every write is attributed to the person who made it. The shared
 * GITHUB_ACCESS_TOKEN is a read-only convenience by default; allowing it to
 * perform writes means everyone's commits and merges come from one machine
 * account, so that has to be opted into explicitly.
 */

export type ActorToken =
  | { ok: true; token: string; source: "user" | "shared" }
  | { ok: false; error: string }

export function sharedWriteTokenEnabled() {
  return process.env.GITHUB_ALLOW_SHARED_WRITE_TOKEN === "true"
}

export function getSharedGitHubToken() {
  return (
    process.env.GITHUB_ACCESS_TOKEN
    ?? process.env.GITHUB_TOKEN
    ?? process.env.AUTH_GITHUB_TOKEN
    ?? process.env.GITHUB_PERSONAL_ACCESS_TOKEN
    ?? null
  )
}

export async function getUserGitHubToken(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { githubTokenCipher: true, githubScopes: true, githubLogin: true },
  })

  if (!user?.githubTokenCipher) return null

  const token = decryptSecret(user.githubTokenCipher)
  if (!token) {
    console.error(`[github] Stored token for user ${userId} could not be decrypted — they must reconnect GitHub.`)
    return null
  }

  return { token, scopes: user.githubScopes, login: user.githubLogin }
}

/** Token for a write operation. Prefers the actor's own credentials. */
export async function resolveWriteToken(userId: string): Promise<ActorToken> {
  const identity = await getUserGitHubToken(userId)

  if (identity) {
    if (identity.scopes && !identity.scopes.includes("repo")) {
      return {
        ok: false,
        error:
          "Your GitHub connection does not include repository write access. Sign out and sign in with GitHub again to grant it.",
      }
    }

    return { ok: true, token: identity.token, source: "user" }
  }

  if (sharedWriteTokenEnabled()) {
    const shared = getSharedGitHubToken()
    if (shared) return { ok: true, token: shared, source: "shared" }
  }

  return {
    ok: false,
    error:
      "Connect your own GitHub account to push changes. Sign out and sign back in with GitHub so this workspace can act as you.",
  }
}

/** Token for a read operation. Falls back to the shared token. */
export async function resolveReadToken(userId: string) {
  const identity = await getUserGitHubToken(userId)
  return identity?.token ?? getSharedGitHubToken()
}

export async function hasConnectedGitHub(userId: string) {
  return (await getUserGitHubToken(userId)) !== null
}
