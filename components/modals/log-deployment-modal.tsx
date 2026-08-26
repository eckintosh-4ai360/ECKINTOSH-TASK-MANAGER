"use client"

import { type ReactNode, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Rocket, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createDeploymentAction } from "@/lib/actions/deployment-actions"

type ProjectOption = {
  id: string
  name: string
}

type LogDeploymentModalProps = {
  children: ReactNode
  projects: ProjectOption[]
}

const EMPTY_FORM = {
  projectId: "",
  version: "",
  environment: "production" as "development" | "staging" | "production",
  status: "success" as "pending" | "running" | "success" | "failed" | "rolled_back",
  notes: "",
}

export function LogDeploymentModal({ children, projects }: LogDeploymentModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState(EMPTY_FORM)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    if (!formData.projectId) {
      setMessage("Select a project.")
      return
    }
    if (!formData.version.trim()) {
      setMessage("Enter a version or commit reference.")
      return
    }

    startTransition(async () => {
      const result = await createDeploymentAction(formData)
      if (!result.success) {
        setMessage(result.error ?? "Could not log the deployment.")
        return
      }

      setFormData(EMPTY_FORM)
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setMessage(null) }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <Rocket className="w-5 h-5 text-primary" />
            </div>
            <span>Log Deployment</span>
          </DialogTitle>
        </DialogHeader>

        <p className="text-xs text-muted-foreground -mt-2">
          Deployments to production/staging/develop are recorded automatically from GitHub pushes. Use this for
          anything that isn&apos;t pushed through the tracked repository.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
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
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="deploy-version" className="text-sm text-muted-foreground flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-primary" />
                Version
              </Label>
              <Input
                id="deploy-version"
                value={formData.version}
                onChange={(event) => setFormData((current) => ({ ...current, version: event.target.value }))}
                placeholder="v1.4.0 or a1b2c3d"
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Environment</Label>
              <Select
                value={formData.environment}
                onValueChange={(value: typeof formData.environment) =>
                  setFormData((current) => ({ ...current, environment: value }))
                }
              >
                <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="glass-card border-primary/20">
                  <SelectItem value="production">Production</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value: typeof formData.status) =>
                setFormData((current) => ({ ...current, status: value }))
              }
            >
              <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-primary/20">
                <SelectItem value="success">Success</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="rolled_back">Rolled back</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deploy-notes" className="text-sm text-muted-foreground">Notes (optional)</Label>
            <Textarea
              id="deploy-notes"
              value={formData.notes}
              onChange={(event) => setFormData((current) => ({ ...current, notes: event.target.value }))}
              placeholder="What shipped in this release?"
              className="glass border-border/50 focus:border-primary/50 min-h-[80px] resize-none"
            />
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
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
              Log Deployment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
