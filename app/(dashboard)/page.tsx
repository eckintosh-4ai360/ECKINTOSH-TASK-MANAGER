import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { StatsCards } from "@/components/dashboard/stats-cards"
import { ProjectMatrix } from "@/components/dashboard/project-matrix"
import { SprintOverview } from "@/components/dashboard/sprint-overview"
import { StandupFeed } from "@/components/dashboard/standup-feed"
import { DeploymentFeed } from "@/components/dashboard/deployment-feed"
import { TeamActivity } from "@/components/dashboard/team-activity"
import { Button } from "@/components/ui/button"
import { AddProjectModal } from "@/components/modals/add-project-modal"

import { getDashboardStats, getProjects, getWorkspaceUsers, getDeployments } from "@/lib/actions/project-actions"
import { getSprints } from "@/lib/actions/sprint-actions"
import { getStandups } from "@/lib/actions/standup-actions"
import { getTeamActivityData } from "@/lib/actions/team-actions"
import { requireSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export default async function DashboardPage() {
  const session = await requireSession()
  const canManageProjects = hasPermission(session.role, "manage_projects")
  
  const [projects, stats, workspaceUsers, sprints, deployments, standups, teamActivities] = await Promise.all([
    getProjects(),
    getDashboardStats(),
    canManageProjects ? getWorkspaceUsers() : Promise.resolve([]),
    getSprints(),
    getDeployments(),
    getStandups(),
    getTeamActivityData(),
  ])

  // Get active/recent sprints (up to 3) for the overview
  const overviewSprints = sprints
    .filter((s) => s.status !== "CANCELLED" && s.status !== "COMPLETED")
    .slice(0, 3)

  // Get recent deployments (up to 4)
  const recentDeployments = deployments.slice(0, 4)

  // Get recent standups (up to 3)
  const recentStandups = standups.slice(0, 3)

  return (
    <>
      <Header
        title="Command Center"
        description="Dev team's operations hub — sprints, deploys, standups, all in one place."
        actions={canManageProjects ? (
          <>
            <AddProjectModal workspaceUsers={workspaceUsers}>
              <Button
                id="new-project-btn"
                className="w-full sm:w-auto h-9 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 border border-primary/50"
              >
                + New Project
              </Button>
            </AddProjectModal>
          </>
        ) : undefined}
      />

      <div className="mt-5 space-y-4">
        {/* Row 1: KPI Stats */}
        <StatsCards stats={stats} />

        {/* Row 2: Sprint Overview + Deployment Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <SprintOverview sprints={overviewSprints} />
          </div>
          <div>
            <DeploymentFeed deployments={recentDeployments} />
          </div>
        </div>

        {/* Row 3: Project Matrix + Standup Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ProjectMatrix projects={projects} />
          </div>
          <div>
            <StandupFeed standups={recentStandups} />
          </div>
        </div>

        {/* Row 4: Team Activity */}
        <TeamActivity currentUserId={session.id} initialActivities={teamActivities} />
      </div>
    </>
  )
}
