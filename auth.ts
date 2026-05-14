import NextAuth from "next-auth"
import GitHub from "next-auth/providers/github"
import prisma from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, profile }) {
      // Auto-provision user in DB on first OAuth sign-in
      if (!user.email) return false

      const existing = await prisma.user.findUnique({ where: { email: user.email } })

      if (!existing) {
        await prisma.user.create({
          data: {
            email: user.email,
            name: user.name ?? profile?.login as string ?? "Developer",
            avatar: user.image ?? null,
            role: "USER",
            title: "Developer",
          },
        })
      } else if (user.image && !existing.avatar) {
        // Sync avatar if missing
        await prisma.user.update({
          where: { email: user.email },
          data: { avatar: user.image, name: user.name ?? existing.name },
        })
      }

      return true
    },

    async session({ session, token }) {
      if (session.user?.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email },
          select: { id: true, role: true, title: true, name: true, avatar: true },
        })
        if (dbUser) {
          ;(session.user as any).id = dbUser.id
          ;(session.user as any).role = dbUser.role
          ;(session.user as any).title = dbUser.title
          session.user.name = dbUser.name ?? session.user.name
          session.user.image = dbUser.avatar ?? session.user.image
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
})
