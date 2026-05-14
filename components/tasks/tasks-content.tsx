"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Calendar, Tag, SlidersHorizontal } from "lucide-react"
import { useState, useTransition } from "react"
import { toggleTaskStatus } from "@/lib/actions/project-actions"
import { useSearch } from "@/components/dashboard/search-context"

interface Task {
  id: string
  title: string
  priority: string
  dueDate: Date | null
  status: string
  project?: { name: string }
}

interface TasksContentProps {
  tasks: Task[]
}

export function TasksContent({ tasks }: TasksContentProps) {
  const [filter, setFilter] = useState("all")
  const [isPending, startTransition] = useTransition()
  const { query, setQuery, matches } = useSearch()

  const handleToggle = (taskId: string, currentStatus: string) => {
    startTransition(async () => {
      await toggleTaskStatus(taskId, currentStatus !== "COMPLETED")
    })
  }

  const baseTasks =
    filter === "all"
      ? tasks
      : filter === "completed"
        ? tasks.filter((t) => t.status === "COMPLETED")
        : tasks.filter((t) => t.status !== "COMPLETED")

  const filteredTasks = baseTasks.filter((t) =>
    matches(t.title, t.project?.name, t.priority, t.status)
  )

  const getPriorityStyle = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "HIGH":
        return "bg-destructive/20 text-destructive border-destructive/30"
      case "MEDIUM":
        return "bg-chart-4/20 text-chart-4 border-chart-4/30"
      default:
        return "bg-primary/20 text-primary border-primary/30"
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/60" />
          <Input 
            placeholder="Search tasks..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-10 glass border-primary/20 focus:border-primary/50 h-11" 
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
            <SlidersHorizontal className="w-4 h-4" />
            Filter
          </Button>
          <Button variant="outline" className="gap-2 glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
            <Calendar className="w-4 h-4" />
            Date
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: `All (${tasks.length})` },
          { key: "active", label: `Active (${tasks.filter((t) => t.status !== "COMPLETED").length})` },
          { key: "completed", label: `Completed (${tasks.filter((t) => t.status === "COMPLETED").length})` },
        ].map((tab) => (
          <Button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            size="sm"
            className={
              filter === tab.key
                ? "bg-primary/20 text-primary border border-primary/30 hover:bg-primary/30"
                : "glass border-border/30 hover:border-primary/30 hover:bg-primary/5 text-foreground"
            }
          >
            {tab.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3">
        {tasks.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8 italic">No tasks found. Create one to get started!</p>
        )}
        {filteredTasks.map((task, index) => (
          <div
            key={task.id}
            className="glass-card rounded-xl p-4 hover:border-primary/30 transition-all duration-300 cursor-pointer animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-4">
              <Checkbox 
                checked={task.status === "COMPLETED"} 
                onCheckedChange={() => handleToggle(task.id, task.status)}
                disabled={isPending}
                className="mt-1 border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <h3 className={`font-semibold text-foreground ${task.status === "COMPLETED" ? "line-through opacity-60" : ""}`}>
                    {task.title}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase ${getPriorityStyle(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {task.project && (
                    <span className="flex items-center gap-1.5 font-mono text-xs">
                      <Tag className="w-3.5 h-3.5 text-primary" />
                      {task.project.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 font-mono text-xs">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : "No date"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
