"use client"

import { ClipboardList, Plus, ChevronRight, Smile, Meh, Frown } from "lucide-react"
import Link from "next/link"
import { useSearch } from "./search-context"

const standups = [
  {
    id: 1,
    user: "Eckintosh",
    initials: "EC",
    color: "#00d4ff",
    project: "DevFlow Platform",
    time: "9:02 AM",
    did: "Finished the sidebar redesign and sprint overview component",
    doing: "Working on deployment feed and standup page",
    blockers: null,
    mood: 5,
  },
  {
    id: 2,
    user: "Jay",
    initials: "JY",
    color: "#a855f7",
    project: "E-Commerce API",
    time: "9:15 AM",
    did: "Resolved the 401 auth error on order endpoints",
    doing: "Integrating payment webhook from Paystack",
    blockers: "Waiting for sandbox credentials from the client",
    mood: 3,
  },
  {
    id: 3,
    user: "Kemi",
    initials: "KM",
    color: "#10b981",
    project: "Mobile App v2",
    time: "9:30 AM",
    did: "Set up Flutter project structure and CI/CD pipeline",
    doing: "Building the authentication flow screens",
    blockers: null,
    mood: 4,
  },
]

const moodMap = {
  5: { icon: Smile, color: "text-emerald-400" },
  4: { icon: Smile, color: "text-primary" },
  3: { icon: Meh, color: "text-amber-400" },
  2: { icon: Frown, color: "text-orange-400" },
  1: { icon: Frown, color: "text-red-400" },
}

export function StandupFeed() {
  const { matches, isSearching } = useSearch()

  const filtered = standups.filter((s) =>
    matches(s.user, s.project, s.did, s.doing, s.blockers)
  )

  return (
    <div
      className="glass-card rounded-xl p-5 transition-all duration-500 hover:border-primary/30 animate-slide-in-up border border-white/5 h-full"
      style={{ animationDelay: "360ms" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <ClipboardList className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Today's Standups</h2>
            <p className="text-[10px] text-muted-foreground">{standups.length} posted today</p>
          </div>
        </div>
        <Link href="/standups" className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors">
          All <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 && isSearching && (
          <p className="text-xs text-muted-foreground text-center py-6 italic">No standups match your search.</p>
        )}
        {filtered.map((standup) => {
          const mood = moodMap[standup.mood as keyof typeof moodMap] ?? moodMap[3]
          const MoodIcon = mood.icon
          return (
            <div key={standup.id} className="rounded-xl p-3.5 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-200 cursor-pointer">
              <div className="flex items-center gap-2.5 mb-2.5">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-background flex-shrink-0"
                  style={{ backgroundColor: standup.color, boxShadow: `0 0 8px ${standup.color}40` }}
                >
                  {standup.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-foreground">{standup.user}</span>
                    <MoodIcon className={`w-3 h-3 ${mood.color}`} />
                  </div>
                  <p className="text-[9px] text-muted-foreground truncate">{standup.project}</p>
                </div>
                <span className="text-[9px] text-muted-foreground flex-shrink-0">{standup.time}</span>
              </div>
              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <span className="text-[9px] font-bold text-emerald-400/80 uppercase flex-shrink-0 w-12">DONE</span>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{standup.did}</p>
                </div>
                <div className="flex gap-2">
                  <span className="text-[9px] font-bold text-primary/80 uppercase flex-shrink-0 w-12">TODAY</span>
                  <p className="text-[10px] text-muted-foreground line-clamp-1">{standup.doing}</p>
                </div>
                {standup.blockers && (
                  <div className="flex gap-2">
                    <span className="text-[9px] font-bold text-red-400/80 uppercase flex-shrink-0 w-12">BLOCK</span>
                    <p className="text-[10px] text-red-300/80 line-clamp-1">{standup.blockers}</p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
        <Link href="/standups" className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-primary/20 text-xs text-primary/60 hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200">
          <Plus className="w-3.5 h-3.5" />
          Post your standup
        </Link>
      </div>
    </div>
  )
}
