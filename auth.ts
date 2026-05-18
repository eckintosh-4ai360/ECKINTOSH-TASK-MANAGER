import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import prisma from "@/lib/prisma"

const githubClientId = process.env.AUTH_GITHUB_ID ?? process.env.GITHUB_ID
const githubClientSecret = process.env.AUTH_GITHUB_SECRET ?? process.env.GITHUB_SECRET
const authSecret =
  process.env.AUTH_SECRET
  ?? process.env.NEXTAUTH_SECRET
  ?? process.env.JWT_SECRET

if (!authSecret) {
  console.warn("[auth] Missing AUTH_SECRET/NEXTAUTH_SECRET/JWT_SECRET. OAuth sessions may fail in production.")
}

if (!githubClientId || !githubClientSecret) {
  console.warn("[auth] Missing GITHUB_ID/GITHUB_SECRET (or AUTH_GITHUB_ID/AUTH_GITHUB_SECRET). GitHub sign-in is disabled.")
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: authSecret,
  providers: githubClientId && githubClientSecret ? [
    GitHub({
      clientId: githubClientId,
      clientSecret: githubClientSecret,
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ] : [],
  session: {
    strategy: "jwt",
  },
  trustHost: true,
  callbacks: {
    async signIn({ user, profile }) {
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

        if (!existing) {
          await prisma.user.create({
            data: {
              email,
              name: user.name ?? (profile as any)?.login ?? "Developer",
              avatar: user.image ?? null,
              role: "USER",
              title: "Developer",
            },
          })
          console.log("[auth] New user provisioned:", email)
        } else {
          await prisma.user.update({
            where: { email },
            data: {
              avatar: user.image ?? existing.avatar,
              name: user.name ?? existing.name,
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
  },
})
