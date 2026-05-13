import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProjectAnalytics } from "@/components/dashboard/project-analytics"
import { Reminders } from "@/components/dashboard/reminders"
import { ProjectList } from "@/components/dashboard/project-list"
import { TeamCollaboration } from "@/components/dashboard/team-collaboration"
import { ProjectProgress } from "@/components/dashboard/project-progress"
import { MobileAppCard } from "@/components/dashboard/mobile-app-card"
import { TimeTracker } from "@/components/dashboard/time-tracker"
import { Button } from "@/components/ui/button"
import { AddProjectModal } from "@/components/modals/add-project-modal"
import { ImportDataModal } from "@/components/modals/import-data-modal"

import { getDashboardStats, getProjects } from "@/lib/actions/project-actions"

export default async function DashboardPage() {
  const [projects, stats] = await Promise.all([
    getProjects(),
    getDashboardStats(),
  ])

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-3 md:p-4 lg:p-5 lg:ml-64">
        <Header
          title="Command Center"
          description="Monitor systems, track progress, and manage your operations."
          actions={
            <>
              <AddProjectModal>
                <Button className="w-full sm:w-auto h-10 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 border border-primary/50">
                  + New Project
                </Button>
              </AddProjectModal>
              <ImportDataModal>
                <Button
                  variant="outline"
                  className="w-full sm:w-auto h-10 text-sm transition-all duration-300 hover:shadow-md hover:scale-105 glass border-primary/30 hover:border-primary/50 hover:bg-primary/10 text-foreground"
                >
                  Import Data
                </Button>
              </ImportDataModal>
            </>
          }
        />

        <div className="mt-4 md:mt-5 space-y-3 md:space-y-4">
          <StatsCards stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 md:gap-4">
            <div className="lg:col-span-2 space-y-3 md:space-y-4">
              <ProjectAnalytics />
              <TeamCollaboration />
            </div>

            <div className="space-y-3 md:space-y-4">
              <Reminders />
              <ProjectProgress />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            <ProjectList projects={projects} />
            <MobileAppCard />
            <TimeTracker />
          </div>
        </div>
      </main>
    </div>
  )
}
