"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { updateProject, deleteProject } from "@/lib/actions/project-actions"
import { Search, MoreHorizontal, Clock, Users, ArrowUpRight, Pencil, Trash2, Github, GitBranch, UserCheck } from "lucide-react"
import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  endDate: Date | null
  progress: number
  owner: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
  _count?: {
    members: number
  }
  repositoryUrl?: string | null
  repositoryProvider?: string | null
  repositoryDefaultBranch?: string | null
}

interface ProjectsContentProps {
  projects: Project[]
  canManageProjects: boolean
}

const EMPTY_FORM = {
  id: "",
  name: "",
  description: "",
  priority: "medium",
  status: "active",
  dueDate: "",
  repositoryUrl: "",
}

export function ProjectsContent({ projects, canManageProjects }: ProjectsContentProps) {
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [editingProject, setEditingProject] = useState<Project | null>(null)
  const [deletingProject, setDeletingProject] = useState<Project | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (!editingProject) {
      setFormData(EMPTY_FORM)
      return
    }

    setFormData({
      id: editingProject.id,
      name: editingProject.name,
      description: editingProject.description ?? "",
      priority: editingProject.priority,
      status: editingProject.status,
      dueDate: editingProject.endDate ? new Date(editingProject.endDate).toISOString().slice(0, 10) : "",
      repositoryUrl: editingProject.repositoryUrl ?? "",
    })
  }, [editingProject])

  const filteredProjects = filter === "all" 
    ? projects 
    : projects.filter((p) => p.status.toLowerCase().replace(" ", "-") === filter)
  const visibleProjects = filteredProjects.filter((project) => {
    const query = search.trim().toLowerCase()
    if (!query) return true

    return [project.name, project.description ?? "", project.status, project.priority]
      .join(" ")
      .toLowerCase()
      .includes(query)
  })

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-primary/20 text-primary border-primary/30"
      case "active":
      case "in-progress":
        return "bg-chart-4/20 text-chart-4 border-chart-4/30"
      case "review":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-muted text-muted-foreground border-border/30"
    }
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "text-destructive"
      case "medium":
        return "text-chart-4"
      default:
        return "text-primary"
    }
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateProject(formData)

      if (!result.success) {
        toast.error(result.error ?? "Could not update project.")
        return
      }

      toast.success("Project updated")
      setEditingProject(null)
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!deletingProject) return

    startTransition(async () => {
      const result = await deleteProject(deletingProject.id)

      if (!result.success) {
        toast.error(result.error ?? "Could not delete project.")
        return
      }

      toast.success("Project deleted")
      setDeletingProject(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/60" />
          <Input 
            placeholder="Search projects..." 
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-10 glass border-primary/20 focus:border-primary/50 h-11" 
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: `All (${projects.length})` },
          { key: "active", label: `Active (${projects.filter((p) => p.status === "active").length})` },
          { key: "completed", label: `Completed (${projects.filter((p) => p.status === "completed").length})` },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projects.length === 0 && (
          <div className="lg:col-span-2 text-center py-12 glass-card rounded-xl">
            <p className="text-muted-foreground italic">No projects found. Create one to see it here!</p>
          </div>
        )}
        {visibleProjects.map((project, index) => {
          const leaderName = project.owner.name ?? project.owner.email
          const leaderInitial = leaderName.charAt(0).toUpperCase()

          return (
          <div
            key={project.id}
            className="glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer animate-slide-in group"
            style={{ animationDelay: `${index * 75}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{project.description || "No description provided."}</p>
              </div>
              {canManageProjects && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="glass-card border-primary/20">
                    <DropdownMenuItem onClick={() => setEditingProject(project)}>
                      <Pencil className="w-4 h-4 text-primary" />
                      Edit project
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeletingProject(project)}
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete project
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase ${getStatusStyle(project.status)}`}>
                  {project.status}
                </span>
                <span className={`text-xs font-mono uppercase ${getPriorityStyle(project.priority)}`}>
                  {project.priority} Priority
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-mono text-primary">{project.progress}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              {project.repositoryUrl && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.14em] text-primary/80 mb-1">GitHub Connected</p>
                      <p className="text-sm font-medium text-foreground truncate">{project.repositoryUrl}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                        <GitBranch className="w-3 h-3" />
                        {project.repositoryDefaultBranch ?? "main"}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                      onClick={() => router.push(`/commits?projectId=${project.id}`)}
                    >
                      <Github className="w-4 h-4" />
                      Code Ops
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <Avatar className="w-7 h-7 border-2 border-card">
                      {project.owner.avatar && <AvatarImage src={project.owner.avatar} alt={leaderName} />}
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{leaderInitial}</AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="min-w-0">
                    <span className="flex items-center gap-1 text-xs text-foreground">
                      <UserCheck className="w-3.5 h-3.5 text-primary" />
                      <span className="truncate">Lead: {leaderName}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="w-3.5 h-3.5" />
                      {project._count?.members ?? 1} member{(project._count?.members ?? 1) === 1 ? "" : "s"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : "No date"}
                  </span>
                </div>
              </div>
            </div>
          </div>
          )
        })}
      </div>

      <Dialog open={Boolean(editingProject)} onOpenChange={(open) => !open && setEditingProject(null)}>
        <DialogContent className="glass-card border-primary/20 sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-project-name">Project Name</Label>
              <Input
                id="edit-project-name"
                value={formData.name}
                onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-project-description">Description</Label>
              <Textarea
                id="edit-project-description"
                value={formData.description}
                onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 min-h-[96px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-project-repository" className="flex items-center gap-2">
                <Github className="w-4 h-4 text-primary" />
                GitHub Repository URL
              </Label>
              <Input
                id="edit-project-repository"
                value={formData.repositoryUrl}
                onChange={(event) => setFormData((current) => ({ ...current, repositoryUrl: event.target.value }))}
                placeholder="https://github.com/owner/repository"
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-project-due-date">Due Date</Label>
                <Input
                  id="edit-project-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(event) => setFormData((current) => ({ ...current, dueDate: event.target.value }))}
                  className="glass border-border/50 focus:border-primary/50 h-11"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 glass border-border/50 hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setEditingProject(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isPending || !formData.name.trim()}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingProject)} onOpenChange={(open) => !open && setDeletingProject(null)}>
        <AlertDialogContent className="glass-card border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingProject ? `Delete "${deletingProject.name}" and its related tasks, sprints, and standups? This cannot be undone.` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="glass border-border/50 hover:border-primary/30 hover:bg-primary/5">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
