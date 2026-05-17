"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Frown, Meh, MoreHorizontal, Pencil, Plus, Smile, Trash2 } from "lucide-react"
import { AddStandupModal } from "@/components/modals/add-standup-modal"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { deleteStandup, updateStandup, type StandupItem } from "@/lib/actions/standup-actions"
import { toast } from "sonner"

type ProjectOption = {
  id: string
  name: string
}

const moodMap = {
  5: { icon: Smile, color: "text-emerald-500" },
  4: { icon: Smile, color: "text-primary" },
  3: { icon: Meh, color: "text-amber-500" },
  2: { icon: Frown, color: "text-orange-500" },
  1: { icon: Frown, color: "text-red-500" },
}

const EMPTY_FORM = {
  didYesterday: "",
  doingToday: "",
  blockers: "",
  mood: "3",
  projectId: "general",
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString()
}

export function StandupsView({
  standups,
  projects,
  currentUserId,
  canPostStandups,
  canManageAllStandups,
}: {
  standups: StandupItem[]
  projects: ProjectOption[]
  currentUserId: string
  canPostStandups: boolean
  canManageAllStandups: boolean
}) {
  const todaysStandups = standups.filter((standup) => isToday(standup.createdAt))
  const visibleStandups = todaysStandups.length > 0 ? todaysStandups : standups
  const [editingStandup, setEditingStandup] = useState<StandupItem | null>(null)
  const [deletingStandup, setDeletingStandup] = useState<StandupItem | null>(null)
  const [formData, setFormData] = useState(EMPTY_FORM)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  useEffect(() => {
    if (!editingStandup) {
      setFormData(EMPTY_FORM)
      return
    }

    setFormData({
      didYesterday: editingStandup.didYesterday,
      doingToday: editingStandup.doingToday,
      blockers: editingStandup.blockers ?? "",
      mood: String(editingStandup.mood),
      projectId: editingStandup.projectId ?? "general",
    })
  }, [editingStandup])

  const handleSave = () => {
    if (!editingStandup) return

    startTransition(async () => {
      const result = await updateStandup(editingStandup.id, {
        didYesterday: formData.didYesterday,
        doingToday: formData.doingToday,
        blockers: formData.blockers,
        mood: Number(formData.mood),
        projectId: formData.projectId === "general" ? undefined : formData.projectId,
      })

      if (!result.success) {
        toast.error(result.error ?? "Could not update standup.")
        return
      }

      toast.success("Standup updated")
      setEditingStandup(null)
      router.refresh()
    })
  }

  const handleDelete = () => {
    if (!deletingStandup) return

    startTransition(async () => {
      const result = await deleteStandup(deletingStandup.id)

      if (!result.success) {
        toast.error(result.error ?? "Could not delete standup.")
        return
      }

      toast.success("Standup deleted")
      setDeletingStandup(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      {canPostStandups && (
        <AddStandupModal projects={projects}>
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-primary/30 text-sm text-primary/70 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 font-medium"
          >
            <Plus className="w-4 h-4" />
            Post your standup for today
          </button>
        </AddStandupModal>
      )}

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
            {todaysStandups.length > 0 ? "Today" : "Recent"} - {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <span className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
          <span className="text-[10px] text-muted-foreground">{visibleStandups.length} posted</span>
        </div>

        {visibleStandups.length === 0 && (
          <div className="glass-card rounded-xl border border-dashed border-border/70 p-8 text-center">
            <p className="font-semibold text-foreground">No standups posted yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Post the first update to get the team in sync.</p>
          </div>
        )}

        {visibleStandups.map((standup) => {
          const mood = moodMap[standup.mood as keyof typeof moodMap] ?? moodMap[3]
          const MoodIcon = mood.icon
          const canManage = canManageAllStandups || standup.userId === currentUserId

          return (
            <div key={standup.id} className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/20 transition-all duration-200">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-background flex-shrink-0"
                  style={{ backgroundColor: standup.color, boxShadow: `0 0 12px ${standup.color}40` }}
                >
                  {standup.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-0.5">
                    <span className="text-sm font-bold text-foreground">{standup.user}</span>
                    <MoodIcon className={`w-4 h-4 ${mood.color}`} />
                    <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(standup.createdAt)}</span>
                    {canManage && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="glass-card border-primary/20">
                          <DropdownMenuItem onClick={() => setEditingStandup(standup)}>
                            <Pencil className="w-4 h-4 text-primary" />
                            Edit standup
                          </DropdownMenuItem>
                          <DropdownMenuItem variant="destructive" onClick={() => setDeletingStandup(standup)}>
                            <Trash2 className="w-4 h-4" />
                            Delete standup
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-[10px] text-muted-foreground">{standup.role}</p>
                    <span className="text-muted-foreground/30">/</span>
                    <div
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${standup.color}15`, color: standup.color, border: `1px solid ${standup.color}30` }}
                    >
                      {standup.project}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide w-14 flex-shrink-0 mt-0.5">DONE</span>
                      <p className="text-sm text-foreground/90 leading-relaxed">{standup.didYesterday}</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wide w-14 flex-shrink-0 mt-0.5">TODAY</span>
                      <p className="text-sm text-foreground/90 leading-relaxed">{standup.doingToday}</p>
                    </div>
                    {standup.blockers && (
                      <div className="flex gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide w-14 flex-shrink-0 mt-0.5">BLOCK</span>
                        <p className="text-sm text-red-500/90 leading-relaxed">{standup.blockers}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <Dialog open={Boolean(editingStandup)} onOpenChange={(open) => !open && setEditingStandup(null)}>
        <DialogContent className="glass-card border-primary/20 sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Edit Standup</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-standup-did">Yesterday</Label>
              <Textarea
                id="edit-standup-did"
                value={formData.didYesterday}
                onChange={(event) => setFormData((current) => ({ ...current, didYesterday: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 min-h-[90px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-standup-doing">Today</Label>
              <Textarea
                id="edit-standup-doing"
                value={formData.doingToday}
                onChange={(event) => setFormData((current) => ({ ...current, doingToday: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 min-h-[90px] resize-none"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-standup-blockers">Blockers</Label>
              <Textarea
                id="edit-standup-blockers"
                value={formData.blockers}
                onChange={(event) => setFormData((current) => ({ ...current, blockers: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 min-h-[72px] resize-none"
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
                    <SelectItem value="general">General</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mood</Label>
                <Select value={formData.mood} onValueChange={(value) => setFormData((current) => ({ ...current, mood: value }))}>
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    <SelectItem value="5">5 - Great</SelectItem>
                    <SelectItem value="4">4 - Good</SelectItem>
                    <SelectItem value="3">3 - Okay</SelectItem>
                    <SelectItem value="2">2 - Stuck</SelectItem>
                    <SelectItem value="1">1 - Rough</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 glass border-border/50 hover:border-primary/30 hover:bg-primary/5"
                onClick={() => setEditingStandup(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={isPending || !formData.didYesterday.trim() || !formData.doingToday.trim()}
                className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
                onClick={handleSave}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(deletingStandup)} onOpenChange={(open) => !open && setDeletingStandup(null)}>
        <AlertDialogContent className="glass-card border-primary/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Standup</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingStandup ? `Delete ${deletingStandup.user}'s standup update? This cannot be undone.` : ""}
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
