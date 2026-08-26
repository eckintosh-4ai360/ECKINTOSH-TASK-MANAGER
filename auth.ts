import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import prisma from "@/lib/prisma"
import { decideRegistration } from "@/lib/registration-policy"
import { findPendingInvitationByEmail, markInvitationAccepted } from "@/lib/invitations"
import { encryptSecret } from "@/lib/secure-store"

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

if (!githubClientId || !githubClientSecret) {
  console.warn(
    "[auth] Missing GitHub OAuth env vars. Set AUTH_GITHUB_ID/AUTH_GITHUB_SECRET, GITHUB_ID/GITHUB_SECRET, or *_CLIENT_ID/*_CLIENT_SECRET equivalents."
  )
}

/**
 * `repo` is requested so that repository writes made in the workspace are
 * attributed to the person who made them, using their own token, instead of
 * everyone sharing one machine account. Set GITHUB_OAUTH_SCOPES to override —
 * e.g. "read:user user:email" for a deployment that never writes to GitHub.
 */
const githubScopes = process.env.GITHUB_OAUTH_SCOPES ?? "read:user user:email repo"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  providers: githubClientId && githubClientSecret ? [
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      authorization: { params: { scope: githubScopes } },
    }),
  ] : [],
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    async signIn({ user, profile, account }) {
      // GitHub may not send email if it's set to private;
      // fall back to the profile email or a generated noreply address.
      const ghLogin = (profile as any)?.login as string | undefined
      const email =
        user.email
        ?? (profile as any)?.email
        ?? (ghLogin ? `${ghLogin}@users.noreply.github.com` : null)


      if (!email) {
        console.error("[auth] signIn blocked — no email from GitHub. profile:", profile)
        return false
      }

      // Persist email back so jwt/session callbacks can use it
      user.email = email

      try {
        const existing = await prisma.user.findUnique({ where: { email } })

        // A pending invitation is as good as an admin-created record — it was
        // an admin who created the invitation, just ahead of the account.
        const invitation = existing ? null : await findPendingInvitationByEmail(email)

        // Anyone with a GitHub account could otherwise provision themselves a
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

        // Store the caller's own OAuth token so repository writes act as them.
        const githubIdentity = account?.access_token
          ? {
              githubLogin: ghLogin ?? null,
              githubTokenCipher: encryptSecret(account.access_token),
              githubScopes: (account.scope as string | undefined) ?? githubScopes,
              githubConnectedAt: new Date(),
            }
          : {}

        if (!existing) {
          await prisma.user.create({
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

          if (invitation) await markInvitationAccepted(invitation.id)

          console.log(`[auth] New user provisioned (${decision.reason}):`, email)
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
          console.log("[auth] Existing user updated:", email)
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
