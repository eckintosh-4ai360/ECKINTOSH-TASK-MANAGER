"use client"

import { useState, useEffect, useMemo, useTransition } from "react"
import { DragDropContext, DropResult } from "@hello-pangea/dnd"
import { KanbanColumn } from "./kanban-column"
import { updateTaskStatus } from "@/lib/actions/project-actions"
import { toast } from "sonner"

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

interface KanbanBoardProps {
  tasks: Task[]
  onCardClick: (task: Task) => void
  projects: { id: string; name: string }[]
  sprints: any[]
  canManageTasks: boolean
  currentUserId: string
  aiScores?: Record<string, number>
}

const COLUMNS = [
  { id: "BACKLOG", title: "Backlog" },
  { id: "TODO", title: "Todo" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "IN_REVIEW", title: "In Review" },
  { id: "COMPLETED", title: "Completed" },
]

export function KanbanBoard({ tasks, onCardClick, projects, sprints, canManageTasks, currentUserId, aiScores }: KanbanBoardProps) {
  // Only the pending moves are held locally. The task list itself always comes
  // straight from props, so a parent re-render can never throw away a drop.
  const [pendingStatus, setPendingStatus] = useState<Record<string, string>>({})
  const [, startTransition] = useTransition()

  // Release an optimistic move once the server data has caught up with it.
  useEffect(() => {
    setPendingStatus((current) => {
      const keys = Object.keys(current)
      if (keys.length === 0) return current
      const remaining = keys.filter((id) => {
        const task = tasks.find((t) => t.id === id)
        return task !== undefined && task.status !== current[id]
      })
      if (remaining.length === keys.length) return current
      return Object.fromEntries(remaining.map((id) => [id, current[id]]))
    })
  }, [tasks])

  const boardTasks = useMemo(
    () => tasks.map((task) => (pendingStatus[task.id] ? { ...task, status: pendingStatus[task.id] } : task)),
    [tasks, pendingStatus],
  )

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId) {
      // Card order within a column is not persisted (tasks have no order column).
      return
    }

    const taskId = draggableId
    const newStatus = destination.droppableId

    setPendingStatus((current) => ({ ...current, [taskId]: newStatus }))

    startTransition(async () => {
      const res = await updateTaskStatus(taskId, newStatus)
      if (!res.success) {
        toast.error(res.error ?? "Failed to update task status.")
        // Dropping the override falls back to the server status, which never changed.
        setPendingStatus((current) => {
          const { [taskId]: _reverted, ...rest } = current
          return rest
        })
      } else {
        toast.success(`Task moved to ${newStatus.replace("_", " ").toLowerCase()}`)
      }
    })
  }

  // Group tasks by status
  const tasksByStatus: Record<string, Task[]> = {
    BACKLOG: [],
    TODO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    COMPLETED: [],
  }

  boardTasks.forEach((task) => {
    if (tasksByStatus[task.status]) {
      tasksByStatus[task.status].push(task)
    } else {
      // Default fallback just in case database has a state not handled
      tasksByStatus.TODO.push(task)
    }
  })

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 select-none">
        {COLUMNS.map((column) => (
          <KanbanColumn
            key={column.id}
            id={column.id}
            title={column.title}
            tasks={tasksByStatus[column.id] || []}
            onCardClick={onCardClick}
            projects={projects}
            sprints={sprints}
            canManageTasks={canManageTasks}
            currentUserId={currentUserId}
            aiScores={aiScores}
          />
        ))}
      </div>
    </DragDropContext>
  )
}
