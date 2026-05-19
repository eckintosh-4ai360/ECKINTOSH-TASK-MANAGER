"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Search, Calendar, Tag, SlidersHorizontal, MoreHorizontal, Pencil, Trash2, Flag } from "lucide-react"
import { deleteTask, toggleTaskStatus, updateTask } from "@/lib/actions/project-actions"
import type { SprintOption } from "@/lib/actions/sprint-actions"
import { useSearch } from "@/components/dashboard/search-context"
import { toast } from "sonner"

interface Task {
  id: string
  title: string
  description?: string | null
  priority: string
  dueDate: Date | string | null
  status: string
  projectId: string
  sprintId?: string | null
  assigneeId?: string | null
  tags?: string[]
  project?: { name: string }
  sprint?: { id: string; name: string } | null
}

interface ProjectOption {
  id: string
  name: string
}

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface TasksContentProps {
  tasks: Task[]
  projects: ProjectOption[]
  sprints: SprintOption[]
  users: UserOption[]
  currentUserId: string
  canManageTasks: boolean
}

const EMPTY_FORM = {
  id: "",
  title: "",
  description: "",
  projectId: "",
  sprintId: "none",
  priority: "medium",
  dueDate: "",
  tags: "",
  status: "TODO",
  assigneeId: "unassigned",
}

export function TasksContent({ tasks, projects, sprints, users, currentUserId, canManageTasks }: TasksContentProps) {
  const [filter, setFilter] = useState("all")
  const [isPending, startTransition] = useTransition()
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [deletingTask, setDeletingTask] = useState<Task | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const { query, setQuery, matches } = useSearch()
  const router = useRouter()

  useEffect(() => {
    if (!editingTask) {
      setFormData(EMPTY_FORM)
      return
    }

    setFormData({
      id: editingTask.id,
      title: editingTask.title,
      description: editingTask.description ?? "",
      projectId: editingTask.projectId,
      sprintId: editingTask.sprintId ?? "none",
      priority: editingTask.priority,
      dueDate: editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().slice(0, 10) : "",
      tags: editingTask.tags?.join(", ") ?? "",
      status: editingTask.status,
      assigneeId: editingTask.assigneeId ?? "unassigned",
    })
  }, [editingTask])

  const availableSprints = formData.projectId
    ? sprints.filter((sprint) => sprint.projectId === formData.projectId)
    : []

  useEffect(() => {
    if (formData.sprintId === "none") {
      return
    }

    if (!availableSprints.some((sprint) => sprint.id === formData.sprintId)) {
      setFormData((current) => ({ ...current, sprintId: "none" }))
    }
  }, [availableSprints, formData.sprintId])

  const handleToggle = (taskId: string, currentStatus: string) => {
    startTransition(async () => {
      const result = await toggleTaskStatus(taskId, currentStatus !== "COMPLETED")
      if (!result.success) {
        toast.error(result.error ?? "Could not update task status.")
        return
      }

      router.refresh()
    })
  }

  const baseTasks =
    filter === "all"
      ? tasks
      : filter === "completed"
        ? tasks.filter((t) => t.status === "COMPLETED")
        : tasks.filter((t) => t.status !== "COMPLETED")

  const filteredTasks = baseTasks.filter((t) =>
    matches(t.title, t.project?.name, t.sprint?.name, t.priority, t.status)
  )

  const handleSaveTask = () => {
    startTransition(async () => {
      const result = await updateTask({
        ...formData,
        sprintId: formData.sprintId === "none" ? undefined : formData.sprintId,
        assigneeId: formData.assigneeId === "unassigned" ? undefined : formData.assigneeId,
      })

      if (!result.success) {
        toast.error(result.error ?? "Could not update task.")
        return
      }

      toast.success("Task updated")
      setEditingTask(null)
      router.refresh()
    })
  }

  const handleDeleteTask = () => {
    if (!deletingTask) return

    startTransition(async () => {
      const result = await deleteTask(deletingTask.id)

      if (!result.success) {
        toast.error(result.error ?? "Could not delete task.")
        return
      }

      toast.success("Task deleted")
      setDeletingTask(null)
      router.refresh()
    })
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "HIGH":
        return "bg-destructive/20 text-destructive border-destructive/30"
      case "MEDIUM":
        return "bg-chart-4/20 text-chart-4 border-chart-4/30"
      default:
        return "bg-primary/20 text-primary border-primary/30"
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/60" />
          <Input 
            placeholder="Search tasks..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 glass border-primary/20 focus:border-primary/50 h-11" 
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline" className="gap-2 glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
            <Calendar className="w-4 h-4" />
            Date
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: `All (${tasks.length})` },
          { key: "active", label: `Active (${tasks.filter((t) => t.status !== "COMPLETED").length})` },
          { key: "completed", label: `Completed (${tasks.filter((t) => t.status === "COMPLETED").length})` },
        ].map((tab) => (
          <Button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            size="sm"
            className={
              filter === tab.key
                ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                : "glass border-border/30 hover:border-primary/30 hover:bg-primary/5 text-foreground"
            }
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8 italic">No tasks found. Create one to get started!</p>
        )}
        {filteredTasks.map((task, index) => (
          <div
            key={task.id}
            className="glass-card rounded-xl p-4 hover:border-primary/30 transition-all duration-300 cursor-pointer animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-4">
              <Checkbox 
                checked={task.status === "COMPLETED"} 
                onCheckedChange={() => handleToggle(task.id, task.status)}
                disabled={isPending || (!canManageTasks && task.assigneeId !== currentUserId)}
                className="mt-1 border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <h3 className={`font-semibold text-foreground ${task.status === "COMPLETED" ? "line-through opacity-60" : ""}`}>
                    {task.title}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase ${getPriorityStyle(task.priority)}`}>
                      {task.priority}
                    </span>
                    {canManageTasks && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card border-primary/20">
                          <DropdownMenuItem onClick={() => setEditingTask(task)}>
                            <Pencil className="w-4 h-4 text-primary" />
                            Edit task
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeletingTask(task)}>
                            <Trash2 className="w-4 h-4" />
                            Delete task
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {task.project && (
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                      {task.project.name}
                    </span>
                  )}
                  {task.sprint && (
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <Flag className="w-3.5 h-3.5 text-primary" />
                      {task.sprint.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 font-mono text-xs">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={Boolean(editingTask)} onOpenChange={(open) => !open && setEditingTask(null)}>
        <DialogContent className="glass-card border-primary/20 sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-task-title">Task Title</Label>
              <Input
                id="edit-task-title"
                value={formData.title}
                onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-task-description">Description</Label>
              <Textarea
                id="edit-task-description"
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 min-h-[96px] resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Project</Label>
                <Select value={formData.projectId} onValueChange={(value) => setFormData((current) => ({ ...current, projectId: value }))}>
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sprint</Label>
                <Select
                  value={formData.sprintId}
                  onValueChange={(value) => setFormData((current) => ({ ...current, sprintId: value }))}
                  disabled={!formData.projectId}
                >
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                    <SelectValue placeholder={formData.projectId ? "Select sprint" : "Select project first"} />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    <SelectItem value="none">No sprint</SelectItem>
                    {availableSprints.map((sprint) => (
                      <SelectItem key={sprint.id} value={sprint.id}>
                        {sprint.name}
                      </SelectItem>
                    ))}
                    {formData.projectId && availableSprints.length === 0 && (
                      <SelectItem value="no-sprints" disabled>No sprints for this project</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Assignee</Label>
                <Select value={formData.assigneeId} onValueChange={(value) => setFormData((current) => ({ ...current, assigneeId: value }))}>
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.name ?? user.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label>Priority</Label>
                <Select value={formData.priority} onValueChange={(value) => setFormData((current) => ({ ...current, priority: value }))}>
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData((current) => ({ ...current, status: value }))}>
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    <SelectItem value="BACKLOG">Backlog</SelectItem>
                    <SelectItem value="TODO">Todo</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="IN_REVIEW">In Review</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-due-date">Due Date</Label>
                <Input
                  id="edit-task-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(event) => setFormData((current) => ({ ...current, dueDate: event.target.value }))}
                  className="glass border-border/50 focus:border-primary/50 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-task-tags">Tags</Label>
                <Input
                  id="edit-task-tags"
                  value={formData.tags}
                  onChange={(event) => setFormData((current) => ({ ...current, tags: event.target.value }))}
                  className="glass border-border/50 focus:border-primary/50 h-11"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 glass border-border/50 hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setEditingTask(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isPending || !formData.title.trim() || !formData.projectId}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                onClick={handleSaveTask}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingTask)} onOpenChange={(open) => !open && setDeletingTask(null)}>
        <AlertDialogContent className="glass-card border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingTask ? `Delete "${deletingTask.title}"? This action cannot be undone.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass border-border/50 hover:border-primary/30 hover:bg-primary/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteTask}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
