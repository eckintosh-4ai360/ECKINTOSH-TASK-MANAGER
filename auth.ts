import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import Google from "next-auth/providers/google"
import { cookies } from "next/headers"
import prisma from "@/lib/prisma"
import { decideRegistration } from "@/lib/registration-policy"
import { findPendingInvitationByEmail, markInvitationAccepted } from "@/lib/invitations"
import { encryptSecret } from "@/lib/secure-store"
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session"

const googleClientId =
  process.env.AUTH_GOOGLE_ID
  ?? process.env.GOOGLE_ID
  ?? process.env.AUTH_GOOGLE_CLIENT_ID
  ?? process.env.GOOGLE_CLIENT_ID
const googleClientSecret =
  process.env.AUTH_GOOGLE_SECRET
  ?? process.env.GOOGLE_SECRET
  ?? process.env.AUTH_GOOGLE_CLIENT_SECRET
  ?? process.env.GOOGLE_CLIENT_SECRET

const githubClientId =
  process.env.AUTH_GITHUB_ID
  ?? process.env.GITHUB_ID
  ?? process.env.AUTH_GITHUB_CLIENT_ID
  ?? process.env.GITHUB_CLIENT_ID
const githubClientSecret =
  process.env.AUTH_GITHUB_SECRET
  ?? process.env.GITHUB_SECRET
  ?? process.env.AUTH_GITHUB_CLIENT_SECRET
  ?? process.env.GITHUB_CLIENT_SECRET
const authSecret =
  process.env.AUTH_SECRET
  ?? process.env.NEXTAUTH_SECRET
  ?? process.env.JWT_SECRET

if (!authSecret) {
  console.warn("[auth] Missing AUTH_SECRET/NEXTAUTH_SECRET/JWT_SECRET. OAuth sessions may fail in production.")
}

if (!googleClientId || !googleClientSecret) {
  console.warn(
    "[auth] Google sign-in is unavailable. Set AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET (recommended), GOOGLE_ID/GOOGLE_SECRET, or *_CLIENT_ID/*_CLIENT_SECRET equivalents."
  )
}

if (!githubClientId || !githubClientSecret) {
  console.warn(
    "[auth] GitHub repository connection is unavailable. Set AUTH_GITHUB_ID/AUTH_GITHUB_SECRET, GITHUB_ID/GITHUB_SECRET, or *_CLIENT_ID/*_CLIENT_SECRET equivalents."
  )
}

const googleScopes = process.env.GOOGLE_OAUTH_SCOPES ?? "openid email profile"

// `repo` is requested so that repository writes made in the workspace are
// attributed to the person who made them, using their own token, instead of
// everyone sharing one machine account. Set GITHUB_OAUTH_SCOPES to override —
// e.g. "read:user user:email" for a deployment that never writes to GitHub.
const githubScopes = process.env.GITHUB_OAUTH_SCOPES ?? "read:user user:email repo"

// GitHub OAuth apps require one exact callback URL. On Vercel, preview
// deployments have unique hosts, so use Auth.js's redirect proxy through the
// stable production domain when Vercel exposes it. The proxy preserves the
// original preview host in the encrypted OAuth state and sends the user back
// to that deployment after GitHub approves the request.
function toAuthBaseUrl(value: string) {
  const origin = value.startsWith("http") ? value : `https://${value}`

  try {
    return `${new URL(origin).origin}/api/auth`
  } catch {
    console.warn("[auth] Ignoring invalid OAuth redirect proxy URL.")
    return undefined
  }
}

function isLocalUrl(value: string) {
  try {
    const hostname = new URL(value.startsWith("http") ? value : `https://${value}`).hostname
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}

function getAuthRedirectProxyUrl() {
  const configured = process.env.AUTH_REDIRECT_PROXY_URL?.trim()
  if (configured) return configured.replace(/\/+$/, "")

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim()
  if (productionDomain) return toAuthBaseUrl(productionDomain)

  // This fallback covers Vercel projects where system environment variables
  // are not automatically exposed. Set NEXT_PUBLIC_APP_URL (or AUTH_URL) to
  // the stable production URL in both Production and Preview environments.
  const canonicalUrl = (
    process.env.NEXT_PUBLIC_APP_URL
    ?? process.env.AUTH_URL
    ?? process.env.NEXTAUTH_URL
  )?.trim()

  if (!canonicalUrl || isLocalUrl(canonicalUrl)) return undefined
  return toAuthBaseUrl(canonicalUrl)
}

const authRedirectProxyUrl = getAuthRedirectProxyUrl()

async function getExistingCredentialEmail() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value
  if (!token) return null

  return (await verifySessionToken(token))?.email.toLowerCase() ?? null
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          Google({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            authorization: { params: { scope: googleScopes } },
          }),
        ]
      : []),
    ...(githubClientId && githubClientSecret
      ? [
          GitHub({
            clientId: githubClientId,
            clientSecret: githubClientSecret,
            authorization: { params: { scope: githubScopes } },
          }),
        ]
      : []),
  ],
  session: {
    strategy: "jwt",
  },
  redirectProxyUrl: authRedirectProxyUrl,
  trustHost: true,
  callbacks: {
    async signIn({ user, profile, account }) {
      const isGitHubConnection = account?.provider === "github"
      const providerName = isGitHubConnection ? "GitHub" : "Google"

      // GitHub may not send email if it is set to private. Google always
      // provides an email for the scopes we request.
      const ghLogin = (profile as any)?.login as string | undefined
      const email =
        user.email
        ?? (profile as any)?.email
        ?? (isGitHubConnection && ghLogin ? `${ghLogin}@users.noreply.github.com` : null)


      if (!email) {
        console.error("[auth] signIn blocked — no email from GitHub. profile:", profile)
        return false
      }

      // Persist email back so jwt/session callbacks can use it
      user.email = email

      try {
        // GitHub is an optional repository connection, not the account login.
        // Do not let a different GitHub email switch an authenticated user's
        // Spagad account while they connect repository access.
        const credentialEmail = isGitHubConnection ? await getExistingCredentialEmail() : null
        if (credentialEmail && credentialEmail !== email.toLowerCase()) {
          console.warn("[auth] GitHub connection denied because provider email does not match the signed-in account.")
          return "/commits?github=connection_email_mismatch"
        }

        const existing = await prisma.user.findUnique({ where: { email } })

        // A pending invitation is as good as an admin-created record — it was
        // an admin who created the invitation, just ahead of the account.
        const invitation = existing ? null : await findPendingInvitationByEmail(email)

        // An OAuth account could otherwise provision itself as a
        // USER role here, which carries messaging, email, and repository
        // workspace access. Gate it.
        const workspaceEmpty = existing ? false : (await prisma.user.count()) === 0
        const decision = invitation
          ? ({ allowed: true, reason: "invited" } as const)
          : decideRegistration(email, Boolean(existing), workspaceEmpty)

        if (!decision.allowed) {
          console.warn("[auth] signIn denied:", decision.reason)
          return "/login?error=not_a_member"
        }

        // Store GitHub tokens only when the user explicitly connects GitHub.
        // Google is used solely for identity and must never grant repository
        // access or overwrite a previously connected GitHub account.
        const githubIdentity = isGitHubConnection && account?.access_token
          ? {
              githubLogin: ghLogin ?? null,
              githubTokenCipher: encryptSecret(account.access_token),
              githubScopes: (account.scope as string | undefined) ?? githubScopes,
              githubConnectedAt: new Date(),
            }
          : {}

        if (!existing) {
          const createdUser = await prisma.user.create({
            data: {
              email,
              name: user.name ?? ghLogin ?? "Developer",
              avatar: user.image ?? null,
              // The very first account bootstraps the workspace owner; an
              // invited signup gets the role the inviter chose.
              role: decision.reason === "bootstrap" ? "ADMIN" : invitation?.role ?? "USER",
              title: "Developer",
              // GitHub OAuth already proves control of this address — no OTP
              // step needed, unlike a credential (password) signup.
              emailVerified: new Date(),
              ...githubIdentity,
            },
          })

          if (invitation) {
            await prisma.workspaceMember.create({
              data: {
                workspaceId: invitation.workspaceId,
                userId: createdUser.id,
                role: invitation.workspaceRole,
              },
            })
            await markInvitationAccepted(invitation.id)
          } else if (decision.reason === "bootstrap") {
            const workspace = await prisma.workspace.create({
              data: {
                name: `${createdUser.name ?? "Main"} Workspace`,
                slug: `workspace-${createdUser.id}`,
                createdById: createdUser.id,
                members: { create: { userId: createdUser.id, role: "OWNER" } },
              },
              select: { id: true },
            })
            console.log("[auth] Bootstrap workspace created:", workspace.id)
          }

          console.log(`[auth] New ${providerName} user provisioned (${decision.reason}):`, email)
        } else {
          await prisma.user.update({
            where: { email },
            data: {
              avatar: user.image ?? existing.avatar,
              name: user.name ?? existing.name,
              lastLoginAt: new Date(),
              emailVerified: existing.emailVerified ?? new Date(),
              ...githubIdentity,
            },
          })
          console.log(`[auth] Existing user signed in through ${providerName}:`, email)
        }
      } catch (err) {
        console.error("[auth] Error provisioning user:", err)
        return false
      }

      return true
    },

    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email
        token.name = user.name
        token.picture = user.image
      }
      return token
    },

    async session({ session, token }) {
      if (token.email) {
        session.user.email = token.email as string
      }
      if (token.name) {
        session.user.name = token.name as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
})
