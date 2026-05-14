import { Sidebar } from "@/components/dashboard/sidebar"
import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { StandupsView } from "@/components/standups/standups-view"
import { Button } from "@/components/ui/button"

export default function StandupsPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 p-3 md:p-4 lg:p-6 lg:ml-64">
        <Header
          title="Daily Standups"
          description="What did you do? What are you doing? Any blockers? — Keep the team in sync."
          actions={
            <Button
              id="post-standup-btn"
              className="h-9 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/30 border border-primary/50"
            >
              + Post Standup
            </Button>
          }
        />
        <div className="mt-5">
          <StandupsView />
        </div>
      </main>
    </div>
  )
}
