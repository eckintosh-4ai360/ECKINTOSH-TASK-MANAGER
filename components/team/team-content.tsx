"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { toast } from "sonner"
import { deleteUserAction } from "@/lib/actions/auth-actions"
import { leaveWorkspaceAction } from "@/lib/actions/workspace-actions"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { AlertTriangle, Mail, MessageCircle, CheckCircle2, Clock, Trash2 } from "lucide-react"

export type TeamMember = {
  id: string
  name: string
  role: string
  email: string
  status: string
  tasks: number
  completed: number
  avatar: string | null
  initials: string
}

export type PendingInvitation = {
  id: string
  email: string
  workspaceRole: string
  invitedBy: string
  createdAt: string
  expiresAt: string
}

interface TeamContentProps {
  teamMembers: TeamMember[]
  pendingInvitations: PendingInvitation[]
  canManageTeam: boolean
  currentUserId: string
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value))
}

function roleLabel(role: string) {
  return role === "ADMIN" ? "Admin" : role === "VIEWER" ? "Viewer" : "Member"
}

export function TeamContent({ teamMembers, pendingInvitations, canManageTeam, currentUserId }: TeamContentProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleRemoveMember(member: TeamMember) {
    if (!confirm(`Remove ${member.name} from this workspace? They will no longer be able to access its projects, tasks, or conversations.`)) {
      return
    }

    startTransition(async () => {
      const result = await deleteUserAction(member.id)
      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(`${member.name} was removed from the workspace.`)
      router.refresh()
    })
  }

  function handleLeaveWorkspace() {
    if (!confirm("Leave this workspace? You will lose access immediately and can only rejoin with a new invitation.")) {
      return
    }

    startTransition(async () => {
      const result = await leaveWorkspaceAction()
      if (!result.success) {
        toast.error(result.error ?? "Unable to leave the workspace.")
        return
      }

      toast.success("You left the workspace.")
      router.replace("/workspaces")
      router.refresh()
    })
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={handleLeaveWorkspace}
          disabled={isPending}
        >
          <Trash2 className="mr-2 h-3.5 w-3.5" />
          Leave workspace
        </Button>
      </div>

      {pendingInvitations.length > 0 && (
        <section className="glass-card rounded-xl border border-amber-400/20 overflow-hidden">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <Mail className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">Pending invitations</h2>
                <p className="text-xs text-muted-foreground">These people have not joined this workspace yet.</p>
              </div>
            </div>
            <span className="self-start sm:self-auto rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-semibold text-amber-400">
              {pendingInvitations.length} pending
            </span>
          </div>

          <div className="divide-y divide-border/30">
            {pendingInvitations.map((invitation) => {
              const expired = new Date(invitation.expiresAt).getTime() <= Date.now()

              return (
                <div key={invitation.id} className="flex flex-col gap-3 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{invitation.email}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {roleLabel(invitation.workspaceRole)} · Invited by {invitation.invitedBy} · Sent {formatDate(invitation.createdAt)}
                    </p>
                  </div>
                  <div className={expired ? "flex items-center gap-1.5 text-xs text-destructive" : "flex items-center gap-1.5 text-xs text-muted-foreground"}>
                    {expired ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                    {expired ? "Expired — resend invitation" : `Expires ${formatDate(invitation.expiresAt)}`}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member, index) => (
          <div
            key={member.email}
            className="glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 animate-slide-in group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="relative">
                <Avatar className="w-14 h-14 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                  <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-mono">{member.initials}</AvatarFallback>
                </Avatar>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${member.status === "active" ? "bg-primary animate-pulse" : "bg-muted-foreground"}`}></span>
              </div>
              {canManageTeam && member.id !== currentUserId && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleRemoveMember(member)}
                  disabled={isPending}
                  title={`Remove ${member.name} from the workspace`}
                  aria-label={`Remove ${member.name} from the workspace`}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">{member.name}</h3>
                <p className="text-sm text-muted-foreground font-mono text-xs">{member.role}</p>
              </div>

              <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase inline-block ${
                member.status === "active" 
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground border-border/30"
              }`}>
                {member.status === "active" ? "Online" : "Away"}
              </span>

              <div className="pt-3 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    Completed
                  </span>
                  <span className="font-semibold font-mono text-primary">{member.completed}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-chart-4" />
                    In Progress
                  </span>
                  <span className="font-semibold font-mono">{member.tasks - member.completed}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 glass border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-xs" asChild>
                  <Link href="/emails">
                    <Mail className="w-3.5 h-3.5 mr-1" />
                    Email
                  </Link>
                </Button>
                <Button variant="outline" size="sm" className="flex-1 glass border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-xs" asChild>
                  <Link href="/messages">
                    <MessageCircle className="w-3.5 h-3.5 mr-1" />
                    Chat
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
