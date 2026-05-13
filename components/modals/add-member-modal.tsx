"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { UserPlus, Mail, Briefcase, Shield } from "lucide-react"

interface AddMemberModalProps {
  children: React.ReactNode
}

export function AddMemberModal({ children }: AddMemberModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "",
    team: "",
    accessLevel: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Member invited:", formData)
    setOpen(false)
    setFormData({ name: "", email: "", role: "", team: "", accessLevel: "" })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <UserPlus className="w-5 h-5 text-primary" />
            </div>
            <span>Invite Team Member</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="member-name" className="text-sm text-muted-foreground">
              Full Name
            </Label>
            <Input
              id="member-name"
              placeholder="Enter full name..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="glass border-border/50 focus:border-primary/50 h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="member-email" className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary" />
              Email Address
            </Label>
            <Input
              id="member-email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="glass border-border/50 focus:border-primary/50 h-11"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                Role
              </Label>
              <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="glass-card border-primary/20">
                  <SelectItem value="designer">Designer</SelectItem>
                  <SelectItem value="developer">Developer</SelectItem>
                  <SelectItem value="manager">Project Manager</SelectItem>
                  <SelectItem value="qa">QA Engineer</SelectItem>
                  <SelectItem value="analyst">Business Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">
                Team
              </Label>
              <Select value={formData.team} onValueChange={(value) => setFormData({ ...formData, team: value })}>
                <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                  <SelectValue placeholder="Select team" />
                </SelectTrigger>
                <SelectContent className="glass-card border-primary/20">
                  <SelectItem value="frontend">Frontend</SelectItem>
                  <SelectItem value="backend">Backend</SelectItem>
                  <SelectItem value="design">Design</SelectItem>
                  <SelectItem value="qa">Quality Assurance</SelectItem>
                  <SelectItem value="devops">DevOps</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Access Level
            </Label>
            <Select
              value={formData.accessLevel}
              onValueChange={(value) => setFormData({ ...formData, accessLevel: value })}
            >
              <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                <SelectValue placeholder="Select access level" />
              </SelectTrigger>
              <SelectContent className="glass-card border-primary/20">
                <SelectItem value="admin">Admin - Full access</SelectItem>
                <SelectItem value="editor">Editor - Can edit projects</SelectItem>
                <SelectItem value="viewer">Viewer - Read only access</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="glass rounded-lg p-4 border border-primary/10">
            <p className="text-xs text-muted-foreground">
              An invitation email will be sent to the provided email address. The user will need to accept the invitation to join the workspace.
            </p>
          </div>

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
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Send Invitation
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
