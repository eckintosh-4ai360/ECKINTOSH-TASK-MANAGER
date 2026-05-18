import { SidebarWithUser as Sidebar } from "@/components/dashboard/sidebar-with-user"
import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { HelpContent } from "@/components/help/help-content"
import { requireSession } from "@/lib/auth"

export default async function HelpPage() {
  await requireSession()

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header title="Support Center" description="Get help with using Tasko and find answers to common questions." />

        <div className="mt-6">
          <HelpContent />
        </div>
      </main>
    </div>
  )
}
