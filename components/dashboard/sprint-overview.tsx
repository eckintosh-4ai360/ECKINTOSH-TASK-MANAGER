"use client"

import { Zap, Calendar, ChevronRight, Clock, CheckCircle2, Circle, AlertCircle } from "lucide-react"
import Link from "next/link"

const sprints = [
  {
    id: 1,
    name: "Sprint 7 – Auth & Dashboard",
    project: "DevFlow Platform",
    projectColor: "#a855f7",
    status: "ACTIVE",
    daysLeft: 4,
    totalTasks: 25,
    doneTasks: 17,
    inProgressTasks: 5,
    blockedTasks: 1,
    endDate: "May 18",
  },
  {
    id: 2,
    name: "Sprint 3 – Checkout Flow",
    project: "E-Commerce API",
    projectColor: "#00d4ff",
    status: "ACTIVE",
    daysLeft: 2,
    totalTasks: 18,
    doneTasks: 14,
    inProgressTasks: 3,
    blockedTasks: 0,
    endDate: "May 16",
  },
  {
    id: 3,
    name: "Sprint 1 – Setup & CI/CD",
    project: "Mobile App v2",
    projectColor: "#10b981",
    status: "PLANNING",
    daysLeft: 12,
    totalTasks: 12,
    doneTasks: 0,
    inProgressTasks: 0,
    blockedTasks: 0,
    endDate: "May 26",
  },
]

export function SprintOverview() {
  return (
    <div
      className="glass-card rounded-xl p-5 transition-all duration-500 hover:border-primary/30 animate-slide-in-up border border-white/5"
      style={{ animationDelay: "200ms" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Sprint Overview</h2>
            <p className="text-[10px] text-muted-foreground">Active & upcoming sprints</p>
          </div>
        </div>
        <Link
          href="/sprints"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          Manage Sprints <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {sprints.map((sprint) => {
          const progress = sprint.totalTasks > 0 ? Math.round((sprint.doneTasks / sprint.totalTasks) * 100) : 0
          const isUrgent = sprint.daysLeft <= 3 && sprint.status === "ACTIVE"

          return (
            <div
              key={sprint.id}
              className="rounded-xl p-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: sprint.projectColor, boxShadow: `0 0 6px ${sprint.projectColor}60` }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{sprint.name}</p>
                    <p className="text-[10px] text-muted-foreground">{sprint.project}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      sprint.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {sprint.status}
                  </span>
                  <div className={`flex items-center gap-1 text-[10px] font-mono ${isUrgent ? "text-red-400" : "text-muted-foreground"}`}>
                    {isUrgent && <AlertCircle className="w-3 h-3" />}
                    <Clock className="w-3 h-3" />
                    {sprint.daysLeft}d left
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-[10px] font-mono text-primary flex-shrink-0">{progress}%</span>
              </div>

              {/* Task breakdown */}
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-[10px] text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" />
                  {sprint.doneTasks} done
                </div>
                <div className="flex items-center gap-1 text-[10px] text-primary">
                  <Circle className="w-3 h-3" />
                  {sprint.inProgressTasks} in progress
                </div>
                {sprint.blockedTasks > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-red-400">
                    <AlertCircle className="w-3 h-3" />
                    {sprint.blockedTasks} blocked
                  </div>
                )}
                <div className="ml-auto flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Calendar className="w-3 h-3" />
                  {sprint.endDate}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
