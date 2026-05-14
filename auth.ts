import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import prisma from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ],
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

    // Force all OAuth sign-ins to go through /auth/complete so we can
    // set the custom session cookie before the user hits the dashboard.
    async redirect({ url, baseUrl }) {
      // If the redirect URL is already /auth/complete, allow it through
      if (url.includes("/auth/complete")) return url
      // If it's an internal URL, funnel through /auth/complete
      if (url.startsWith(baseUrl) || url.startsWith("/")) {
        return `${baseUrl}/auth/complete`
      }
      return `${baseUrl}/auth/complete`
    },
  },
  pages: {
    signIn: "/login",
  },
})
