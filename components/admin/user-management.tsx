"use client"

import { useState, useTransition } from "react"
import { createUserAction, deleteUserAction } from "@/lib/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Trash2, Shield, User, Eye, Mail, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"

interface UserRow {
  id: string
  name: string | null
  email: string
  role: string
  createdAt: Date
}

interface UserManagementProps {
  users: UserRow[]
}

export function UserManagement({ users }: UserManagementProps) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [role, setRole] = useState("USER")

  function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    formData.set("role", role)

    startTransition(async () => {
      const result = await createUserAction(formData)
      if (result?.error) {
        setError(result.error)
      } else {
        toast.success("User created successfully!")
        setOpen(false)
        setRole("USER")
      }
    })
  }

  function handleDelete(userId: string, email: string) {
    if (!confirm(`Delete user "${email}"? This cannot be undone.`)) return

    startTransition(async () => {
      const result = await deleteUserAction(userId)
      if (result?.error) toast.error(result.error)
      else toast.success("User deleted")
    })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-mono uppercase bg-primary/20 text-primary border-primary/30">
            <Shield className="w-2.5 h-2.5" /> Admin
          </span>
        )
      case "USER":
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-mono uppercase bg-chart-4/20 text-chart-4 border-chart-4/30">
            <User className="w-2.5 h-2.5" /> User
          </span>
        )
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border font-mono uppercase bg-muted text-muted-foreground border-border">
            <Eye className="w-2.5 h-2.5" /> Guest
          </span>
        )
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header action */}
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20">
              <Plus className="w-4 h-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-primary/20 sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
                  <User className="w-5 h-5 text-primary" />
                </div>
                Create New User
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="new-name" className="text-sm text-muted-foreground">Full Name</Label>
                <Input id="new-name" name="name" placeholder="e.g. John Doe" required className="glass border-border/50 focus:border-primary/50 h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-email" className="text-sm text-muted-foreground flex items-center gap-1">
                  <Mail className="w-3 h-3 text-primary" /> Email Address
                </Label>
                <Input id="new-email" name="email" type="email" placeholder="user@example.com" required className="glass border-border/50 focus:border-primary/50 h-11" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password" className="text-sm text-muted-foreground">Password</Label>
                <Input id="new-password" name="password" type="password" placeholder="Minimum 6 characters" required minLength={6} className="glass border-border/50 focus:border-primary/50 h-11" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="glass-card border-primary/20">
                    <SelectItem value="USER">User</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                    <SelectItem value="GUEST">Guest</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1 glass" onClick={() => setOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={isPending} className="flex-1 bg-gradient-to-r from-primary to-primary/80">
                  {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Create User</>}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Users table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-5 border-b border-border/50">
          <h2 className="font-semibold text-foreground">All Users <span className="text-muted-foreground font-normal text-sm">({users.length})</span></h2>
        </div>
        <div className="divide-y divide-border/30">
          {users.length === 0 && (
            <p className="text-center py-10 text-muted-foreground italic text-sm">No users found.</p>
          )}
          {users.map((user) => (
            <div key={user.id} className="flex items-center gap-4 p-4 hover:bg-primary/5 transition-colors group">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-primary uppercase">
                  {(user.name ?? user.email)[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">{user.name ?? "—"}</p>
                <p className="text-xs text-muted-foreground font-mono truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-3">
                {getRoleBadge(user.role)}
                <span className="text-[10px] text-muted-foreground font-mono hidden sm:block">
                  {new Date(user.createdAt).toLocaleDateString()}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8"
                  onClick={() => handleDelete(user.id, user.email)}
                  disabled={isPending}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
