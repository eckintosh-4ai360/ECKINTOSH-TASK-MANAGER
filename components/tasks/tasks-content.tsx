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
import { Search, Calendar, Tag, SlidersHorizontal, MoreHorizontal, Pencil, Trash2, Flag, Brain, WandSparkles, Loader2, LayoutGrid, List } from "lucide-react"
import { createTask, deleteTask, toggleTaskStatus, updateTask } from "@/lib/actions/project-actions"
import { aiParseTaskCapture, type SmartTaskDraft } from "@/lib/actions/ai-actions"
import { scoreTaskPriority } from "@/lib/ai/productivity-engine"
import type { SprintOption } from "@/lib/actions/sprint-actions"
import { useSearch } from "@/components/dashboard/search-context"
import { toast } from "sonner"
import { KanbanBoard } from "./kanban-board"
import { TaskDetailSheet } from "./task-detail-sheet"

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
  createdAt?: Date | string | null
  updatedAt?: Date | string | null
  project?: { name: string }
  sprint?: { id: string; name: string } | null
  assignee?: { name: string | null; avatar: string | null } | null
  _count?: { comments?: number }
  subtaskSummary?: { total: number; completed: number } | null
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
  const [viewMode, setViewMode] = useState<"list" | "board">("board")
  const [activeDetailTask, setActiveDetailTask] = useState<Task | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [filter, setFilter] = useState("all")
  const [sortMode, setSortMode] = useState<"ai" | "recent">("ai")
  const [captureText, setCaptureText] = useState("")
  const [captureProjectId, setCaptureProjectId] = useState(projects[0]?.id ?? "")
  const [draftTask, setDraftTask] = useState<SmartTaskDraft | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isCapturing, startCaptureTransition] = useTransition()
  const [isCreatingDraft, startCreateDraftTransition] = useTransition()
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

  // Synchronize activeDetailTask with parent tasks changes
  useEffect(() => {
    if (activeDetailTask) {
      const updated = tasks.find((t) => t.id === activeDetailTask.id)
      if (updated) {
        setActiveDetailTask(updated)
      }
    }
  }, [tasks, activeDetailTask])

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

  const rankedTasks = filteredTasks.map((task) => ({
    task,
    ai: scoreTaskPriority({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      tags: task.tags,
      project: task.project,
    }),
  }))

  const displayTasks = sortMode === "ai"
    ? [...rankedTasks].sort((left, right) => right.ai.score - left.ai.score)
    : rankedTasks

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

  const handleSmartCapture = () => {
    if (!captureText.trim()) {
      toast.error("Describe the task first.")
      return
    }

    startCaptureTransition(async () => {
      const result = await aiParseTaskCapture({
        text: captureText,
        projects,
        defaultProjectId: captureProjectId || projects[0]?.id,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      setDraftTask(result.draft)
      toast.success("AI task draft prepared")
    })
  }

  const handleCreateDraftTask = () => {
    if (!draftTask?.title.trim()) return
    if (!draftTask.projectId) {
      toast.error("Select a project for this task.")
      return
    }

    startCreateDraftTransition(async () => {
      const result = await createTask({
        title: draftTask.title,
        description: draftTask.description,
        projectId: draftTask.projectId!,
        priority: draftTask.priority,
        dueDate: draftTask.dueDate ?? undefined,
        tags: draftTask.tags.join(", "),
      })

      if (!result.success) {
        toast.error(result.error ?? "Could not create task.")
        return
      }

      toast.success("Task created from AI capture")
      setDraftTask(null)
      setCaptureText("")
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

      {canManageTasks && (
        <div className="glass-card rounded-xl border border-primary/15 p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <Label htmlFor="smart-task-capture" className="text-sm font-semibold text-foreground">
                  Smart task capture
                </Label>
              </div>
              <Textarea
                id="smart-task-capture"
                value={captureText}
                onChange={(event) => setCaptureText(event.target.value)}
                placeholder="Try: Fix auth redirect bug by tomorrow, high priority, tag backend"
                className="glass min-h-[84px] resize-none border-border/50 focus:border-primary/50"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-[minmax(190px,1fr)_auto] lg:min-w-[380px]">
              <div className="space-y-2">
                <Label>Default project</Label>
                <Select value={captureProjectId} onValueChange={setCaptureProjectId} disabled={projects.length === 0}>
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                    <SelectValue placeholder="Select project" />
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

              <Button
                type="button"
                onClick={handleSmartCapture}
                disabled={isCapturing || !captureText.trim() || projects.length === 0}
                className="h-11 self-end bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {isCapturing ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                Draft
              </Button>
            </div>
          </div>

          {draftTask && (
            <div className="mt-4 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr_auto] lg:items-end">
                <div className="space-y-2">
                  <Label htmlFor="draft-title">AI draft title</Label>
                  <Input
                    id="draft-title"
                    value={draftTask.title}
                    onChange={(event) => setDraftTask((current) => current ? { ...current, title: event.target.value } : current)}
                    className="glass border-border/50 focus:border-primary/50 h-11"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Project</Label>
                    <Select
                      value={draftTask.projectId ?? ""}
                      onValueChange={(value) => setDraftTask((current) => current ? { ...current, projectId: value } : current)}
                    >
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
                    <Label>Priority</Label>
                    <Select
                      value={draftTask.priority}
                      onValueChange={(value) => setDraftTask((current) => current ? { ...current, priority: value as SmartTaskDraft["priority"] } : current)}
                    >
                      <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-card border-primary/20">
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="draft-date">Due</Label>
                    <Input
                      id="draft-date"
                      type="date"
                      value={draftTask.dueDate ?? ""}
                      onChange={(event) => setDraftTask((current) => current ? { ...current, dueDate: event.target.value || null } : current)}
                      className="glass border-border/50 focus:border-primary/50 h-11"
                    />
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleCreateDraftTask}
                  disabled={isCreatingDraft || !draftTask.title.trim() || !draftTask.projectId}
                  className="h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                >
                  {isCreatingDraft ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
                  Create
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono text-primary">{Math.round(draftTask.confidence * 100)}% confidence</span>
                <span>{draftTask.explanation}</span>
                {draftTask.tags.map((tag) => (
                  <span key={tag} className="rounded-md border border-border/40 px-2 py-0.5 font-mono">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 flex-wrap items-center w-full">
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
        <Button
          type="button"
          onClick={() => setSortMode((current) => current === "ai" ? "recent" : "ai")}
          size="sm"
          className={
            sortMode === "ai"
              ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
              : "glass border-border/30 hover:border-primary/30 hover:bg-primary/5 text-foreground"
          }
        >
          <Brain className="h-3.5 w-3.5" />
          {sortMode === "ai" ? "AI ranked" : "Recent order"}
        </Button>

        <div className="ml-auto flex items-center gap-1 border border-primary/15 rounded-lg p-0.5 glass">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("board")}
            className={`h-7 px-2.5 rounded-md gap-1.5 text-xs transition-all ${
              viewMode === "board"
                ? "bg-primary/20 text-primary border border-primary/25"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Board
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={`h-7 px-2.5 rounded-md gap-1.5 text-xs transition-all ${
              viewMode === "list"
                ? "bg-primary/20 text-primary border border-primary/25"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            List
          </Button>
        </div>
      </div>

      {viewMode === "board" ? (
        <KanbanBoard
          tasks={displayTasks.map(({ task }) => task)}
          onCardClick={(task) => {
            setActiveDetailTask(task)
            setIsDetailOpen(true)
          }}
          projects={projects}
          sprints={sprints}
          canManageTasks={canManageTasks}
          aiScores={rankedTasks.reduce((acc, curr) => {
            acc[curr.task.id] = curr.ai.score
            return acc
          }, {} as Record<string, number>)}
        />
      ) : (
        <div className="grid gap-3">
          {displayTasks.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8 italic">No tasks found. Create one to get started!</p>
          )}
          {displayTasks.map(({ task, ai }, index) => (
            <div
              key={task.id}
              onClick={(e) => {
                const target = e.target as HTMLElement
                if (target.closest('button') || target.closest('input') || target.closest('[role="checkbox"]')) {
                  return
                }
                setActiveDetailTask(task)
                setIsDetailOpen(true)
              }}
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
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase ${
                        ai.score >= 75
                          ? "bg-destructive/20 text-destructive border-destructive/30"
                          : ai.score >= 45
                            ? "bg-amber-400/15 text-amber-300 border-amber-400/25"
                            : "bg-emerald-400/15 text-emerald-300 border-emerald-400/25"
                      }`}>
                        AI {ai.score}
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase ${getPriorityStyle(task.priority)}`}>
                        {task.priority}
                      </span>
                      {canManageTasks && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="glass-card border-primary/20">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingTask(task); }}>
                              <Pencil className="w-4 h-4 text-primary" />
                              Edit task
                            </DropdownMenuItem>
                            <DropdownMenuItem variant="destructive" onClick={(e) => { e.stopPropagation(); setDeletingTask(task); }}>
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
                    {ai.reasons[0] && (
                      <span className="flex items-center gap-1.5 font-mono text-xs text-primary/80">
                        <Brain className="w-3.5 h-3.5" />
                        {ai.reasons.slice(0, 2).join(", ")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

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

      <TaskDetailSheet
        task={activeDetailTask}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        projects={projects}
        sprints={sprints}
        users={users}
        currentUserId={currentUserId}
        canManageTasks={canManageTasks}
      />
    </div>
  )
}
