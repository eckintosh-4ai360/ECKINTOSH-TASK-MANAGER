"use client"

import { type ReactNode, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Frown, Loader2, Meh, Plus, Send, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { createStandup } from "@/lib/actions/standup-actions"

type ProjectOption = {
  id: string
  name: string
}

type AddStandupModalProps = {
  children: ReactNode
  projects: ProjectOption[]
}

const moodOptions = [
  { value: 5, icon: Smile, label: "Great", color: "text-emerald-500", border: "border-emerald-500/40", bg: "bg-emerald-500/10" },
  { value: 4, icon: Smile, label: "Good", color: "text-primary", border: "border-primary/40", bg: "bg-primary/10" },
  { value: 3, icon: Meh, label: "Okay", color: "text-amber-500", border: "border-amber-500/40", bg: "bg-amber-500/10" },
  { value: 2, icon: Frown, label: "Meh", color: "text-orange-500", border: "border-orange-500/40", bg: "bg-orange-500/10" },
  { value: 1, icon: Frown, label: "Rough", color: "text-red-500", border: "border-red-500/40", bg: "bg-red-500/10" },
]

export function AddStandupModal({ children, projects }: AddStandupModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    projectId: "",
    mood: 4,
    didYesterday: "",
    doingToday: "",
    blockers: "",
  })

  function reset() {
    setFormData({
      projectId: "",
      mood: 4,
      didYesterday: "",
      doingToday: "",
      blockers: "",
    })
    setMessage(null)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage(null)

    startTransition(async () => {
      const result = await createStandup(formData)
      if (!result.success) {
        setMessage(result.error ?? "Could not post standup.")
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
      <DialogContent className="glass-card border-primary/20 sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <span>Post Standup</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Project</Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData((current) => ({ ...current, projectId: value }))}
              >
                <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                  <SelectValue placeholder="General update" />
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
              <Label className="text-sm text-muted-foreground">Mood</Label>
              <div className="flex gap-2 flex-wrap">
                {moodOptions.map((mood) => {
                  const Icon = mood.icon
                  const selected = formData.mood === mood.value
                  return (
                    <button
                      key={mood.value}
                      type="button"
                      onClick={() => setFormData((current) => ({ ...current, mood: mood.value }))}
                      className={cn(
                        "flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all",
                        selected ? `${mood.bg} ${mood.border} ${mood.color}` : "glass border-border/50 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {mood.label}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="standup-did" className="text-sm text-muted-foreground">What did you do yesterday?</Label>
            <Textarea
              id="standup-did"
              value={formData.didYesterday}
              onChange={(event) => setFormData((current) => ({ ...current, didYesterday: event.target.value }))}
              placeholder="Completed the login page, fixed API errors..."
              className="glass border-border/50 focus:border-primary/50 min-h-[90px] resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="standup-doing" className="text-sm text-muted-foreground">What are you doing today?</Label>
            <Textarea
              id="standup-doing"
              value={formData.doingToday}
              onChange={(event) => setFormData((current) => ({ ...current, doingToday: event.target.value }))}
              placeholder="Working on payment integration, writing tests..."
              className="glass border-border/50 focus:border-primary/50 min-h-[90px] resize-none"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="standup-blockers" className="text-sm text-muted-foreground">Any blockers?</Label>
            <Textarea
              id="standup-blockers"
              value={formData.blockers}
              onChange={(event) => setFormData((current) => ({ ...current, blockers: event.target.value }))}
              placeholder="Waiting for credentials, need design review..."
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
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Post Standup
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
