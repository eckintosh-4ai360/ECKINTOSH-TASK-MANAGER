"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, CheckSquare, Calendar, Tag, Folder } from "lucide-react"

import { useTransition } from "react"
import { createTask } from "@/lib/actions/project-actions"
import { toast } from "sonner"

interface Project {
  id: string
  name: string
}

interface AddTaskModalProps {
  children: React.ReactNode
  projects: Project[]
}

export function AddTaskModal({ children, projects }: AddTaskModalProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    projectId: "",
    priority: "medium",
    dueDate: "",
    tags: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.projectId) {
      toast.error("Please select a project")
      return
    }

    startTransition(async () => {
      const result = await createTask({
        title: formData.title,
        projectId: formData.projectId,
        priority: formData.priority,
        dueDate: formData.dueDate,
      })

      if (result.success) {
        toast.success("Task added successfully!")
        setOpen(false)
        setFormData({ title: "", description: "", projectId: "", priority: "medium", dueDate: "", tags: "" })
      } else {
        toast.error("Failed to add task")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <CheckSquare className="w-5 h-5 text-primary" />
            </div>
            <span>Add New Task</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="task-title" className="text-sm text-muted-foreground">
              Task Title
            </Label>
            <Input
              id="task-title"
              placeholder="Enter task title..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="glass border-border/50 focus:border-primary/50 h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description" className="text-sm text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="task-description"
              placeholder="Describe your task..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="glass border-border/50 focus:border-primary/50 min-h-[80px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Folder className="w-3.5 h-3.5 text-primary" />
                Project
              </Label>
              <Select
                value={formData.projectId}
                onValueChange={(value) => setFormData({ ...formData, projectId: value })}
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
                  {projects.length === 0 && (
                    <SelectItem value="none" disabled>No projects found</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-primary" />
                Priority
              </Label>
              <Select
                value={formData.priority}
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="glass-card border-primary/20">
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="task-due-date" className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Due Date
              </Label>
              <Input
                id="task-due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="task-tags" className="text-sm text-muted-foreground">
                Tags
              </Label>
              <Input
                id="task-tags"
                placeholder="e.g., frontend, bug"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
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
              {isPending ? (
                "Adding..."
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
