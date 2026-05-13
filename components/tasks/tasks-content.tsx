"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Filter, Calendar, Tag, SlidersHorizontal } from "lucide-react"
import { useState } from "react"

const tasks = [
  {
    id: 1,
    title: "Design landing page mockup",
    project: "Website Redesign",
    priority: "High",
    dueDate: "Dec 24, 2026",
    completed: false,
    tags: ["Design", "UI/UX"],
  },
  {
    id: 2,
    title: "Implement authentication flow",
    project: "Mobile App",
    priority: "High",
    dueDate: "Dec 25, 2026",
    completed: false,
    tags: ["Backend", "Security"],
  },
  {
    id: 3,
    title: "Review pull requests",
    project: "Github Project",
    priority: "Medium",
    dueDate: "Dec 23, 2026",
    completed: true,
    tags: ["Code Review"],
  },
  {
    id: 4,
    title: "Update documentation",
    project: "API Development",
    priority: "Low",
    dueDate: "Dec 26, 2026",
    completed: false,
    tags: ["Documentation"],
  },
  {
    id: 5,
    title: "Fix responsive layout issues",
    project: "Website Redesign",
    priority: "High",
    dueDate: "Dec 24, 2026",
    completed: false,
    tags: ["Frontend", "Bug"],
  },
  {
    id: 6,
    title: "Database optimization",
    project: "Backend System",
    priority: "Medium",
    dueDate: "Dec 27, 2026",
    completed: false,
    tags: ["Database", "Performance"],
  },
]

export function TasksContent() {
  const [filter, setFilter] = useState("all")

  const filteredTasks =
    filter === "all"
      ? tasks
      : filter === "completed"
        ? tasks.filter((t) => t.completed)
        : tasks.filter((t) => !t.completed)

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "High":
        return "bg-destructive/20 text-destructive border-destructive/30"
      case "Medium":
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
          { key: "active", label: `Active (${tasks.filter((t) => !t.completed).length})` },
          { key: "completed", label: `Completed (${tasks.filter((t) => t.completed).length})` },
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
        {filteredTasks.map((task, index) => (
          <div
            key={task.id}
            className="glass-card rounded-xl p-4 hover:border-primary/30 transition-all duration-300 cursor-pointer animate-slide-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-start gap-4">
              <Checkbox 
                checked={task.completed} 
                className="mt-1 border-primary/30 data-[state=checked]:bg-primary data-[state=checked]:border-primary" 
              />
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <h3 className={`font-semibold text-foreground ${task.completed ? "line-through opacity-60" : ""}`}>
                    {task.title}
                  </h3>
                  <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase ${getPriorityStyle(task.priority)}`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-mono text-xs">
                    <Tag className="w-3.5 h-3.5 text-primary" />
                    {task.project}
                  </span>
                  <span className="flex items-center gap-1.5 font-mono text-xs">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    {task.dueDate}
                  </span>
                </div>
                <div className="flex gap-2">
                  {task.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[10px] glass border-border/30 font-mono">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
