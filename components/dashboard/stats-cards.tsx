"use client"

import { Cpu, CheckCircle2, Zap, Rocket, GitBranch, Users } from "lucide-react"
import { useState } from "react"
import Link from "next/link"

interface DashboardStats {
  totalProjects: number
  completedProjects: number
  activeProjects: number
  pendingTasks: number
  activeSprints: number
  teamMembers: number
  deployments: number
  commitsToday: number
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
      badge: "ALL TIME",
      subtitle: "Across all teams",
      icon: Cpu,
      color: "primary",
      gradient: "from-primary/20 to-primary/5",
      iconBg: "from-primary to-primary/60",
      borderDefault: "border-primary/20",
      borderHover: "border-primary/50 shadow-primary/20",
      delay: "0ms",
      href: "/projects",
    },
    {
      title: "Active Sprints",
      value: stats.activeSprints.toString(),
      badge: "LIVE",
      subtitle: "In progress now",
      icon: Zap,
      color: "chart-2",
      gradient: "from-chart-2/20 to-chart-2/5",
      iconBg: "from-chart-2 to-chart-2/60",
      borderDefault: "border-chart-2/20",
      borderHover: "border-chart-2/50 shadow-chart-2/20",
      delay: "80ms",
      href: "/sprints",
    },
    {
      title: "Deployments",
      value: stats.deployments.toString(),
      badge: "THIS WEEK",
      subtitle: "Staging & Production",
      icon: Rocket,
      color: "chart-3",
      gradient: "from-chart-3/20 to-chart-3/5",
      iconBg: "from-chart-3 to-chart-3/60",
      borderDefault: "border-chart-3/20",
      borderHover: "border-chart-3/50 shadow-chart-3/20",
      delay: "160ms",
      href: "/analytics",
    },
    {
      title: "Open Tasks",
      value: stats.pendingTasks.toString(),
      badge: "PENDING",
      subtitle: "Awaiting action",
      icon: CheckCircle2,
      color: "chart-4",
      gradient: "from-chart-4/20 to-chart-4/5",
      iconBg: "from-chart-4 to-chart-4/60",
      borderDefault: "border-chart-4/20",
      borderHover: "border-chart-4/50 shadow-chart-4/20",
      delay: "240ms",
      href: "/tasks",
    },
    {
      title: "Team Members",
      value: stats.teamMembers.toString(),
      badge: "ACTIVE",
      subtitle: "Active contributors",
      icon: Users,
      color: "chart-5",
      gradient: "from-chart-5/20 to-chart-5/5",
      iconBg: "from-chart-5 to-chart-5/60",
      borderDefault: "border-chart-5/20",
      borderHover: "border-chart-5/50 shadow-chart-5/20",
      delay: "320ms",
      href: "/team",
    },
    {
      title: "Commits Today",
      value: stats.commitsToday.toString(),
      badge: "TODAY",
      subtitle: "Across all repos",
      icon: GitBranch,
      color: "primary",
      gradient: "from-primary/10 to-transparent",
      iconBg: "from-primary/80 to-primary/40",
      borderDefault: "border-primary/20",
      borderHover: "border-primary/50 shadow-primary/20",
      delay: "400ms",
      href: "/commits",
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((stat, index) => (
        <Link
          key={stat.title}
          href={stat.href}
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
            <div className="flex items-center justify-between mb-3">
              <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${stat.iconBg} flex items-center justify-center shadow-lg`}>
                <stat.icon className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="text-[8px] font-bold font-mono px-1.5 py-0.5 rounded-full bg-white/5 text-muted-foreground border border-white/10">
                {stat.badge}
              </span>
            </div>

            <p className="text-2xl font-extrabold font-mono text-foreground tracking-tight mb-0.5">
              {stat.value}
            </p>
            <p className="text-[11px] font-semibold text-foreground mb-0.5">{stat.title}</p>
            <p className="text-[10px] text-muted-foreground">{stat.subtitle}</p>
          </div>
        </Link>
      ))}
    </div>
  )
}
