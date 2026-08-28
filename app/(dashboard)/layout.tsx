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
      <div className="flex min-h-dvh bg-background">
        {/* The fixed rail lives here, not in Sidebar, so the same component can
            be dropped into the mobile drawer without pinning itself to the viewport. */}
        <div className="hidden lg:block fixed inset-y-0 left-0 z-40 w-64">
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
