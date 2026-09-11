"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Eye, Loader2, Mail, Shield, UserPlus, Users } from "lucide-react"
import { toast } from "sonner"
import { sendWorkspaceInvites } from "@/lib/actions/workspace-invite-actions"

interface AddMemberModalProps {
  children: React.ReactNode
}

export function AddMemberModal({ children }: AddMemberModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState("")
  const [accessLevel, setAccessLevel] = useState("member")
  const [isPending, startTransition] = useTransition()

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail) {
      toast.error("Enter an email address.")
      return
    }

    startTransition(async () => {
      const result = await sendWorkspaceInvites({ emails: [normalizedEmail], role: accessLevel })

      if (!result.success) {
        toast.error(result.error ?? result.message ?? "The invitation could not be sent.")
        return
      }

      toast.success(result.message ?? "Invitation sent.")
      setEmail("")
      setAccessLevel("member")
      setOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !isPending && setOpen(nextOpen)}>
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
            <Label htmlFor="member-email" className="text-sm text-muted-foreground flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-primary" />
              Email Address
            </Label>
            <Input
              id="member-email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="glass border-border/50 focus:border-primary/50 h-11"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-primary" />
              Workspace Access
            </Label>
            <Select value={accessLevel} onValueChange={setAccessLevel} disabled={isPending}>
              <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-primary/20">
                <SelectItem value="member"><span className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /> Member — can work in the workspace</span></SelectItem>
                <SelectItem value="viewer"><span className="flex items-center gap-2"><Eye className="w-3.5 h-3.5" /> Viewer — read-only access</span></SelectItem>
                <SelectItem value="admin"><span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" /> Admin — full workspace access</span></SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="glass rounded-lg p-4 border border-primary/10">
            <p className="text-xs text-muted-foreground">
              The recipient will receive a secure invitation link and choose their name and password when joining.
              Pending invitations appear on this Teams page until accepted or expired.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1 glass border-border/50 hover:border-primary/30 hover:bg-primary/5"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
              disabled={isPending}
            >
              {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
              {isPending ? "Sending…" : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
