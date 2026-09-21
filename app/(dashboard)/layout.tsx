import type React from "react"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { SearchProvider } from "@/components/dashboard/search-context"
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner"
import { requireWorkspace } from "@/lib/auth"
import { isEmailVerified } from "@/lib/email-verification"
import { getWorkspaceOptionsForUser } from "@/lib/workspace"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth guard — runs once for all dashboard routes.
  // getSession() is React.cache()'d so subsequent calls in Sidebar / Header
  // are free (no extra DB round-trip).
  const session = await requireWorkspace()
  const workspaces = await getWorkspaceOptionsForUser(session.id)
  const verified = await isEmailVerified(session.id)

  return (
    <SearchProvider>
      <DashboardShell role={session.role} workspaces={workspaces} activeWorkspaceId={session.workspaceId}>
          {!verified && <EmailVerificationBanner email={session.email} />}
          {children}
      </DashboardShell>
    </SearchProvider>
  )
}
