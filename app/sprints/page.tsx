import { Sidebar } from "@/components/dashboard/sidebar"
import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { SprintsBoard } from "@/components/sprints/sprints-board"
import { Button } from "@/components/ui/button"
import { AddSprintModal } from "@/components/modals/add-sprint-modal"
import { getProjects } from "@/lib/actions/project-actions"
import { getSprints } from "@/lib/actions/sprint-actions"

export default async function SprintsPage() {
  const [projects, sprints] = await Promise.all([
    getProjects(),
    getSprints(),
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
          title="Sprints"
          description="Manage your team's sprint cycles across all active projects."
          actions={
            <AddSprintModal projects={projectOptions}>
              <Button
                id="new-sprint-btn"
                className="h-9 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/30 border border-primary/50"
              >
                + New Sprint
              </Button>
            </AddSprintModal>
          }
        />
        <div className="mt-5">
          <SprintsBoard sprints={sprints} />
        </div>
      </main>
    </div>
  )
}
