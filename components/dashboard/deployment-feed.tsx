"use client"

import { Rocket, CheckCircle2, XCircle, Clock, RefreshCw, ChevronRight, Plus } from "lucide-react"
import Link from "next/link"
import { useSearch } from "./search-context"
import { LogDeploymentModal } from "@/components/modals/log-deployment-modal"

import { formatDistanceToNow } from "date-fns"

export type DeploymentItem = {
  id: string
  version: string
  environment: string
  status: string
  deployedAt: Date
  duration: number | null
  project: {
    name: string
    color: string
  }
}

interface DeploymentFeedProps {
  deployments: DeploymentItem[]
  /** Admins can log a deployment that wasn't picked up from a GitHub push. */
  canLog?: boolean
  projects?: Array<{ id: string; name: string }>
}


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

export function DeploymentFeed({ deployments, canLog = false, projects = [] }: DeploymentFeedProps) {
  const { matches, isSearching } = useSearch()

  const filtered = deployments.filter((d) =>
    matches(d.project.name, d.version, d.environment, d.status)
  )

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
        <div className="flex items-center gap-2 shrink-0">
          {canLog && (
            <LogDeploymentModal projects={projects}>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                title="Log a deployment"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </LogDeploymentModal>
          )}
          <Link
            href="/analytics"
            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            All <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="space-y-2.5">
        {filtered.length === 0 && isSearching && (
          <p className="text-xs text-muted-foreground text-center py-6 italic">No deployments match your search.</p>
        )}
        {deployments.length === 0 && !isSearching && (
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground italic">No deployments recorded yet.</p>
            <p className="text-[10px] text-muted-foreground/70 mt-1">
              These appear automatically when your tracked GitHub repo receives a push to production, staging, or
              develop.
            </p>
          </div>
        )}
        {filtered.map((deploy) => {
          const cfg = statusConfig[deploy.status as keyof typeof statusConfig] || statusConfig.pending
          const StatusIcon = cfg.icon
          const isRunning = deploy.status === "running"
          
          const timeAgo = formatDistanceToNow(new Date(deploy.deployedAt), { addSuffix: true })
          const durationStr = deploy.duration ? `${Math.floor(deploy.duration / 60)}m ${deploy.duration % 60}s` : "0m 0s"

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
                    style={{ backgroundColor: deploy.project.color }}
                  />
                  <p className="text-[10px] text-muted-foreground truncate">{deploy.project.name}</p>
                </div>
              </div>

              <div className="text-right flex-shrink-0">
                <p className="text-[10px] text-muted-foreground">{timeAgo}</p>
                <p className="text-[9px] font-mono text-muted-foreground/60">{durationStr}</p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
