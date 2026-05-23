"use client"

import * as React from "react"
import { useState, useEffect, useTransition } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { getTaskComments, addTaskComment, deleteTaskComment, sendTaskCollaborationInvite } from "@/lib/actions/task-invite-actions"
import { updateTask } from "@/lib/actions/project-actions"
import { Calendar, Tag, Flag, Brain, UserPlus, Send, Trash2, MessageSquare, Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface Task {
  id: string
  title: string
  description?: string | null
  priority: string
  dueDate: Date | string | null
  status: string
  projectId: string
  sprintId?: string | null
  assigneeId?: string | null
  tags?: string[]
  project?: { name: string }
  sprint?: { id: string; name: string } | null
  assignee?: { name: string | null; avatar: string | null } | null
}

interface ProjectOption {
  id: string
  name: string
}

interface SprintOption {
  id: string
  name: string
  projectId: string
}

interface UserOption {
  id: string
  name: string | null
  email: string
}

interface TaskDetailSheetProps {
  task: Task | null
  isOpen: boolean
  onClose: () => void
  projects: ProjectOption[]
  sprints: SprintOption[]
  users: UserOption[]
  currentUserId: string
  canManageTasks: boolean
  onTaskUpdated?: () => void
}

interface Comment {
  id: string
  content: string
  createdAt: Date | string
  author: {
    id: string
    name: string | null
    email: string
    avatar: string | null
  }
}

export function TaskDetailSheet({
  task,
  isOpen,
  onClose,
  projects,
  sprints,
  users,
  currentUserId,
  canManageTasks,
  onTaskUpdated,
}: TaskDetailSheetProps) {
  const router = useRouter()
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [inviteEmails, setInviteEmails] = useState("")
  const [isSendingInvite, setIsSendingInvite] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [isCommentsLoading, setIsCommentsLoading] = useState(false)

  // Local copy of task form for editing
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState("")
  const [priority, setPriority] = useState("")
  const [projectId, setProjectId] = useState("")
  const [sprintId, setSprintId] = useState("none")
  const [assigneeId, setAssigneeId] = useState("unassigned")
  const [dueDate, setDueDate] = useState("")
  const [tagsStr, setTagsStr] = useState("")

  useEffect(() => {
    if (!task) return

    setTitle(task.title)
    setDescription(task.description ?? "")
    setStatus(task.status)
    setPriority(task.priority.toLowerCase())
    setProjectId(task.projectId)
    setSprintId(task.sprintId ?? "none")
    setAssigneeId(task.assigneeId ?? "unassigned")
    setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : "")
    setTagsStr(task.tags?.join(", ") ?? "")

    // Load comments
    setIsCommentsLoading(true)
    getTaskComments(task.id)
      .then((data) => {
        // Map data to local Comment structure
        const mapped = data.map((c: any) => ({
          ...c,
          author: {
            ...c.author,
            avatar: c.author.avatar,
          },
        }))
        setComments(mapped)
      })
      .finally(() => setIsCommentsLoading(false))
  }, [task, isOpen])

  if (!task) return null

  const availableSprints = projectId
    ? sprints.filter((sprint) => sprint.projectId === projectId)
    : []

  const handleUpdateField = (fields: Partial<{
    title: string
    description: string
    status: string
    priority: string
    projectId: string
    sprintId: string
    assigneeId: string
    dueDate: string
    tags: string
  }>) => {
    if (!canManageTasks && task.assigneeId !== currentUserId) {
      toast.error("You do not have permission to edit this task.")
      return
    }

    startTransition(async () => {
      const updateData = {
        id: task.id,
        title: fields.title ?? title,
        description: fields.description ?? description,
        projectId: fields.projectId ?? projectId,
        sprintId: (fields.sprintId ?? sprintId) === "none" ? undefined : (fields.sprintId ?? sprintId),
        priority: fields.priority ?? priority,
        dueDate: fields.dueDate !== undefined ? fields.dueDate : dueDate,
        tags: fields.tags ?? tagsStr,
        status: fields.status ?? status,
        assigneeId: (fields.assigneeId ?? assigneeId) === "unassigned" ? undefined : (fields.assigneeId ?? assigneeId),
      }

      const res = await updateTask(updateData)
      if (res.success) {
        if (onTaskUpdated) onTaskUpdated()
        router.refresh()
      } else {
        toast.error(res.error ?? "Failed to update task.")
      }
    })
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    const commentText = newComment.trim()
    setNewComment("")

    // Optimistic comment creation
    const tempId = `temp-${Date.now()}`
    const currentUserObj = users.find((u) => u.id === currentUserId)
    const tempComment: Comment = {
      id: tempId,
      content: commentText,
      createdAt: new Date().toISOString(),
      author: {
        id: currentUserId,
        name: currentUserObj?.name ?? "Me",
        email: currentUserObj?.email ?? "",
        avatar: null,
      },
    }

    setComments((prev) => [...prev, tempComment])

    const res = await addTaskComment(task.id, commentText)
    if (res.success && res.comment) {
      setComments((prev) =>
        prev.map((c) => (c.id === tempId ? (res.comment as unknown as Comment) : c))
      )
    } else {
      toast.error(res.error ?? "Failed to add comment.")
      setComments((prev) => prev.filter((c) => c.id !== tempId))
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    const originalComments = [...comments]
    setComments((prev) => prev.filter((c) => c.id !== commentId))

    const res = await deleteTaskComment(commentId)
    if (!res.success) {
      toast.error(res.error ?? "Failed to delete comment.")
      setComments(originalComments)
    }
  }

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmails.trim()) return

    setIsSendingInvite(true)
    const emails = inviteEmails.split(",").map((email) => email.trim()).filter(Boolean)
    
    const res = await sendTaskCollaborationInvite({
      taskId: task.id,
      emails,
    })

    setIsSendingInvite(false)
    if (res.success) {
      toast.success(res.message ?? "Invitations sent successfully!")
      setInviteEmails("")
    } else {
      toast.error(res.error ?? "Failed to send invitations.")
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="glass border-l border-primary/20 sm:max-w-[700px] w-full lg:w-[650px] p-0 flex flex-col h-full bg-slate-950/90 text-foreground overflow-hidden">
        
        {/* Sheet Top Header */}
        <SheetHeader className="p-6 border-b border-primary/10 flex flex-row items-center justify-between gap-4">
          <SheetTitle className="text-xl font-bold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            Task Details
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Scrollable Layout inside Sheet */}
          <div className="grid grid-cols-1 md:grid-cols-[1.6fr_1fr] h-full">
            
            {/* Left Column: Title, Description, Comments */}
            <div className="p-6 space-y-6 md:border-r border-primary/10">
              
              {/* Task Title */}
              <div className="space-y-1">
                <Label htmlFor="detail-title" className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Title</Label>
                <Input
                  id="detail-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleUpdateField({ title })}
                  className="glass border-primary/15 text-lg font-semibold focus:border-primary/40 h-11"
                  disabled={!canManageTasks && task.assigneeId !== currentUserId}
                />
              </div>

              {/* Task Description */}
              <div className="space-y-1">
                <Label htmlFor="detail-desc" className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Description</Label>
                <Textarea
                  id="detail-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onBlur={() => handleUpdateField({ description })}
                  placeholder="Describe this task..."
                  className="glass border-primary/15 min-h-[120px] resize-none focus:border-primary/40 focus:ring-0 leading-relaxed text-sm"
                  disabled={!canManageTasks && task.assigneeId !== currentUserId}
                />
              </div>

              <Separator className="bg-primary/10" />

              {/* Comments Thread */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <span>Discussion ({comments.length})</span>
                </div>

                {/* Comment Box Input */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <Input
                    placeholder="Ask a question or post an update..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="glass border-primary/15 flex-1 focus:border-primary/40 h-10 text-sm"
                  />
                  <Button type="submit" size="icon" className="h-10 w-10 bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30 shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>

                {/* Comments List */}
                <div className="space-y-3 pt-2">
                  {isCommentsLoading ? (
                    <div className="flex justify-center py-6 text-muted-foreground text-xs gap-2 items-center">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                      Loading conversation...
                    </div>
                  ) : comments.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic text-center py-6">No comments yet. Start the conversation!</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="glass-card rounded-lg p-3 border border-primary/5 flex items-start gap-3 relative group">
                        <Avatar className="h-7 w-7 border border-primary/10 shrink-0">
                          <AvatarImage src={comment.author.avatar || undefined} alt={comment.author.name || "User"} />
                          <AvatarFallback className="text-[10px] bg-primary/15 text-primary">
                            {comment.author.name ? getInitials(comment.author.name) : "U"}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold text-foreground truncate">{comment.author.name ?? comment.author.email}</span>
                            <span className="text-[9px] text-muted-foreground font-mono">
                              {new Date(comment.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })} at {new Date(comment.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground/90 whitespace-pre-wrap leading-relaxed">{comment.content}</p>
                        </div>

                        {/* Delete comment button (only author or admin can delete) */}
                        {(comment.author.id === currentUserId || canManageTasks) && !comment.id.startsWith("temp-") && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Metadata Panel & Share Collaboration */}
            <div className="p-6 space-y-6 bg-primary/5">
              
              {/* Properties Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-muted-foreground uppercase font-mono tracking-wider">Properties</h4>
                
                {/* Status Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={status} onValueChange={(val) => { setStatus(val); handleUpdateField({ status: val }); }}>
                    <SelectTrigger className="glass border-primary/15 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-primary/20">
                      <SelectItem value="BACKLOG">Backlog</SelectItem>
                      <SelectItem value="TODO">Todo</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="IN_REVIEW">In Review</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Priority</Label>
                  <Select value={priority} onValueChange={(val) => { setPriority(val); handleUpdateField({ priority: val }); }}>
                    <SelectTrigger className="glass border-primary/15 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-primary/20">
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Assignee Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Assignee</Label>
                  <Select value={assigneeId} onValueChange={(val) => { setAssigneeId(val); handleUpdateField({ assigneeId: val }); }}>
                    <SelectTrigger className="glass border-primary/15 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-primary/20">
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ?? u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Project Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Project</Label>
                  <Select value={projectId} onValueChange={(val) => { setProjectId(val); handleUpdateField({ projectId: val }); }}>
                    <SelectTrigger className="glass border-primary/15 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-primary/20">
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Sprint Dropdown */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Sprint</Label>
                  <Select value={sprintId} onValueChange={(val) => { setSprintId(val); handleUpdateField({ sprintId: val }); }}>
                    <SelectTrigger className="glass border-primary/15 h-9 text-xs" disabled={!projectId}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass border-primary/20">
                      <SelectItem value="none">No Sprint</SelectItem>
                      {availableSprints.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Due Date */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <Input
                    type="date"
                    value={dueDate}
                    onChange={(e) => { setDueDate(e.target.value); handleUpdateField({ dueDate: e.target.value || "" }); }}
                    className="glass border-primary/15 h-9 text-xs"
                  />
                </div>

                {/* Tags */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Tags (comma-separated)</Label>
                  <Input
                    value={tagsStr}
                    onChange={(e) => setTagsStr(e.target.value)}
                    onBlur={() => handleUpdateField({ tags: tagsStr })}
                    placeholder="e.g. bug, api, front"
                    className="glass border-primary/15 h-9 text-xs"
                  />
                </div>

              </div>

              <Separator className="bg-primary/10" />

              {/* Share / Invitation Box */}
              <div className="space-y-3 p-4 rounded-xl border border-primary/10 bg-primary/5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Invite Collaborators</span>
                </div>
                
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  Send email invitations directly to add developers, stakeholders, or clients to collaborate on this task.
                </p>

                <form onSubmit={handleSendInvite} className="space-y-2">
                  <Input
                    placeholder="email@example.com, user@domain.com"
                    value={inviteEmails}
                    onChange={(e) => setInviteEmails(e.target.value)}
                    className="glass border-primary/15 h-8 text-xs placeholder:text-[10px]"
                    required
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="w-full text-xs h-8 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold hover:from-primary hover:to-primary/95 transition-all shadow-md shadow-primary/10"
                    disabled={isSendingInvite || !inviteEmails.trim()}
                  >
                    {isSendingInvite ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Inviting...
                      </>
                    ) : (
                      "Send Invitation Link"
                    )}
                  </Button>
                </form>
              </div>

            </div>

          </div>
        </div>

      </SheetContent>
    </Sheet>
  )
}
