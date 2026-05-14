"use client"

import { useState } from "react"
import { Zap, Calendar, Clock, CheckCircle2, Circle, AlertCircle, Plus, ChevronDown, ChevronUp } from "lucide-react"

const allSprints = [
  {
    id: 1,
    name: "Sprint 7 – Auth & Dashboard",
    project: "DevFlow Platform",
    projectColor: "#a855f7",
    status: "ACTIVE",
    goal: "Complete authentication system and redesign the main dashboard with dev-team focused widgets.",
    daysLeft: 4,
    totalTasks: 25,
    doneTasks: 17,
    inProgressTasks: 5,
    reviewTasks: 2,
    blockedTasks: 1,
    startDate: "May 11",
    endDate: "May 18",
    tasks: [
      { id: 1, title: "Redesign sidebar with DevFlow branding", status: "COMPLETED", assignee: "EC", priority: "high" },
      { id: 2, title: "Build sprint overview component", status: "COMPLETED", assignee: "EC", priority: "high" },
      { id: 3, title: "Add standup feed widget", status: "IN_PROGRESS", assignee: "EC", priority: "medium" },
      { id: 4, title: "Setup JWT auth middleware", status: "IN_REVIEW", assignee: "JY", priority: "critical" },
      { id: 5, title: "Write API route tests", status: "TODO", assignee: "KM", priority: "medium" },
    ],
  },
  {
    id: 2,
    name: "Sprint 3 – Checkout Flow",
    project: "E-Commerce API",
    projectColor: "#00d4ff",
    status: "ACTIVE",
    goal: "Complete the end-to-end checkout flow including payment integration with Paystack.",
    daysLeft: 2,
    totalTasks: 18,
    doneTasks: 14,
    inProgressTasks: 3,
    reviewTasks: 1,
    blockedTasks: 0,
    startDate: "May 9",
    endDate: "May 16",
    tasks: [
      { id: 6, title: "Paystack webhook integration", status: "IN_PROGRESS", assignee: "JY", priority: "critical" },
      { id: 7, title: "Cart state management", status: "COMPLETED", assignee: "TU", priority: "high" },
      { id: 8, title: "Order confirmation emails", status: "IN_REVIEW", assignee: "JY", priority: "medium" },
      { id: 9, title: "Fix 401 on order endpoint", status: "COMPLETED", assignee: "JY", priority: "high" },
    ],
  },
  {
    id: 3,
    name: "Sprint 1 – Setup & CI/CD",
    project: "Mobile App v2",
    projectColor: "#10b981",
    status: "PLANNING",
    goal: "Initialize Flutter project, configure CI/CD pipeline, and set up code review workflows.",
    daysLeft: 12,
    totalTasks: 12,
    doneTasks: 0,
    inProgressTasks: 0,
    reviewTasks: 0,
    blockedTasks: 0,
    startDate: "May 19",
    endDate: "May 26",
    tasks: [
      { id: 10, title: "Initialize Flutter project structure", status: "TODO", assignee: "KM", priority: "high" },
      { id: 11, title: "Configure GitHub Actions CI/CD", status: "TODO", assignee: "EC", priority: "high" },
      { id: 12, title: "Setup code review PR template", status: "TODO", assignee: "EC", priority: "low" },
    ],
  },
]

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  IN_PROGRESS: "bg-primary/10 text-primary border-primary/20",
  IN_REVIEW: "bg-chart-2/10 text-chart-2 border-chart-2/20",
  TODO: "bg-secondary text-muted-foreground border-border",
  BACKLOG: "bg-secondary/50 text-muted-foreground/70 border-border/50",
}

const priorityColors: Record<string, string> = {
  critical: "#f87171",
  high: "#fb923c",
  medium: "#00d4ff",
  low: "#34d399",
}

export function SprintsBoard() {
  const [expandedSprint, setExpandedSprint] = useState<number | null>(1)
  const [filter, setFilter] = useState<string>("all")

  const filtered = filter === "all" ? allSprints : allSprints.filter((s) => s.status === filter)

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "ACTIVE", "PLANNING", "COMPLETED"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border ${
              filter === f
                ? "bg-primary/20 text-primary border-primary/30"
                : "bg-white/5 text-muted-foreground border-white/10 hover:text-foreground hover:bg-white/10"
            }`}
          >
            {f === "all" ? "All Sprints" : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground font-mono">
          {filtered.length} sprint{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Sprint cards */}
      {filtered.map((sprint) => {
        const progress = sprint.totalTasks > 0 ? Math.round((sprint.doneTasks / sprint.totalTasks) * 100) : 0
        const isExpanded = expandedSprint === sprint.id
        const isUrgent = sprint.daysLeft <= 3 && sprint.status === "ACTIVE"

        return (
          <div
            key={sprint.id}
            className="glass-card rounded-xl border border-white/5 hover:border-white/10 transition-all duration-300"
          >
            {/* Sprint header */}
            <div
              className="p-5 cursor-pointer"
              onClick={() => setExpandedSprint(isExpanded ? null : sprint.id)}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: sprint.projectColor, boxShadow: `0 0 8px ${sprint.projectColor}60` }}
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-0.5">{sprint.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{sprint.project}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-1">{sprint.goal}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      sprint.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : sprint.status === "PLANNING"
                        ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                        : "bg-secondary text-muted-foreground border-border"
                    }`}
                  >
                    {sprint.status}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Meta row */}
              <div className="flex items-center gap-4 mb-4 text-[10px] text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {sprint.startDate} – {sprint.endDate}
                </div>
                <div className={`flex items-center gap-1 ${isUrgent ? "text-red-400 font-bold" : ""}`}>
                  {isUrgent && <AlertCircle className="w-3 h-3" />}
                  <Clock className="w-3 h-3" />
                  {sprint.daysLeft} days left
                </div>
                <div className="flex items-center gap-3 ml-auto flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-400">{sprint.doneTasks} done</span>
                  <span className="flex items-center gap-1 text-primary">{sprint.inProgressTasks} in progress</span>
                  {sprint.blockedTasks > 0 && (
                    <span className="flex items-center gap-1 text-red-400">{sprint.blockedTasks} blocked</span>
                  )}
                </div>
              </div>

              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-primary font-bold">{progress}%</span>
              </div>
            </div>

            {/* Task list (expanded) */}
            {isExpanded && (
              <div className="border-t border-white/5 px-5 pb-4">
                <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest my-3">Tasks in Sprint</p>
                <div className="space-y-2">
                  {sprint.tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: priorityColors[task.priority] ?? "#00d4ff" }}
                      />
                      <p className={`flex-1 text-xs ${task.status === "COMPLETED" ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[8px] font-bold text-primary">
                          {task.assignee}
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors[task.status] ?? statusColors.TODO}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  ))}
                  <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-primary/20 text-xs text-primary/60 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all">
                    <Plus className="w-3.5 h-3.5" />
                    Add task to sprint
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
