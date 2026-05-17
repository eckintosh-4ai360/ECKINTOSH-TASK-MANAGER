"use client"

import Link from "next/link"
import { useState } from "react"
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Plus,
} from "lucide-react"
import type { SprintBoardItem } from "@/lib/actions/sprint-actions"

const statusColors: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
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

function formatShortDate(value: string | null) {
  if (!value) return "Unscheduled"
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric" }).format(new Date(value))
}

function getDaysLeft(value: string | null) {
  if (!value) return null
  const end = new Date(value)
  const today = new Date()
  end.setHours(0, 0, 0, 0)
  today.setHours(0, 0, 0, 0)
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export function SprintsBoard({ sprints }: { sprints: SprintBoardItem[] }) {
  const [expandedSprint, setExpandedSprint] = useState<string | null>(sprints[0]?.id ?? null)
  const [filter, setFilter] = useState<string>("all")

  const filtered = filter === "all" ? sprints : sprints.filter((sprint) => sprint.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        {["all", "ACTIVE", "PLANNING", "COMPLETED"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border ${
              filter === item
                ? "bg-primary/20 text-primary border-primary/30"
                : "glass text-muted-foreground border-border/40 hover:text-foreground hover:bg-primary/5"
            }`}
          >
            {item === "all" ? "All Sprints" : item.charAt(0) + item.slice(1).toLowerCase()}
          </button>
        ))}
        <div className="ml-auto text-xs text-muted-foreground font-mono">
          {filtered.length} sprint{filtered.length === 1 ? "" : "s"}
        </div>
      </div>

      {filtered.length === 0 && (
        <div className="glass-card rounded-xl border border-dashed border-border/70 p-8 text-center">
          <p className="font-semibold text-foreground">No sprints here yet.</p>
          <p className="text-sm text-muted-foreground mt-1">Create a sprint to start planning the next work cycle.</p>
        </div>
      )}

      {filtered.map((sprint) => {
        const progress = sprint.stats.total > 0 ? Math.round((sprint.stats.done / sprint.stats.total) * 100) : 0
        const isExpanded = expandedSprint === sprint.id
        const daysLeft = getDaysLeft(sprint.endDate)
        const isUrgent = daysLeft !== null && daysLeft <= 3 && sprint.status === "ACTIVE"

        return (
          <div
            key={sprint.id}
            className="glass-card rounded-xl border border-border/50 hover:border-primary/20 transition-all duration-300"
          >
            <button
              type="button"
              className="p-5 w-full text-left"
              onClick={() => setExpandedSprint(isExpanded ? null : sprint.id)}
            >
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                    style={{ backgroundColor: sprint.project.color, boxShadow: `0 0 8px ${sprint.project.color}60` }}
                  />
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-foreground mb-0.5">{sprint.name}</h3>
                    <p className="text-[10px] text-muted-foreground">{sprint.project.name}</p>
                    <p className="text-[11px] text-muted-foreground mt-1.5 leading-relaxed line-clamp-1">
                      {sprint.goal || "No sprint goal set yet."}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                      sprint.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                        : sprint.status === "PLANNING"
                        ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
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

              <div className="flex items-center gap-4 mb-4 text-[10px] text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {formatShortDate(sprint.startDate)} - {formatShortDate(sprint.endDate)}
                </div>
                <div className={`flex items-center gap-1 ${isUrgent ? "text-red-400 font-bold" : ""}`}>
                  {isUrgent && <AlertCircle className="w-3 h-3" />}
                  <Clock className="w-3 h-3" />
                  {daysLeft === null ? "No end date" : daysLeft < 0 ? `${Math.abs(daysLeft)} days over` : `${daysLeft} days left`}
                </div>
                <div className="flex items-center gap-3 ml-auto flex-wrap">
                  <span className="flex items-center gap-1 text-emerald-500">{sprint.stats.done} done</span>
                  <span className="flex items-center gap-1 text-primary">{sprint.stats.inProgress} in progress</span>
                  {sprint.stats.blocked > 0 && (
                    <span className="flex items-center gap-1 text-red-400">{sprint.stats.blocked} blocked</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-700"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-primary font-bold">{progress}%</span>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-border/40 px-5 pb-4">
                <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest my-3">Tasks in Sprint</p>
                <div className="space-y-2">
                  {sprint.tasks.length === 0 && (
                    <div className="rounded-lg border border-dashed border-border/70 p-4 text-xs text-muted-foreground">
                      No tasks assigned to this sprint yet.
                    </div>
                  )}
                  {sprint.tasks.map((task) => (
                    <Link
                      key={task.id}
                      href="/tasks"
                      className="flex items-center gap-3 p-3 rounded-lg bg-background/35 border border-border/40 hover:bg-primary/5 hover:border-primary/20 transition-colors"
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
                          {task.assignee?.initials ?? "NA"}
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors[task.status] ?? statusColors.TODO}`}>
                          {task.status.replace("_", " ")}
                        </span>
                      </div>
                    </Link>
                  ))}
                  <Link
                    href="/tasks"
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-primary/20 text-xs text-primary/70 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add task to sprint
                  </Link>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
