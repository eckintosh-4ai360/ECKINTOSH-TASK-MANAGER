"use client"

import { type ReactNode, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Calendar, Flag, Goal, Loader2, Plus, Zap } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createSprint } from "@/lib/actions/sprint-actions"

type ProjectOption = {
  id: string
  name: string
}

type AddSprintModalProps = {
  children: ReactNode
  projects: ProjectOption[]
}

export function AddSprintModal({ children, projects }: AddSprintModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    name: "",
    goal: "",
    projectId: "",
    status: "PLANNING" as "PLANNING" | "ACTIVE" | "COMPLETED" | "CANCELLED",
    startDate: "",
    endDate: "",
  })

  function reset() {
    setFormData({
      name: "",
      goal: "",
      projectId: "",
      status: "PLANNING",
      startDate: "",
      endDate: "",
    })
    setMessage(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (!formData.projectId) {
      setMessage("Select a project for this sprint.")
      return
    }

    startTransition(async () => {
      const result = await createSprint(formData)
      if (!result.success) {
        setMessage(result.error ?? "Could not create sprint.")
        return
      }

      reset()
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setMessage(null) }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <Zap className="w-5 h-5 text-primary" />
            </div>
            <span>Create Sprint</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="sprint-name" className="text-sm text-muted-foreground flex items-center gap-2">
              <Flag className="w-3.5 h-3.5 text-primary" />
              Sprint Name
            </Label>
            <Input
              id="sprint-name"
              value={formData.name}
              onChange={(event) => setFormData((current) => ({ ...current, name: event.target.value }))}
              placeholder="Sprint 8 - Launch polish"
              className="glass border-border/50 focus:border-primary/50 h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sprint-goal" className="text-sm text-muted-foreground flex items-center gap-2">
              <Goal className="w-3.5 h-3.5 text-primary" />
              Goal
            </Label>
            <Textarea
              id="sprint-goal"
              value={formData.goal}
              onChange={(event) => setFormData((current) => ({ ...current, goal: event.target.value }))}
              placeholder="What should the team accomplish?"
              className="glass border-border/50 focus:border-primary/50 min-h-[90px] resize-none"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Project</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData((current) => ({ ...current, projectId: value }))}
              >
                <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent className="glass-card border-primary/20">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                  {projects.length === 0 && <SelectItem value="none" disabled>No projects found</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Status</Label>
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
              <Label htmlFor="sprint-start" className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Start Date
              </Label>
              <Input
                id="sprint-start"
                type="date"
                value={formData.startDate}
                onChange={(event) => setFormData((current) => ({ ...current, startDate: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="sprint-end" className="text-sm text-muted-foreground">End Date</Label>
              <Input
                id="sprint-end"
                type="date"
                value={formData.endDate}
                onChange={(event) => setFormData((current) => ({ ...current, endDate: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>
          </div>

          {message && (
            <p className="rounded-xl border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {message}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 glass border-border/50 hover:border-primary/30 hover:bg-primary/5"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Sprint
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
