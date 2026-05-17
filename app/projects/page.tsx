import { SidebarWithUser as Sidebar } from "@/components/dashboard/sidebar-with-user"
import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { ProjectsContent } from "@/components/projects/projects-content"
import { Button } from "@/components/ui/button"
import { AddProjectModal } from "@/components/modals/add-project-modal"

import { getProjects } from "@/lib/actions/project-actions"
import { requireSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export default async function ProjectsPage() {
  const session = await requireSession()
  const canManageProjects = hasPermission(session.role, "manage_projects")
  const projects = await getProjects()

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Project Hub"
          description="View and manage all your active projects."
          actions={canManageProjects ? (
            <AddProjectModal>
              <Button className="w-full sm:w-auto h-10 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 border border-primary/50">
                + New Project
              </Button>
            </AddProjectModal>
          ) : undefined}
        />

        <div className="mt-6">
          <ProjectsContent projects={projects} canManageProjects={canManageProjects} />
        </div>
      </main>
    </div>
  )
}
