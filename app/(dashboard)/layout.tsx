import type React from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { SearchProvider } from "@/components/dashboard/search-context"
import { EmailVerificationBanner } from "@/components/auth/email-verification-banner"
import { requireSession } from "@/lib/auth"
import { isEmailVerified } from "@/lib/email-verification"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth guard — runs once for all dashboard routes.
  // getSession() is React.cache()'d so subsequent calls in Sidebar / Header
  // are free (no extra DB round-trip).
  const session = await requireSession()
  const verified = await isEmailVerified(session.id)

  return (
    <SearchProvider>
      <div className="flex min-h-screen bg-background">
        <div className="hidden lg:block">
          <Sidebar role={session.role} />
        </div>
        <main className="flex-1 p-3 md:p-4 lg:p-6 lg:ml-64">
          {!verified && <EmailVerificationBanner email={session.email} />}
          {children}
        </main>
      </div>
    </SearchProvider>
  )
}
