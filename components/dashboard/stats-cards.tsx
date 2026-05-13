"use client"

import { Cpu, CheckCircle2, Activity, Clock } from "lucide-react"
import { useState } from "react"

const stats = [
  {
    title: "Total Projects",
    value: "24",
    percentage: "87%",
    subtitle: "12 Core Systems",
    icon: Cpu,
    isPrimary: true,
    delay: "0ms",
  },
  {
    title: "Completed",
    value: "10",
    percentage: "73%",
    subtitle: "This Quarter",
    icon: CheckCircle2,
    isPrimary: false,
    delay: "100ms",
  },
  {
    title: "In Progress",
    value: "12",
    percentage: "92%",
    subtitle: "Active Now",
    icon: Activity,
    isPrimary: false,
    delay: "200ms",
  },
  {
    title: "Pending",
    value: "2",
    percentage: "15%",
    subtitle: "Awaiting Review",
    icon: Clock,
    isPrimary: false,
    delay: "300ms",
  },
]

export function StatsCards() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
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
