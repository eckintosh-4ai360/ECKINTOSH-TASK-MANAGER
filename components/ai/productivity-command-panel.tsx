import {
  AlertTriangle,
  BellRing,
  Brain,
  CalendarClock,
  CheckCircle2,
  Gauge,
  ListChecks,
  Sparkles,
  Timer,
} from "lucide-react"
import type { ProductivityIntelligence } from "@/lib/ai/productivity-engine"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type ProductivityCommandPanelProps = {
  intelligence: ProductivityIntelligence
  compact?: boolean
}

function toneClass(tone: string) {
  switch (tone) {
    case "danger":
      return "border-destructive/25 bg-destructive/10 text-destructive"
    case "warning":
      return "border-amber-400/25 bg-amber-400/10 text-amber-300"
    case "success":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
    default:
      return "border-primary/25 bg-primary/10 text-primary"
  }
}

function riskTone(value: number) {
  if (value >= 75) return "text-destructive"
  if (value >= 45) return "text-amber-300"
  return "text-emerald-300"
}

function scoreBarClass(value: number) {
  if (value >= 75) return "bg-destructive"
  if (value >= 45) return "bg-amber-400"
  return "bg-emerald-400"
}

export function ProductivityCommandPanel({ intelligence, compact = false }: ProductivityCommandPanelProps) {
  const { summary, topPriorities, insights, predictiveReminders, dailyPlan, memory, decisionQueue } = intelligence

  return (
    <div className="glass-card rounded-2xl border border-primary/15 p-4 sm:p-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-primary/80">
            <Brain className="h-4 w-4" />
            AI Productivity Command
          </div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">
            Focus order, risk signals, and assistant memory
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:min-w-[460px]">
          {[
            { label: "Focus", value: summary.focusScore, icon: Gauge, tone: riskTone(100 - summary.focusScore) },
            { label: "Risk", value: summary.workloadRisk, icon: AlertTriangle, tone: riskTone(summary.workloadRisk) },
            { label: "Overdue", value: summary.overdueTasks, icon: BellRing, tone: summary.overdueTasks ? "text-destructive" : "text-emerald-300" },
            { label: "Due Soon", value: summary.dueSoonTasks, icon: Timer, tone: summary.dueSoonTasks ? "text-amber-300" : "text-emerald-300" },
          ].map((metric) => (
            <div key={metric.label} className="rounded-xl border border-border/40 bg-background/35 p-3">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <metric.icon className={cn("h-3.5 w-3.5", metric.tone)} />
                {metric.label}
              </div>
              <p className={cn("mt-1 font-mono text-2xl font-black", metric.tone)}>{metric.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className={cn("mt-5 grid gap-4", compact ? "xl:grid-cols-2" : "xl:grid-cols-[1.2fr_0.8fr]")}>
        <div className="rounded-2xl border border-border/40 bg-background/25 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">AI Focus Rank</h3>
            </div>
            <Badge className="border border-primary/25 bg-primary/10 text-primary">
              {summary.activeTasks} active
            </Badge>
          </div>

          <div className="grid gap-3">
            {topPriorities.slice(0, compact ? 4 : 6).map((task, index) => (
              <div key={task.id} className="rounded-xl border border-border/40 bg-background/35 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 font-mono text-[10px] font-bold text-primary">
                        #{index + 1}
                      </span>
                      <h4 className="truncate text-sm font-semibold text-foreground">{task.title}</h4>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {task.project?.name ?? "No project"} {task.dueDate ? `- due ${task.dueDate.slice(0, 10)}` : "- no due date"}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {task.ai.reasons.join(", ") || "Balanced priority signal"}
                    </p>
                  </div>
                  <div className="min-w-[76px] text-right">
                    <p className="font-mono text-lg font-black text-foreground">{task.ai.score}</p>
                    <p className={cn("font-mono text-[10px] font-bold", riskTone(task.ai.delayRisk))}>
                      {task.ai.delayRisk}% risk
                    </p>
                  </div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary/60">
                  <div className={cn("h-full rounded-full", scoreBarClass(task.ai.score))} style={{ width: `${task.ai.score}%` }} />
                </div>
              </div>
            ))}

            {topPriorities.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/50 p-4 text-sm text-muted-foreground">
                No active tasks yet. Create tasks and the assistant will rank them here.
              </div>
            )}
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-2xl border border-border/40 bg-background/25 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Assistant Insights</h3>
            </div>
            <div className="grid gap-2">
              {insights.slice(0, compact ? 3 : 5).map((insight) => (
                <div key={`${insight.title}-${insight.detail}`} className={cn("rounded-xl border p-3", toneClass(insight.tone))}>
                  <p className="text-sm font-semibold">{insight.title}</p>
                  <p className="mt-1 text-xs leading-relaxed opacity-90">{insight.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/25 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Smart Daily Plan</h3>
            </div>
            <div className="grid gap-2">
              {dailyPlan.slice(0, compact ? 4 : 6).map((block) => (
                <div key={`${block.time}-${block.title}`} className="grid grid-cols-[58px_minmax(0,1fr)] gap-3 rounded-xl border border-border/40 bg-background/35 p-3">
                  <span className="font-mono text-xs font-bold text-primary">{block.time}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{block.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{block.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {!compact && (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-border/40 bg-background/25 p-4">
            <div className="mb-3 flex items-center gap-2">
              <BellRing className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Predictive Reminders</h3>
            </div>
            <div className="grid gap-2">
              {predictiveReminders.slice(0, 3).map((reminder) => (
                <div key={reminder.taskId} className="rounded-xl border border-border/40 bg-background/35 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-semibold text-foreground">{reminder.taskTitle}</p>
                    <span className={cn("font-mono text-xs font-bold", riskTone(reminder.risk))}>{reminder.risk}%</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{reminder.message}</p>
                </div>
              ))}
              {predictiveReminders.length === 0 && (
                <p className="rounded-xl border border-dashed border-border/50 p-3 text-sm text-muted-foreground">
                  No urgent reminders predicted.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/25 p-4">
            <div className="mb-3 flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Memory Layer</h3>
            </div>
            <div className="grid gap-2 text-sm">
              <p><span className="text-muted-foreground">Focus window:</span> <span className="font-semibold text-foreground">{memory.preferredFocusWindow}</span></p>
              <p><span className="text-muted-foreground">Strongest pattern:</span> <span className="font-semibold text-foreground">{memory.strongestProjectPattern}</span></p>
              <p><span className="text-muted-foreground">Workload:</span> <span className="font-semibold capitalize text-foreground">{memory.workloadMode}</span></p>
              <div className="flex flex-wrap gap-2 pt-1">
                {(memory.recurringTaskThemes.length ? memory.recurringTaskThemes : ["learning"]).map((theme) => (
                  <Badge key={theme} variant="secondary" className="glass border-border/40">{theme}</Badge>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border/40 bg-background/25 p-4">
            <div className="mb-3 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-foreground">Decision Queue</h3>
            </div>
            <div className="grid gap-2">
              {decisionQueue.map((decision) => (
                <div key={decision} className="rounded-xl border border-border/40 bg-background/35 p-3 text-sm text-muted-foreground">
                  {decision}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
