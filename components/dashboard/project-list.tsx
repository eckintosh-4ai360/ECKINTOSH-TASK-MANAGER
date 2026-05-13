import { Plus, Server, Layers, Layout, Zap, Search } from "lucide-react"
import { Button } from "@/components/ui/button"

interface Project {
  id: string
  name: string
  priority: string
  endDate: Date | null
}

interface ProjectListProps {
  projects: Project[]
}

export function ProjectList({ projects }: ProjectListProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority.toUpperCase()) {
      case "HIGH": return "text-destructive bg-destructive/10 border-destructive/30"
      case "MEDIUM": return "text-chart-4 bg-chart-4/10 border-chart-4/30"
      case "LOW": return "text-primary bg-primary/10 border-primary/30"
      default: return "text-muted-foreground bg-muted border-border"
    }
  }

  return (
    <div
      className="glass-card rounded-xl p-5 transition-all duration-500 hover:border-primary/30 animate-slide-in-up"
      style={{ animationDelay: "700ms" }}
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold text-foreground">Active Modules</h2>
        <Button 
          variant="outline" 
          size="sm" 
          className="glass border-primary/30 hover:border-primary/50 hover:bg-primary/10 text-foreground h-8"
        >
          <Plus className="w-4 h-4 mr-1" />
          New
        </Button>
      </div>
      <div className="space-y-2">
        {projects.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 italic">No projects found. Create one to get started!</p>
        )}
        {projects.map((project, index) => (
          <div
            key={project.id}
            className="flex items-center gap-3 p-3 rounded-lg glass hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all duration-300 cursor-pointer group"
            style={{ animationDelay: `${800 + index * 100}ms` }}
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center border border-border/50 group-hover:border-primary/30 transition-all">
              <Server className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm truncate">{project.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                Due: {project.endDate ? new Date(project.endDate).toLocaleDateString() : "No date"}
              </p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase ${getPriorityColor(project.priority)}`}>
              {project.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
