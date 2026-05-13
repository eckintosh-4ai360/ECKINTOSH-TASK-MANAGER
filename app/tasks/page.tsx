import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { TasksContent } from "@/components/tasks/tasks-content"
import { Button } from "@/components/ui/button"
import { AddTaskModal } from "@/components/modals/add-task-modal"

export default function TasksPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Task Control"
          description="Manage and organize your tasks efficiently."
          actions={
            <AddTaskModal>
              <Button className="w-full sm:w-auto h-10 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 border border-primary/50">
                + Add Task
              </Button>
            </AddTaskModal>
          }
        />

        <div className="mt-6">
          <TasksContent />
        </div>
      </main>
    </div>
  )
}
