"use client"

import Link from "next/link"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { AddTaskModal } from "@/components/modals/add-task-modal"
import { deleteSprint, updateSprint, type SprintBoardItem } from "@/lib/actions/sprint-actions"
import { toast } from "sonner"

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/20",
  IN_REVIEW: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  TODO: "bg-secondary text-muted-foreground border-border",
  BACKLOG: "bg-secondary/50 text-muted-foreground/70 border-border/50",
}

const priorityColors: Record<string, string> = {
  critical: "#f87171",
  high: "#fb923c",
  medium: "#00d4ff",
  low: "#34d399",
}

type ProjectOption = {
  id: string
  name: string
}

const EMPTY_FORM = {
  id: "",
  name: "",
  goal: "",
  projectId: "",
  status: "PLANNING" as "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED",
  startDate: "",
  endDate: "",
}

function formatShortDate(value: string | null) {
  if (!value) return "Unscheduled"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value))
}

function getDaysLeft(value: string | null) {
  if (!value) return null
  const end = new Date(value)
  const today = new Date()
  end.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function SprintsBoard({
  sprints,
  projects,
  canManageSprints,
  canManageTasks,
}: {
  sprints: SprintBoardItem[]
  projects: ProjectOption[]
  canManageSprints: boolean
  canManageTasks: boolean
}) {
  const [expandedSprint, setExpandedSprint] = useState<string | null>(sprints[0]?.id ?? null)
  const [filter, setFilter] = useState<string>("all")
  const [editingSprint, setEditingSprint] = useState<SprintBoardItem | null>(null)
  const [deletingSprint, setDeletingSprint] = useState<SprintBoardItem | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const sprintOptions = sprints.map((sprint) => ({
    id: sprint.id,
    name: sprint.name,
    projectId: sprint.project.id,
    status: sprint.status as "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED",
  }))

  useEffect(() => {
    if (!editingSprint) {
      setFormData(EMPTY_FORM)
      return
    }

    setFormData({
      id: editingSprint.id,
      name: editingSprint.name,
      goal: editingSprint.goal ?? "",
      projectId: editingSprint.project.id,
      status: editingSprint.status as "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED",
      startDate: editingSprint.startDate ? editingSprint.startDate.slice(0, 10) : "",
      endDate: editingSprint.endDate ? editingSprint.endDate.slice(0, 10) : "",
    })
  }, [editingSprint])

  const filtered = filter === "all" ? sprints : sprints.filter((sprint) => sprint.status === filter)

  const handleSaveSprint = () => {
    startTransition(async () => {
      const result = await updateSprint(formData)

      if (!result.success) {
        toast.error(result.error ?? "Could not update sprint.")
        return
      }

      toast.success("Sprint updated")
      setEditingSprint(null)
      router.refresh()
    })
  }

  const handleDeleteSprint = () => {
    if (!deletingSprint) return

    startTransition(async () => {
      const result = await deleteSprint(deletingSprint.id)

      if (!result.success) {
        toast.error(result.error ?? "Could not delete sprint.")
        return
      }

      toast.success("Sprint deleted")
      setDeletingSprint(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "ACTIVE", "PLANNING", "COMPLETED"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border ${
              filter === item
                ? "bg-primary/20 text-primary border-primary/30"
                : "glass text-muted-foreground border-border/40 hover:text-foreground hover:bg-primary/5"
            }`}
          >
            {item === "all" ? "All Sprints" : item.charAt(0) + item.slice(1).toLowerCase()}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground font-mono">
          {filtered.length} sprint{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="glass-card rounded-xl border border-dashed border-border/70 p-8 text-center">
          <p className="font-semibold text-foreground">No sprints here yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Create a sprint to start planning the next work cycle.</p>
        </div>
      )}

      {filtered.map((sprint) => {
        const progress = sprint.stats.total > 0 ? Math.round((sprint.stats.done / sprint.stats.total) * 100) : 0
        const isExpanded = expandedSprint === sprint.id
        const daysLeft = getDaysLeft(sprint.endDate)
        const isUrgent = daysLeft !== null && daysLeft <= 3 && sprint.status === "ACTIVE"

        return (
          <div
            key={sprint.id}
            className="glass-card rounded-xl border border-border/50 hover:border-primary/20 transition-all duration-300"
          >
            <button
              type="button"
              className="p-5 w-full text-left"
              onClick={() => setExpandedSprint(isExpanded ? null : sprint.id)}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: sprint.project.color, boxShadow: `0 0 8px ${sprint.project.color}60` }}
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-0.5">{sprint.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{sprint.project.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-1">
                      {sprint.goal || "No sprint goal set yet."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      sprint.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : sprint.status === "PLANNING"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                        : "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    {sprint.status}
                  </span>
                  {canManageSprints && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="glass-card border-primary/20">
                        <DropdownMenuItem onClick={() => setEditingSprint(sprint)}>
                          <Pencil className="w-4 h-4 text-primary" />
                          Edit sprint
                        </DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onClick={() => setDeletingSprint(sprint)}>
                          <Trash2 className="w-4 h-4" />
                          Delete sprint
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 mb-4 text-[10px] text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatShortDate(sprint.startDate)} - {formatShortDate(sprint.endDate)}
                </div>
                <div className={`flex items-center gap-1 ${isUrgent ? "text-red-400 font-bold" : ""}`}>
                  {isUrgent && <AlertCircle className="w-3 h-3" />}
                  <Clock className="w-3 h-3" />
                  {daysLeft === null ? "No end date" : daysLeft < 0 ? `${Math.abs(daysLeft)} days over` : `${daysLeft} days left`}
                </div>
                <div className="flex items-center gap-3 ml-auto flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-500">{sprint.stats.done} done</span>
                  <span className="flex items-center gap-1 text-primary">{sprint.stats.inProgress} in progress</span>
                  {sprint.stats.blocked > 0 && (
                    <span className="flex items-center gap-1 text-red-400">{sprint.stats.blocked} blocked</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-primary font-bold">{progress}%</span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border/40 px-5 pb-4">
                <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest my-3">Tasks in Sprint</p>
                <div className="space-y-2">
                  {sprint.tasks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/70 p-4 text-xs text-muted-foreground">
                      No tasks assigned to this sprint yet.
                    </div>
                  )}
                  {sprint.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href="/tasks"
                      className="flex items-center gap-3 p-3 rounded-lg bg-background/35 border border-border/40 hover:bg-primary/5 hover:border-primary/20 transition-colors"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: priorityColors[task.priority] ?? "#00d4ff" }}
                      />
                      <p className={`flex-1 text-xs ${task.status === "COMPLETED" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                          {task.assignee?.initials ?? "NA"}
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors[task.status] ?? statusColors.TODO}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                    </Link>
                  ))}
                  {canManageTasks && (
                    <AddTaskModal
                      projects={projects}
                      sprints={sprintOptions}
                      initialProjectId={sprint.project.id}
                      initialSprintId={sprint.id}
                    >
                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-primary/20 text-xs text-primary/70 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add task to sprint
                      </button>
                    </AddTaskModal>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}

      <Dialog open={Boolean(editingSprint)} onOpenChange={(open) => !open && setEditingSprint(null)}>
        <DialogContent className="glass-card border-primary/20 sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Sprint</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-sprint-name">Sprint Name</Label>
              <Input
                id="edit-sprint-name"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-sprint-goal">Goal</Label>
              <Textarea
                id="edit-sprint-goal"
                value={formData.goal}
                onChange={(event) => setFormData((current) => ({ ...current, goal: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 min-h-[96px] resize-none"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
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
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED") =>
                    setFormData((current) => ({ ...current, status: value }))
                  }
                >
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    <SelectItem value="PLANNING">Planning</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="COMPLETED">Completed</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-sprint-start">Start Date</Label>
                <Input
                  id="edit-sprint-start"
                  type="date"
                  value={formData.startDate}
                  onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
                  className="glass border-border/50 focus:border-primary/50 h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-sprint-end">End Date</Label>
                <Input
                  id="edit-sprint-end"
                  type="date"
                  value={formData.endDate}
                  onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))}
                  className="glass border-border/50 focus:border-primary/50 h-11"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 glass border-border/50 hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setEditingSprint(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isPending || !formData.name.trim() || !formData.projectId}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                onClick={handleSaveSprint}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingSprint)} onOpenChange={(open) => !open && setDeletingSprint(null)}>
        <AlertDialogContent className="glass-card border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Sprint</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingSprint ? `Delete "${deletingSprint.name}"? Tasks assigned to it will lose their sprint link.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass border-border/50 hover:border-primary/30 hover:bg-primary/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteSprint}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
