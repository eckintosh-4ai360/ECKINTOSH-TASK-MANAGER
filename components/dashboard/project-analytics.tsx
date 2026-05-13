"use client"

import { useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, AreaChart, Area } from "recharts"
import { RefreshCw } from "lucide-react"

const chartData = [
  { day: "00:00", value: 45, label: "Midnight" },
  { day: "06:00", value: 75, label: "Morning" },
  { day: "12:00", value: 74, label: "Noon" },
  { day: "18:00", value: 92, label: "Evening" },
  { day: "24:00", value: 35, label: "Night" },
]

export function ProjectAnalytics() {
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const maxValue = Math.max(...chartData.map((d) => d.value))
  const average = Math.round(chartData.reduce((acc, d) => acc + d.value, 0) / chartData.length)

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-card px-4 py-3 rounded-lg text-xs font-semibold border border-primary/30">
          <p className="font-bold text-primary text-lg font-mono">{payload[0].value}%</p>
          <p className="text-muted-foreground">{payload[0].payload.label}</p>
        </div>
      )
    }
    return null
  }

  return (
    <div
      className="glass-card rounded-xl p-6 transition-all duration-500 hover:border-primary/30 animate-slide-in-up"
      style={{ animationDelay: "400ms" }}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M18 20V10M12 20V4M6 20v-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">System Overview</h2>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse"></span>
            LIVE
          </span>
          <button className="w-8 h-8 rounded-lg glass border border-border/50 hover:border-primary/30 flex items-center justify-center transition-all">
            <RefreshCw className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "CPU Usage", value: "57%", color: "text-primary" },
          { label: "Memory", value: "73%", color: "text-chart-2" },
          { label: "Network", value: "92%", color: "text-chart-3" },
        ].map((stat) => (
          <div key={stat.label} className="glass rounded-lg p-3 border border-border/30">
            <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold font-mono ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4">
        {["Performance", "Processes", "Storage"].map((tab, i) => (
          <button
            key={tab}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
              i === 0 
                ? "bg-primary/20 text-primary border border-primary/30" 
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            {tab}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-primary"></span>CPU</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-chart-2"></span>Memory</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-chart-3"></span>Network</span>
        </div>
      </div>

      <div className="h-56 relative">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="rgb(0, 212, 255)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="rgb(0, 212, 255)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0, 212, 255, 0.1)" vertical={false} />
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgb(148, 163, 184)", fontSize: 11 }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fill: "rgb(148, 163, 184)", fontSize: 11 }}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(0, 212, 255, 0.3)", strokeWidth: 1 }} />
            <Area
              type="monotone"
              dataKey="value"
              stroke="rgb(0, 212, 255)"
              strokeWidth={2}
              fill="url(#areaGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
        
        {/* Current load indicator */}
        <div className="absolute bottom-4 right-4 glass rounded-lg px-3 py-2 border border-primary/20">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">System Load</p>
          <p className="text-xl font-bold font-mono text-primary">{average}%</p>
        </div>
      </div>
    </div>
  )
}
