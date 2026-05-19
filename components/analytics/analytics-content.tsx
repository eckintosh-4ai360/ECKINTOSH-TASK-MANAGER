"use client"

import {
  TrendingUp,
  TrendingDown,
  Users,
  CheckCircle,
  Clock,
  Target,
  ArrowUpRight,
  AlertTriangle,
  BarChart2,
  Activity,
  Layers,
} from "lucide-react"
import { useState } from "react"
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  Cell,
  RadialBarChart,
  RadialBar,
  PieChart,
  Pie,
  Legend,
} from "recharts"
import type { AnalyticsData } from "@/lib/actions/analytics-actions"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatChange(current: number, previous: number, suffix = ""): { label: string; trend: "up" | "down" | "neutral" } {
  if (previous === 0 && current === 0) return { label: "No data", trend: "neutral" }
  if (previous === 0) return { label: `+${current}${suffix} new`, trend: "up" }
  const diff = current - previous
  const pct = Math.round(Math.abs((diff / previous) * 100))
  const sign = diff >= 0 ? "+" : "-"
  return {
    label: `${sign}${pct}%`,
    trend: diff >= 0 ? "up" : "down",
  }
}

function formatAvgChange(
  current: number | null,
  previous: number | null,
): { label: string; trend: "up" | "down" | "neutral" } {
  if (current === null) return { label: "No data", trend: "neutral" }
  if (previous === null) return { label: "First data", trend: "neutral" }
  const diff = current - previous
  if (diff === 0) return { label: "No change", trend: "neutral" }
  // For completion time, LOWER is BETTER — so if diff < 0, trend is "up"
  const sign = diff > 0 ? "+" : ""
  return {
    label: `${sign}${diff.toFixed(1)} days`,
    trend: diff < 0 ? "up" : "down",
  }
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="glass-card rounded-lg px-3 py-2.5 border border-primary/20 shadow-lg text-xs font-mono">
      <p className="text-primary font-bold mb-1 uppercase">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AnalyticsContentProps {
  data: AnalyticsData
}

export function AnalyticsContent({ data }: AnalyticsContentProps) {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null)

  const completedChange = formatChange(data.completedTasks, data.completedTasksLastMonth)
  const projectsChange = formatChange(data.activeProjects, data.activeProjectsLastMonth)
  const avgChange = formatAvgChange(data.avgCompletionDays, data.avgCompletionDaysLastMonth)

  // KPI stat cards
  const stats = [
    {
      title: "Total Tasks Completed",
      value: data.completedTasks.toString(),
      change: completedChange.label,
      trend: completedChange.trend,
      icon: CheckCircle,
      gradient: "from-primary/20 to-primary/5",
      iconBg: "from-primary to-primary/60",
      borderDefault: "border-primary/20",
      borderHover: "border-primary/50 shadow-primary/20",
      delay: "0ms",
    },
    {
      title: "Active Projects",
      value: data.activeProjects.toString(),
      change: projectsChange.label,
      trend: projectsChange.trend,
      icon: Target,
      gradient: "from-chart-2/20 to-chart-2/5",
      iconBg: "from-chart-2 to-chart-2/60",
      borderDefault: "border-chart-2/20",
      borderHover: "border-chart-2/50 shadow-chart-2/20",
      delay: "100ms",
    },
    {
      title: "Team Members",
      value: data.teamMembers.toString(),
      change: "All time",
      trend: "neutral" as const,
      icon: Users,
      gradient: "from-chart-3/20 to-chart-3/5",
      iconBg: "from-chart-3 to-chart-3/60",
      borderDefault: "border-chart-3/20",
      borderHover: "border-chart-3/50 shadow-chart-3/20",
      delay: "200ms",
    },
    {
      title: "Avg. Completion Time",
      value: data.avgCompletionDays !== null ? data.avgCompletionDays.toString() : "—",
      subtitle: data.avgCompletionDays !== null ? "days" : undefined,
      change: avgChange.label,
      trend: avgChange.trend,
      icon: Clock,
      gradient: "from-chart-4/20 to-chart-4/5",
      iconBg: "from-chart-4 to-chart-4/60",
      borderDefault: "border-chart-4/20",
      borderHover: "border-chart-4/50 shadow-chart-4/20",
      delay: "300ms",
    },
  ]

  // Project distribution for pie
  const projectDistData = [
    { name: "Active", value: data.projectStatusBreakdown.active, fill: "var(--color-primary)" },
    { name: "Paused", value: data.projectStatusBreakdown.paused, fill: "#f59e0b" },
    { name: "Completed", value: data.projectStatusBreakdown.completed, fill: "#10b981" },
    { name: "Archived", value: data.projectStatusBreakdown.archived, fill: "#6b7280" },
  ].filter((d) => d.value > 0)

  // Task status for radial
  const taskStatusData = [
    { name: "Completed", value: data.taskStatusBreakdown.completed, fill: "#10b981" },
    { name: "In Review", value: data.taskStatusBreakdown.inReview, fill: "var(--color-chart-2)" },
    { name: "In Progress", value: data.taskStatusBreakdown.inProgress, fill: "var(--color-primary)" },
    { name: "Todo", value: data.taskStatusBreakdown.todo, fill: "#f59e0b" },
    { name: "Backlog", value: data.taskStatusBreakdown.backlog, fill: "#6b7280" },
  ]

  // Priority bar chart
  const priorityData = [
    { name: "Critical", value: data.priorityBreakdown.critical, fill: "#ef4444" },
    { name: "High", value: data.priorityBreakdown.high, fill: "#f59e0b" },
    { name: "Medium", value: data.priorityBreakdown.medium, fill: "var(--color-primary)" },
    { name: "Low", value: data.priorityBreakdown.low, fill: "#6b7280" },
  ]

  const totalTasksForRate =
    data.taskStatusBreakdown.backlog +
    data.taskStatusBreakdown.todo +
    data.taskStatusBreakdown.inProgress +
    data.taskStatusBreakdown.inReview +
    data.taskStatusBreakdown.completed

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Row 1: KPI cards ────────────────────────────────────────────── */}
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
                  {"subtitle" in stat && stat.subtitle && (
                    <span className="text-sm font-normal ml-1 text-muted-foreground">{stat.subtitle}</span>
                  )}
                </p>
                <div className="flex items-center gap-1.5 text-xs opacity-90 font-mono">
                  {stat.trend === "up" ? (
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                  ) : stat.trend === "down" ? (
                    <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
                  ) : (
                    <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                  )}
                  <span
                    className={
                      stat.trend === "up"
                        ? "text-emerald-500 font-bold"
                        : stat.trend === "down"
                        ? "text-rose-500 font-bold"
                        : "text-muted-foreground"
                    }
                  >
                    {stat.change}
                  </span>
                  {stat.trend !== "neutral" && (
                    <span className="text-muted-foreground ml-1">vs last month</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Area trend chart (full-width) ────────────────────────── */}
      <div className="glass-card rounded-xl p-6 relative overflow-hidden border border-primary/20">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-base font-mono tracking-tight flex items-center gap-2 uppercase">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              6-Month Task Trend
            </h3>
            <div className="flex items-center gap-4 text-[11px] font-mono text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                Completed
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-chart-2" />
                Created
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.monthlyTrend} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCompleted" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradCreated" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-chart-2)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fontFamily: "monospace", fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fontFamily: "monospace", fill: "var(--color-muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Area
                type="monotone"
                dataKey="completed"
                name="Completed"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                fill="url(#gradCompleted)"
                dot={{ r: 3, fill: "var(--color-primary)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--color-primary)", stroke: "rgba(0,212,255,0.4)", strokeWidth: 3 }}
              />
              <Area
                type="monotone"
                dataKey="created"
                name="Created"
                stroke="var(--color-chart-2)"
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="url(#gradCreated)"
                dot={{ r: 3, fill: "var(--color-chart-2)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--color-chart-2)", stroke: "rgba(168,85,247,0.4)", strokeWidth: 3 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Row 3: Project distribution + Task status breakdown ──────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Project distribution – donut */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden border border-chart-2/20">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-2/5 to-transparent pointer-events-none" />
          <div className="relative">
            <h3 className="font-bold text-base mb-5 font-mono tracking-tight flex items-center gap-2 uppercase">
              <div className="w-2.5 h-2.5 rounded-full bg-chart-2 animate-pulse" />
              Project Distribution
            </h3>

            {projectDistData.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm font-mono">
                No projects yet
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={projectDistData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {projectDistData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} strokeWidth={0} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={<ChartTooltip />}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2 min-w-[130px]">
                  {projectDistData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: item.fill }}
                        />
                        <span className="text-xs font-mono font-bold uppercase text-foreground">
                          {item.name}
                        </span>
                      </div>
                      <span
                        className="text-base font-black font-mono"
                        style={{ color: item.fill }}
                      >
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Task status breakdown – horizontal bar */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden border border-chart-3/20">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-3/5 to-transparent pointer-events-none" />
          <div className="relative">
            <h3 className="font-bold text-base mb-5 font-mono tracking-tight flex items-center gap-2 uppercase">
              <div className="w-2.5 h-2.5 rounded-full bg-chart-3 animate-pulse" />
              Task Status Breakdown
            </h3>
            <div className="space-y-3">
              {taskStatusData.map((item) => {
                const pct = totalTasksForRate > 0 ? Math.round((item.value / totalTasksForRate) * 100) : 0
                return (
                  <div key={item.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="uppercase font-bold text-muted-foreground">{item.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold" style={{ color: item.fill }}>{item.value}</span>
                        <span className="text-muted-foreground">({pct}%)</span>
                      </div>
                    </div>
                    <div className="w-full bg-secondary/40 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.fill,
                          boxShadow: `0 0 8px ${item.fill}60`,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 4: Priority bar chart + Summary metrics ──────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Priority breakdown – vertical bar chart */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden border border-chart-4/20">
          <div className="absolute inset-0 bg-gradient-to-br from-chart-4/5 to-transparent pointer-events-none" />
          <div className="relative">
            <h3 className="font-bold text-base mb-5 font-mono tracking-tight flex items-center gap-2 uppercase">
              <div className="w-2.5 h-2.5 rounded-full bg-chart-4 animate-pulse" />
              Tasks by Priority
            </h3>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={priorityData} margin={{ top: 0, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fontFamily: "monospace", fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fontFamily: "monospace", fill: "var(--color-muted-foreground)" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Tasks" radius={[4, 4, 0, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Summary metric tiles */}
        <div className="glass-card rounded-xl p-6 relative overflow-hidden border border-primary/15">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <div className="relative">
            <h3 className="font-bold text-base mb-5 font-mono tracking-tight flex items-center gap-2 uppercase">
              <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              Workspace Summary
            </h3>
            <div className="grid grid-cols-2 gap-3">

              {/* Completion rate */}
              <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Completion Rate</span>
                </div>
                <p className="text-2xl font-black font-mono text-emerald-500">{data.completionRate}%</p>
                <div className="mt-2 w-full bg-secondary/40 h-1 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                    style={{ width: `${data.completionRate}%` }}
                  />
                </div>
              </div>

              {/* Overdue tasks */}
              <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Overdue Tasks</span>
                </div>
                <p className="text-2xl font-black font-mono text-rose-500">{data.overdueTasksCount}</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">Need attention</p>
              </div>

              {/* Hours logged */}
              <div className="p-4 rounded-xl border border-chart-2/20 bg-chart-2/5 hover:bg-chart-2/10 transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-3.5 h-3.5 text-chart-2" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Hours Logged</span>
                </div>
                <p className="text-2xl font-black font-mono text-chart-2">{data.totalHoursLogged}h</p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">Total tracked time</p>
              </div>

              {/* Total projects */}
              <div className="p-4 rounded-xl border border-chart-4/20 bg-chart-4/5 hover:bg-chart-4/10 transition-all duration-200">
                <div className="flex items-center gap-2 mb-1">
                  <Layers className="w-3.5 h-3.5 text-chart-4" />
                  <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">All Projects</span>
                </div>
                <p className="text-2xl font-black font-mono text-chart-4">
                  {data.projectStatusBreakdown.active +
                    data.projectStatusBreakdown.paused +
                    data.projectStatusBreakdown.completed +
                    data.projectStatusBreakdown.archived}
                </p>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">Across all statuses</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
