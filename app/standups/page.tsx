import { SidebarWithUser as Sidebar } from "@/components/dashboard/sidebar-with-user"
import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { StandupsView } from "@/components/standups/standups-view"
import { Button } from "@/components/ui/button"
import { AddStandupModal } from "@/components/modals/add-standup-modal"
import { getProjects } from "@/lib/actions/project-actions"
import { getStandups } from "@/lib/actions/standup-actions"
import { requireSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export default async function StandupsPage() {
  const session = await requireSession()
  const canPostStandups = hasPermission(session.role, "post_standups")
  const canManageAllStandups = hasPermission(session.role, "manage_projects")
  const [standups, projects] = await Promise.all([
    getStandups(),
    getProjects(),
  ])

  const projectOptions = projects.map((project) => ({
    id: project.id,
    name: project.name,
  }))

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>
      <main className="flex-1 p-3 md:p-4 lg:p-6 lg:ml-64">
        <Header
          title="Daily Standups"
          description="What did you do? What are you doing? Any blockers? Keep the team in sync."
          actions={canPostStandups ? (
            <AddStandupModal projects={projectOptions}>
              <Button
                id="post-standup-btn"
                className="h-9 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/30 border border-primary/50"
              >
                + Post Standup
              </Button>
            </AddStandupModal>
          ) : undefined}
        />
        <div className="mt-5">
          <StandupsView
            standups={standups}
            projects={projectOptions}
            currentUserId={session.id}
            canPostStandups={canPostStandups}
            canManageAllStandups={canManageAllStandups}
          />
        </div>
      </main>
    </div>
  )
}
