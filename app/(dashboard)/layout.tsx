import type React from "react"
import { SidebarWithUser as Sidebar } from "@/components/dashboard/sidebar-with-user"
import { requireSession } from "@/lib/auth"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth guard — runs once for all dashboard routes.
  // getSession() is React.cache()'d so subsequent calls in Sidebar / Header
  // are free (no extra DB round-trip).
  await requireSession()

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 p-3 md:p-4 lg:p-6 lg:ml-64">
        {children}
      </main>
    </div>
  )
}
