"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, MoreHorizontal, Clock, Users, CheckCircle2, ArrowUpRight } from "lucide-react"
import { useState } from "react"

interface Project {
  id: string
  name: string
  description: string | null
  status: string
  priority: string
  endDate: Date | null
  progress: number
}

interface ProjectsContentProps {
  projects: Project[]
}

export function ProjectsContent({ projects }: ProjectsContentProps) {
  const [filter, setFilter] = useState("all")

  const filteredProjects = filter === "all" 
    ? projects 
    : projects.filter((p) => p.status.toLowerCase().replace(" ", "-") === filter)

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-primary/20 text-primary border-primary/30"
      case "active":
      case "in-progress":
        return "bg-chart-4/20 text-chart-4 border-chart-4/30"
      case "review":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-muted text-muted-foreground border-border/30"
    }
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority.toLowerCase()) {
      case "high":
        return "text-destructive"
      case "medium":
        return "text-chart-4"
      default:
        return "text-primary"
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-primary/60" />
          <Input 
            placeholder="Search projects..." 
            className="pl-10 glass border-primary/20 focus:border-primary/50 h-11" 
          />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { key: "all", label: `All (${projects.length})` },
          { key: "active", label: `Active (${projects.filter((p) => p.status === "active").length})` },
          { key: "completed", label: `Completed (${projects.filter((p) => p.status === "completed").length})` },
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {projects.length === 0 && (
          <div className="lg:col-span-2 text-center py-12 glass-card rounded-xl">
            <p className="text-muted-foreground italic">No projects found. Create one to see it here!</p>
          </div>
        )}
        {filteredProjects.map((project, index) => (
          <div
            key={project.id}
            className="glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer animate-slide-in group"
            style={{ animationDelay: `${index * 75}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <ArrowUpRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1">{project.description || "No description provided."}</p>
              </div>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase ${getStatusStyle(project.status)}`}>
                  {project.status}
                </span>
                <span className={`text-xs font-mono uppercase ${getPriorityStyle(project.priority)}`}>
                  {project.priority} Priority
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-mono text-primary">{project.progress}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                    <Avatar className="w-7 h-7 border-2 border-card">
                      <AvatarFallback className="text-[10px] bg-primary/10 text-primary">U</AvatarFallback>
                    </Avatar>
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    1
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {project.endDate ? new Date(project.endDate).toLocaleDateString() : "No date"}
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
