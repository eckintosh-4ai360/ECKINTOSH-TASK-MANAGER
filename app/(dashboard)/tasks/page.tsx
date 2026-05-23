import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { TasksContent } from "@/components/tasks/tasks-content"
import { Button } from "@/components/ui/button"
import { AddTaskModal } from "@/components/modals/add-task-modal"
import { InviteButton } from "@/components/tasks/invite-button"

import { getProjects, getTasks, getWorkspaceUsers } from "@/lib/actions/project-actions"
import { getSprintOptions } from "@/lib/actions/sprint-actions"
import { requireSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export default async function TasksPage() {
  const session = await requireSession()
  const canManageTasks = hasPermission(session.role, "manage_tasks")
  const [projects, tasks, users, sprints] = await Promise.all([
    getProjects(),
    getTasks(),
    getWorkspaceUsers(),
    getSprintOptions(),
  ])

  return (
    <>
      <Header
        title="Task Control"
        description="Manage and organize your tasks efficiently."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <InviteButton />
            {canManageTasks && (
              <AddTaskModal projects={projects} sprints={sprints}>
                <Button className="w-full sm:w-auto h-10 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 border border-primary/50">
                  + Add Task
                </Button>
              </AddTaskModal>
            )}
          </div>
        }
      />

      <div className="mt-6">
        <TasksContent
          tasks={tasks}
          projects={projects.map((project) => ({ id: project.id, name: project.name }))}
          sprints={sprints}
          users={users}
          currentUserId={session.id}
          canManageTasks={canManageTasks}
        />
      </div>
    </>
  )
}
