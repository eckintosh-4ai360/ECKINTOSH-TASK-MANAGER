"use client"

import { Rocket, CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight } from "lucide-react"
import Link from "next/link"

const deployments = [
  {
    id: 1,
    version: "v2.4.1",
    project: "E-Commerce API",
    projectColor: "#00d4ff",
    environment: "production",
    status: "success",
    time: "2h ago",
    duration: "3m 12s",
  },
  {
    id: 2,
    version: "v1.8.0",
    project: "DevFlow Platform",
    projectColor: "#a855f7",
    environment: "staging",
    status: "running",
    time: "45m ago",
    duration: "1m 48s",
  },
  {
    id: 3,
    version: "v2.4.0",
    project: "E-Commerce API",
    projectColor: "#00d4ff",
    environment: "production",
    status: "failed",
    time: "5h ago",
    duration: "0m 22s",
  },
  {
    id: 4,
    version: "v1.2.3",
    project: "Mobile App v2",
    projectColor: "#10b981",
    environment: "staging",
    status: "success",
    time: "1d ago",
    duration: "4m 05s",
  },
]

const statusConfig = {
  success: {
    icon: CheckCircle2,
    label: "Success",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
  },
  running: {
    icon: RefreshCw,
    label: "Running",
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
  },
  pending: {
    icon: Clock,
    label: "Pending",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
  },
}

const envConfig: Record<string, string> = {
  production: "bg-red-500/10 text-red-400 border-red-500/20",
  staging: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  development: "bg-primary/10 text-primary border-primary/20",
}

export function DeploymentFeed() {
  return (
    <div
      className="glass-card rounded-xl p-5 transition-all duration-500 hover:border-primary/30 animate-slide-in-up border border-white/5 h-full"
      style={{ animationDelay: "280ms" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <Rocket className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Deployments</h2>
            <p className="text-[10px] text-muted-foreground">Recent releases</p>
          </div>
        </div>
        <Link
          href="/analytics"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
        >
          All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-2.5">
        {deployments.map((deploy) => {
          const cfg = statusConfig[deploy.status as keyof typeof statusConfig]
          const StatusIcon = cfg.icon
          const isRunning = deploy.status === "running"

          return (
            <div
              key={deploy.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/10 transition-all duration-200 cursor-pointer"
            >
              <div className={`w-7 h-7 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center flex-shrink-0`}>
                <StatusIcon className={`w-3.5 h-3.5 ${cfg.color} ${isRunning ? "animate-spin" : ""}`} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-bold font-mono text-foreground">{deploy.version}</span>
                  <span
                    className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full border ${
                      envConfig[deploy.environment] ?? envConfig.development
                    }`}
                  >
                    {deploy.environment.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: deploy.projectColor }}
                  />
                  <p className="text-[10px] text-muted-foreground truncate">{deploy.project}</p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-muted-foreground">{deploy.time}</p>
                <p className="text-[9px] font-mono text-muted-foreground/60">{deploy.duration}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
