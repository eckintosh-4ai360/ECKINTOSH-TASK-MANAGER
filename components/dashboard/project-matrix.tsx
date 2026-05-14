"use client"

import { Layers, ChevronRight, ExternalLink } from "lucide-react"
import Link from "next/link"
import { useSearch } from "./search-context"

interface Project {
  id: string
  name: string
  status: string
  priority: string
  progress?: number
  _count?: { tasks: number }
}

interface ProjectMatrixProps {
  projects: Project[]
}

const statusColors: Record<string, string> = {
  active: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
  paused: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  completed: "text-primary bg-primary/10 border-primary/20",
  archived: "text-muted-foreground bg-secondary border-border",
}

const priorityDot: Record<string, string> = {
  critical: "#f87171",
  high: "#fb923c",
  medium: "#00d4ff",
  low: "#34d399",
}

const projectColors = ["#00d4ff", "#a855f7", "#10b981", "#f59e0b", "#ef4444", "#6366f1"]

const fallbackProjects = [
  { id: "1", name: "E-Commerce API", status: "active", priority: "high", progress: 72, _count: { tasks: 18 } },
  { id: "2", name: "DevFlow Platform", status: "active", priority: "critical", progress: 45, _count: { tasks: 25 } },
  { id: "3", name: "Mobile App v2", status: "paused", priority: "medium", progress: 20, _count: { tasks: 12 } },
  { id: "4", name: "Portfolio Site", status: "completed", priority: "low", progress: 100, _count: { tasks: 8 } },
]

export function ProjectMatrix({ projects }: ProjectMatrixProps) {
  const { matches, isSearching } = useSearch()

  const allProjects = projects.length > 0 ? projects : fallbackProjects
  const displayProjects = allProjects.filter((p) =>
    matches(p.name, p.status, p.priority)
  )

  return (
    <div
      className="glass-card rounded-xl p-5 transition-all duration-500 hover:border-primary/30 animate-slide-in-up border border-white/5"
      style={{ animationDelay: "440ms" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <Layers className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Project Matrix</h2>
            <p className="text-[10px] text-muted-foreground">{displayProjects.length} projects total</p>
          </div>
        </div>
        <Link href="/projects" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          All Projects <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {displayProjects.length === 0 && isSearching && (
          <p className="text-xs text-muted-foreground text-center py-6 italic col-span-full">No projects match your search.</p>
        )}
        {displayProjects.slice(0, 6).map((project, i) => {
          const color = projectColors[i % projectColors.length]
          const progress = project.progress ?? 0
          const statusClass = statusColors[project.status] ?? statusColors.active
          const dotColor = priorityDot[project.priority] ?? priorityDot.medium

          return (
            <Link
              key={project.id}
              href={`/projects`}
              className="group rounded-xl p-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}60` }}
                  />
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {project.name}
                  </p>
                </div>
                <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusClass}`}>
                  {project.status.toUpperCase()}
                </span>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dotColor }} />
                  <span className="text-[9px] text-muted-foreground capitalize">{project.priority}</span>
                </div>
                <span className="ml-auto text-[10px] text-muted-foreground">
                  {project._count?.tasks ?? 0} tasks
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${progress}%`, backgroundColor: color }}
                  />
                </div>
                <span className="text-[10px] font-mono flex-shrink-0" style={{ color }}>
                  {progress}%
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
