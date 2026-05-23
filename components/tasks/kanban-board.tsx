"use client"

import { useState, useEffect, useTransition } from "react"
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
}

interface KanbanBoardProps {
  tasks: Task[]
  onCardClick: (task: Task) => void
  projects: { id: string; name: string }[]
  sprints: any[]
  canManageTasks: boolean
  aiScores?: Record<string, number>
}

const COLUMNS = [
  { id: "BACKLOG", title: "Backlog" },
  { id: "TODO", title: "Todo" },
  { id: "IN_PROGRESS", title: "In Progress" },
  { id: "IN_REVIEW", title: "In Review" },
  { id: "COMPLETED", title: "Completed" },
]

export function KanbanBoard({ tasks, onCardClick, projects, sprints, canManageTasks, aiScores }: KanbanBoardProps) {
  const [boardTasks, setBoardTasks] = useState<Task[]>(tasks)
  const [isPending, startTransition] = useTransition()

  // Keep boardTasks in sync with parent updates (e.g. from filters)
  useEffect(() => {
    setBoardTasks(tasks)
  }, [tasks])

  const onDragEnd = (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return
    }

    const taskId = draggableId
    const newStatus = destination.droppableId

    // Optimistically update status in local state
    const originalTasks = [...boardTasks]
    const updatedTasks = boardTasks.map((t) =>
      t.id === taskId ? { ...t, status: newStatus } : t
    )
    setBoardTasks(updatedTasks)

    startTransition(async () => {
      const res = await updateTaskStatus(taskId, newStatus)
      if (!res.success) {
        toast.error(res.error ?? "Failed to update task status.")
        setBoardTasks(originalTasks) // revert on failure
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
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 select-none scrollbar-thin">
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
            aiScores={aiScores}
          />
        ))}
      </div>
    </DragDropContext>
  )
}
