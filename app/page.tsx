import { Sidebar } from "@/components/dashboard/sidebar"
import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProjectMatrix } from "@/components/dashboard/project-matrix"
import { SprintOverview } from "@/components/dashboard/sprint-overview"
import { StandupFeed } from "@/components/dashboard/standup-feed"
import { DeploymentFeed } from "@/components/dashboard/deployment-feed"
import { TeamActivity } from "@/components/dashboard/team-activity"
import { Button } from "@/components/ui/button"
import { AddProjectModal } from "@/components/modals/add-project-modal"

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

      <main className="flex-1 p-3 md:p-4 lg:p-6 lg:ml-64">
        <Header
          title="Command Center"
          description="Your dev team's operations hub — sprints, deploys, standups, all in one place."
          actions={
            <>
              <AddProjectModal>
                <Button
                  id="new-project-btn"
                  className="w-full sm:w-auto h-9 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 border border-primary/50"
                >
                  + New Project
                </Button>
              </AddProjectModal>
            </>
          }
        />

        <div className="mt-5 space-y-4">
          {/* Row 1: KPI Stats */}
          <StatsCards stats={stats} />

          {/* Row 2: Sprint Overview + Deployment Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <SprintOverview />
            </div>
            <div>
              <DeploymentFeed />
            </div>
          </div>

          {/* Row 3: Project Matrix + Standup Feed */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <ProjectMatrix projects={projects} />
            </div>
            <div>
              <StandupFeed />
            </div>
          </div>

          {/* Row 4: Team Activity */}
          <TeamActivity />
        </div>
      </main>
    </div>
  )
}
