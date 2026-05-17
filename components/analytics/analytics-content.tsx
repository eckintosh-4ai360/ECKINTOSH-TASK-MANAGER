"use client"

import { TrendingUp, TrendingDown, Users, CheckCircle, Clock, Target, ArrowUpRight } from "lucide-react"
import { useState } from "react"

const stats = [
  { 
    title: "Total Tasks Completed", value: "247", change: "+12%", trend: "up", icon: CheckCircle,
    color: "primary", gradient: "from-primary/20 to-primary/5", iconBg: "from-primary to-primary/60", borderDefault: "border-primary/20", borderHover: "border-primary/50 shadow-primary/20", delay: "0ms"
  },
  { 
    title: "Active Projects", value: "12", change: "+3", trend: "up", icon: Target,
    color: "chart-2", gradient: "from-chart-2/20 to-chart-2/5", iconBg: "from-chart-2 to-chart-2/60", borderDefault: "border-chart-2/20", borderHover: "border-chart-2/50 shadow-chart-2/20", delay: "100ms"
  },
  { 
    title: "Team Members", value: "24", change: "-2", trend: "down", icon: Users,
    color: "chart-3", gradient: "from-chart-3/20 to-chart-3/5", iconBg: "from-chart-3 to-chart-3/60", borderDefault: "border-chart-3/20", borderHover: "border-chart-3/50 shadow-chart-3/20", delay: "200ms"
  },
  { 
    title: "Avg. Completion Time", value: "2.3", subtitle: "days", change: "-0.5", trend: "up", icon: Clock,
    color: "chart-4", gradient: "from-chart-4/20 to-chart-4/5", iconBg: "from-chart-4 to-chart-4/60", borderDefault: "border-chart-4/20", borderHover: "border-chart-4/50 shadow-chart-4/20", delay: "300ms"
  },
]

const monthlyData = [
  { month: "Jan", tasks: 45, projects: 8 },
  { month: "Feb", tasks: 52, projects: 9 },
  { month: "Mar", tasks: 48, projects: 10 },
  { month: "Apr", tasks: 61, projects: 11 },
  { month: "May", tasks: 55, projects: 12 },
  { month: "Jun", tasks: 67, projects: 12 },
]

export function AnalyticsContent() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)
  const maxTasks = Math.max(...monthlyData.map((d) => d.tasks))

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, index) => (
          <div
            key={stat.title}
            onMouseEnter={() => setHoveredCard(index)}
            onMouseLeave={() => setHoveredCard(null)}
            style={{ animationDelay: stat.delay }}
            className={`glass-card rounded-xl p-4 transition-all duration-300 ease-out animate-slide-in-up cursor-pointer relative overflow-hidden border ${
              hoveredCard === index
                ? `scale-[1.03] shadow-sm ${stat.borderHover}`
                : stat.borderDefault
            }`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} pointer-events-none opacity-60`} />

            <div className="relative">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.iconBg} flex items-center justify-center shadow-lg`}>
                    <stat.icon className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <h3 className="text-[11px] font-semibold text-foreground uppercase tracking-wider opacity-80">{stat.title}</h3>
                </div>
                <div
                  className={`w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center transition-transform duration-300 ${
                    hoveredCard === index ? "rotate-45 bg-primary text-primary-foreground" : "text-primary"
                  }`}
                >
                  <ArrowUpRight className="w-3 h-3" />
                </div>
              </div>

              <div className="mt-2">
                <p className="text-3xl font-extrabold font-mono text-foreground tracking-tight mb-1">
                  {stat.value}
                  {stat.subtitle && <span className="text-sm font-normal ml-1 text-muted-foreground">{stat.subtitle}</span>}
                </p>
                <div className="flex items-center gap-1.5 text-xs opacity-90 font-mono">
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  )}
                  <span className={stat.trend === "up" ? "text-emerald-500 font-bold" : "text-rose-500 font-bold"}>{stat.change}</span>
                  <span className="text-muted-foreground ml-1">vs last month</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card rounded-xl p-6 relative overflow-hidden border border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="relative">
            <h3 className="font-bold text-lg mb-6 font-mono tracking-tight flex items-center gap-2 uppercase">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              Monthly Task Completion
            </h3>
            <div className="space-y-5">
              {monthlyData.map((data, index) => (
                <div
                  key={data.month}
                  className="space-y-2 animate-slide-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center justify-between text-xs font-mono uppercase font-semibold">
                    <span className="text-muted-foreground">{data.month}</span>
                    <span className="text-primary">{data.tasks} TASKS</span>
                  </div>
                  <div className="w-full bg-secondary/50 rounded-full h-2.5 overflow-hidden backdrop-blur-sm border border-white/5">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-primary/50 rounded-full transition-all duration-1000 ease-out relative"
                      style={{ width: `${(data.tasks / maxTasks) * 100}%` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent w-full h-full animate-[pulse_2s_ease-in-out_infinite]" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-6 relative overflow-hidden border border-chart-2/20">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent pointer-events-none" />
          <div className="relative">
            <h3 className="font-bold text-lg mb-6 font-mono tracking-tight flex items-center gap-2 uppercase">
              <div className="w-2.5 h-2.5 rounded-full bg-chart-2 animate-pulse" />
              Project Distribution
            </h3>
            <div className="space-y-4 mt-8">
              {[
                { name: "In Progress", count: 8, color: "bg-chart-2", border: "border-chart-2/30", text: "text-chart-2" },
                { name: "Completed", count: 15, color: "bg-emerald-500", border: "border-emerald-500/30", text: "text-emerald-500" },
                { name: "Pending", count: 5, color: "bg-amber-500", border: "border-amber-500/30", text: "text-amber-500" },
                { name: "On Hold", count: 2, color: "bg-rose-500", border: "border-rose-500/30", text: "text-rose-500" },
              ].map((item, index) => (
                <div
                  key={item.name}
                  className={`flex items-center justify-between p-4 rounded-xl border ${item.border} bg-white/5 backdrop-blur-md hover:bg-white/10 hover:scale-[1.02] transition-all duration-300 animate-slide-in cursor-pointer group`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${item.color} shadow-[0_0_10px_rgba(0,0,0,0.2)] group-hover:scale-125 transition-transform`} />
                    <span className="font-bold font-mono uppercase text-sm">{item.name}</span>
                  </div>
                  <span className={`text-2xl font-black font-mono ${item.text}`}>{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

