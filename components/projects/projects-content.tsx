"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Search, MoreHorizontal, Clock, Users, CheckCircle2, ArrowUpRight } from "lucide-react"
import { useState } from "react"

const projects = [
  {
    id: 1,
    name: "Website Redesign",
    description: "Complete overhaul of the company website with modern design",
    progress: 75,
    status: "In Progress",
    priority: "High",
    dueDate: "Dec 30, 2026",
    team: [
      { name: "Alexandra", avatar: "/avatars/avatar-1.jpg", initials: "AD" },
      { name: "Edwin", avatar: "/avatars/avatar-2.jpg", initials: "EA" },
      { name: "David", avatar: "/avatars/avatar-4.jpg", initials: "DO" },
    ],
    tasks: { completed: 18, total: 24 },
  },
  {
    id: 2,
    name: "Mobile App Development",
    description: "Cross-platform mobile application for iOS and Android",
    progress: 45,
    status: "In Progress",
    priority: "High",
    dueDate: "Jan 15, 2027",
    team: [
      { name: "Isaac", avatar: "/avatars/avatar-3.jpg", initials: "IO" },
      { name: "Edwin", avatar: "/avatars/avatar-2.jpg", initials: "EA" },
    ],
    tasks: { completed: 12, total: 28 },
  },
  {
    id: 3,
    name: "API Development",
    description: "RESTful API for third-party integrations",
    progress: 90,
    status: "Review",
    priority: "Medium",
    dueDate: "Dec 20, 2026",
    team: [
      { name: "Isaac", avatar: "/avatars/avatar-3.jpg", initials: "IO" },
    ],
    tasks: { completed: 27, total: 30 },
  },
  {
    id: 4,
    name: "Dashboard Analytics",
    description: "Real-time analytics dashboard with data visualization",
    progress: 30,
    status: "In Progress",
    priority: "Medium",
    dueDate: "Feb 1, 2027",
    team: [
      { name: "Alexandra", avatar: "/avatars/avatar-1.jpg", initials: "AD" },
      { name: "David", avatar: "/avatars/avatar-4.jpg", initials: "DO" },
    ],
    tasks: { completed: 6, total: 20 },
  },
  {
    id: 5,
    name: "Security Audit",
    description: "Comprehensive security review and vulnerability assessment",
    progress: 100,
    status: "Completed",
    priority: "High",
    dueDate: "Dec 10, 2026",
    team: [
      { name: "Edwin", avatar: "/avatars/avatar-2.jpg", initials: "EA" },
      { name: "Isaac", avatar: "/avatars/avatar-3.jpg", initials: "IO" },
    ],
    tasks: { completed: 15, total: 15 },
  },
]

export function ProjectsContent() {
  const [filter, setFilter] = useState("all")

  const filteredProjects = filter === "all" 
    ? projects 
    : projects.filter((p) => p.status.toLowerCase().replace(" ", "-") === filter)

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "Completed":
        return "bg-primary/20 text-primary border-primary/30"
      case "In Progress":
        return "bg-chart-4/20 text-chart-4 border-chart-4/30"
      case "Review":
        return "bg-purple-500/20 text-purple-400 border-purple-500/30"
      default:
        return "bg-muted text-muted-foreground border-border/30"
    }
  }

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case "High":
        return "text-destructive"
      case "Medium":
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
          { key: "in-progress", label: `In Progress (${projects.filter((p) => p.status === "In Progress").length})` },
          { key: "review", label: `Review (${projects.filter((p) => p.status === "Review").length})` },
          { key: "completed", label: `Completed (${projects.filter((p) => p.status === "Completed").length})` },
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
                <p className="text-sm text-muted-foreground line-clamp-1">{project.description}</p>
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
                <span className={`text-xs font-mono ${getPriorityStyle(project.priority)}`}>
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
                    {project.team.slice(0, 3).map((member, i) => (
                      <Avatar key={i} className="w-7 h-7 border-2 border-card">
                        <AvatarImage src={member.avatar} alt={member.name} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{member.initials}</AvatarFallback>
                      </Avatar>
                    ))}
                    {project.team.length > 3 && (
                      <div className="w-7 h-7 rounded-full bg-primary/20 border-2 border-card flex items-center justify-center text-[10px] font-mono text-primary">
                        +{project.team.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {project.team.length}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    {project.tasks.completed}/{project.tasks.total}
                  </span>
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3.5 h-3.5" />
                    {project.dueDate}
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
