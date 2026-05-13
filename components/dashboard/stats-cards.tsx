"use client"

import { Cpu, CheckCircle2, Activity, Clock } from "lucide-react"
import { useState } from "react"

interface DashboardStats {
  totalProjects: number
  completedProjects: number
  activeProjects: number
  pendingTasks: number
}

interface StatsCardsProps {
  stats: DashboardStats
}

export function StatsCards({ stats }: StatsCardsProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  const cards = [
    {
      title: "Total Projects",
      value: stats.totalProjects.toString(),
      percentage: "100%",
      subtitle: "All Systems",
      icon: Cpu,
      isPrimary: true,
      delay: "0ms",
    },
    {
      title: "Completed",
      value: stats.completedProjects.toString(),
      percentage: stats.totalProjects > 0 ? `${Math.round((stats.completedProjects / stats.totalProjects) * 100)}%` : "0%",
      subtitle: "Finished",
      icon: CheckCircle2,
      isPrimary: false,
      delay: "100ms",
    },
    {
      title: "Active Now",
      value: stats.activeProjects.toString(),
      percentage: stats.totalProjects > 0 ? `${Math.round((stats.activeProjects / stats.totalProjects) * 100)}%` : "0%",
      subtitle: "In Progress",
      icon: Activity,
      isPrimary: false,
      delay: "200ms",
    },
    {
      title: "Pending Tasks",
      value: stats.pendingTasks.toString(),
      percentage: stats.pendingTasks > 0 ? "!" : "0",
      subtitle: "Awaiting Action",
      icon: Clock,
      isPrimary: false,
      delay: "300ms",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((stat, index) => (
        <div
          key={stat.title}
          onMouseEnter={() => setHoveredCard(index)}
          onMouseLeave={() => setHoveredCard(null)}
          style={{ animationDelay: stat.delay }}
          className={`glass-card rounded-xl p-5 transition-all duration-500 ease-out animate-slide-in-up cursor-pointer relative overflow-hidden ${
            hoveredCard === index ? "scale-[1.02] shadow-2xl shadow-primary/20 border-primary/40" : ""
          } ${stat.isPrimary ? "border-primary/30" : "border-border/50"}`}
        >
          {/* Glow effect for primary card */}
          {stat.isPrimary && (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
          )}
          
          <div className="flex items-start justify-between mb-4 relative">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              stat.isPrimary 
                ? "bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30" 
                : "bg-secondary/80 border border-border/50"
            }`}>
              <stat.icon className={`w-5 h-5 ${stat.isPrimary ? "text-primary-foreground" : "text-primary"}`} />
            </div>
            <span className={`text-xs font-mono px-2 py-1 rounded ${
              stat.isPrimary 
                ? "bg-primary/20 text-primary" 
                : "bg-secondary text-muted-foreground"
            }`}>
              {stat.percentage}
            </span>
          </div>
          
          <p className={`text-4xl font-bold mb-1 font-mono tracking-tight ${
            stat.isPrimary ? "text-primary animate-text-glow" : "text-foreground"
          }`}>
            {stat.value}
          </p>
          
          <h3 className="text-sm font-medium text-foreground mb-1">{stat.title}</h3>
          <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
          
          {/* Progress bar */}
          <div className="mt-4 w-full h-1 bg-secondary rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ${
                stat.isPrimary 
                  ? "bg-gradient-to-r from-primary to-primary/60" 
                  : "bg-muted-foreground/30"
              }`}
              style={{ width: stat.percentage }}
            ></div>
          </div>
        </div>
      ))}
    </div>
  )
}
