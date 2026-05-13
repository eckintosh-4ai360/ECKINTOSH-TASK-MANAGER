"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Layers, Calendar, Users, AlertCircle } from "lucide-react"

interface AddProjectModalProps {
  children: React.ReactNode
}

export function AddProjectModal({ children }: AddProjectModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    priority: "",
    dueDate: "",
    team: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Project created:", formData)
    setOpen(false)
    setFormData({ name: "", description: "", priority: "", dueDate: "", team: "" })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <Layers className="w-5 h-5 text-primary" />
            </div>
            <span>Create New Project</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="project-name" className="text-sm text-muted-foreground">
              Project Name
            </Label>
            <Input
              id="project-name"
              placeholder="Enter project name..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="glass border-border/50 focus:border-primary/50 h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe your project..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="glass border-border/50 focus:border-primary/50 min-h-[100px] resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertCircle className="w-3.5 h-3.5 text-primary" />
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
                  <SelectItem value="high">High Priority</SelectItem>
                  <SelectItem value="medium">Medium Priority</SelectItem>
                  <SelectItem value="low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="due-date" className="text-sm text-muted-foreground flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                Due Date
              </Label>
              <Input
                id="due-date"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Users className="w-3.5 h-3.5 text-primary" />
              Assign Team
            </Label>
            <Select value={formData.team} onValueChange={(value) => setFormData({ ...formData, team: value })}>
              <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                <SelectValue placeholder="Select team" />
              </SelectTrigger>
              <SelectContent className="glass-card border-primary/20">
                <SelectItem value="frontend">Frontend Team</SelectItem>
                <SelectItem value="backend">Backend Team</SelectItem>
                <SelectItem value="design">Design Team</SelectItem>
                <SelectItem value="qa">QA Team</SelectItem>
              </SelectContent>
            </Select>
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
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
