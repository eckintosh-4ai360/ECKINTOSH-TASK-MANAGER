"use client"

import { Droppable } from "@hello-pangea/dnd"
import { KanbanCard } from "./kanban-card"
import { Plus, HelpCircle, Circle, Play, Eye, CheckCircle2, Archive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { AddTaskModal } from "@/components/modals/add-task-modal"

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
}

interface KanbanColumnProps {
  id: string
  title: string
  tasks: Task[]
  onCardClick: (task: Task) => void
  projects: { id: string; name: string }[]
  sprints: any[]
  canManageTasks: boolean
  aiScores?: Record<string, number>
}

export function KanbanColumn({ id, title, tasks, onCardClick, projects, sprints, canManageTasks, aiScores }: KanbanColumnProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "BACKLOG":
        return <HelpCircle className="w-4 h-4 text-muted-foreground" />
      case "TODO":
        return <Circle className="w-4 h-4 text-sky-400" />
      case "IN_PROGRESS":
        return <Play className="w-4 h-4 text-amber-400" />
      case "IN_REVIEW":
        return <Eye className="w-4 h-4 text-indigo-400" />
      case "COMPLETED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
      default:
        return <Archive className="w-4 h-4 text-slate-400" />
    }
  };

  const getStatusAccent = (status: string) => {
    switch (status) {
      case "BACKLOG":
        return "border-t-muted-foreground/30"
      case "TODO":
        return "border-t-sky-400/50"
      case "IN_PROGRESS":
        return "border-t-amber-400/50"
      case "IN_REVIEW":
        return "border-t-indigo-400/50"
      case "COMPLETED":
        return "border-t-emerald-400/50"
      default:
        return "border-t-slate-400/30"
    }
  };

  return (
    <div className={`flex flex-col flex-1 min-w-[280px] max-w-[340px] bg-primary/5 rounded-xl border border-primary/10 overflow-hidden h-[calc(100vh-220px)] border-t-2 ${getStatusAccent(id)} shadow-inner shadow-primary/5`}>
      {/* Column Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-primary/10 bg-primary/10 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          {getStatusIcon(id)}
          <span className="font-semibold text-foreground text-sm uppercase tracking-wide">{title}</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-mono bg-primary/20 text-primary border border-primary/25">
            {tasks.length}
          </span>
        </div>

        {canManageTasks && (
          <AddTaskModal projects={projects} sprints={sprints}>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 hover:bg-primary/20 hover:text-primary transition-all rounded-md"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </AddTaskModal>
        )}
      </div>

      {/* Droppable Area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3 overflow-y-auto scrollbar-none transition-colors duration-200 ${
              snapshot.isDraggingOver ? "bg-primary/10" : ""
            }`}
            style={{ contentVisibility: "auto" }}
          >
            {tasks.map((task, index) => (
              <KanbanCard
                key={task.id}
                task={task}
                index={index}
                onClick={() => onCardClick(task)}
                aiScore={aiScores ? aiScores[task.id] : undefined}
              />
            ))}
            {provided.placeholder}

            {tasks.length === 0 && (
              <div className="h-24 border border-dashed border-primary/10 rounded-xl flex items-center justify-center italic text-xs text-muted-foreground/60 p-4 text-center">
                Drag tasks here
              </div>
            )}
          </div>
        )}
      </Droppable>
    </div>
  )
}
