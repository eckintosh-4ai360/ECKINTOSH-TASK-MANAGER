"use client"

import { Frown, Meh, Plus, Smile } from "lucide-react"
import { AddStandupModal } from "@/components/modals/add-standup-modal"
import type { StandupItem } from "@/lib/actions/standup-actions"

type ProjectOption = {
  id: string
  name: string
}

const moodMap = {
  5: { icon: Smile, color: "text-emerald-500" },
  4: { icon: Smile, color: "text-primary" },
  3: { icon: Meh, color: "text-amber-500" },
  2: { icon: Frown, color: "text-orange-500" },
  1: { icon: Frown, color: "text-red-500" },
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function isToday(value: string) {
  return new Date(value).toDateString() === new Date().toDateString()
}

export function StandupsView({
  standups,
  projects,
}: {
  standups: StandupItem[]
  projects: ProjectOption[]
}) {
  const todaysStandups = standups.filter((standup) => isToday(standup.createdAt))
  const visibleStandups = todaysStandups.length > 0 ? todaysStandups : standups

  return (
    <div className="space-y-4">
      <AddStandupModal projects={projects}>
        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-primary/30 text-sm text-primary/70 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 font-medium"
        >
          <Plus className="w-4 h-4" />
          Post your standup for today
        </button>
      </AddStandupModal>

      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">
            {todaysStandups.length > 0 ? "Today" : "Recent"} - {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
          <span className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
          <span className="text-[10px] text-muted-foreground">{visibleStandups.length} posted</span>
        </div>

        {visibleStandups.length === 0 && (
          <div className="glass-card rounded-xl border border-dashed border-border/70 p-8 text-center">
            <p className="font-semibold text-foreground">No standups posted yet.</p>
            <p className="text-sm text-muted-foreground mt-1">Post the first update to get the team in sync.</p>
          </div>
        )}

        {visibleStandups.map((standup) => {
          const mood = moodMap[standup.mood as keyof typeof moodMap] ?? moodMap[3]
          const MoodIcon = mood.icon

          return (
            <div key={standup.id} className="glass-card rounded-xl p-5 border border-border/50 hover:border-primary/20 transition-all duration-200">
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-background flex-shrink-0"
                  style={{ backgroundColor: standup.color, boxShadow: `0 0 12px ${standup.color}40` }}
                >
                  {standup.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-0.5">
                    <span className="text-sm font-bold text-foreground">{standup.user}</span>
                    <MoodIcon className={`w-4 h-4 ${mood.color}`} />
                    <span className="text-[10px] text-muted-foreground ml-auto">{formatTime(standup.createdAt)}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-[10px] text-muted-foreground">{standup.role}</p>
                    <span className="text-muted-foreground/30">/</span>
                    <div
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${standup.color}15`, color: standup.color, border: `1px solid ${standup.color}30` }}
                    >
                      {standup.project}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wide w-14 flex-shrink-0 mt-0.5">DONE</span>
                      <p className="text-sm text-foreground/90 leading-relaxed">{standup.didYesterday}</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[10px] font-bold text-primary uppercase tracking-wide w-14 flex-shrink-0 mt-0.5">TODAY</span>
                      <p className="text-sm text-foreground/90 leading-relaxed">{standup.doingToday}</p>
                    </div>
                    {standup.blockers && (
                      <div className="flex gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <span className="text-[10px] font-bold text-red-500 uppercase tracking-wide w-14 flex-shrink-0 mt-0.5">BLOCK</span>
                        <p className="text-sm text-red-500/90 leading-relaxed">{standup.blockers}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
