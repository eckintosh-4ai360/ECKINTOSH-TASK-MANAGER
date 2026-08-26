"use client"

import { Draggable } from "@hello-pangea/dnd"
import { Calendar, Tag, Flag, Brain, MessageSquare, ListChecks } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

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
  _count?: { comments?: number }
  subtaskSummary?: { total: number; completed: number } | null
}

interface KanbanCardProps {
  task: Task
  index: number
  onClick: () => void
  aiScore?: number
}

export function KanbanCard({ task, index, onClick, aiScore }: KanbanCardProps) {
  const getPriorityStyle = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "HIGH":
      case "CRITICAL":
        return "bg-destructive/20 text-destructive border-destructive/30"
      case "MEDIUM":
        return "bg-amber-500/20 text-amber-300 border-amber-500/30"
      default:
        return "bg-primary/20 text-primary border-primary/30"
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
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`glass-card rounded-xl p-4 mb-3 hover:border-primary/40 transition-all duration-300 cursor-grab active:cursor-grabbing border ${
            snapshot.isDragging ? "border-primary/50 shadow-2xl shadow-primary/20 scale-[1.02]" : "border-primary/10"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-foreground text-sm leading-snug line-clamp-2">
                {task.title}
              </h4>
            </div>

            {task.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5">
              {task.project && (
                <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                  <Tag className="w-3 h-3 text-primary" />
                  {task.project.name}
                </span>
              )}
              {task.sprint && (
                <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground bg-primary/5 px-2 py-0.5 rounded border border-primary/10">
                  <Flag className="w-3 h-3 text-primary" />
                  {task.sprint.name}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-primary/5">
              <div className="flex items-center gap-1.5">
                {aiScore !== undefined && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase border ${
                    aiScore >= 75
                      ? "bg-destructive/20 text-destructive border-destructive/30"
                      : aiScore >= 45
                        ? "bg-amber-400/15 text-amber-300 border-amber-400/25"
                        : "bg-emerald-400/15 text-emerald-300 border-emerald-400/25"
                  }`}>
                    AI {aiScore}
                  </span>
                )}
                <span className={`text-[9px] px-1.5 py-0.5 rounded border font-mono uppercase ${getPriorityStyle(task.priority)}`}>
                  {task.priority}
                </span>
                {task.dueDate && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <Calendar className="w-3 h-3 text-primary/70" />
                    {new Date(task.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {task._count?.comments !== undefined && task._count.comments > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <MessageSquare className="w-3 h-3" />
                    {task._count.comments}
                  </span>
                )}
                {task.subtaskSummary && (
                  <span className="flex items-center gap-1 text-[10px] text-muted-foreground font-mono">
                    <ListChecks className="w-3 h-3" />
                    {task.subtaskSummary.completed}/{task.subtaskSummary.total}
                  </span>
                )}
                {task.assignee ? (
                  <Avatar className="h-5 w-5 border border-primary/20">
                    <AvatarImage src={task.assignee.avatar || undefined} alt={task.assignee.name || "User"} />
                    <AvatarFallback className="text-[8px] bg-primary/10 text-primary">
                      {task.assignee.name ? getInitials(task.assignee.name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div className="h-5 w-5 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center bg-transparent">
                    <span className="text-[8px] text-muted-foreground/50 font-mono">-</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
}
