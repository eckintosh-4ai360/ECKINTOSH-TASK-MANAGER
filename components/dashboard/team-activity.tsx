"use client"

import { Users, GitCommit, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"

const teamMembers = [
  {
    id: 1,
    name: "Eckintosh",
    initials: "EC",
    role: "Lead Dev / Full Stack",
    color: "#00d4ff",
    online: true,
    tasksToday: 4,
    commits: 7,
    hoursLogged: 3.5,
    project: "DevFlow Platform",
  },
  {
    id: 2,
    name: "Jay",
    initials: "JY",
    role: "Backend Engineer",
    color: "#a855f7",
    online: true,
    tasksToday: 3,
    commits: 5,
    hoursLogged: 4.0,
    project: "E-Commerce API",
  },
  {
    id: 3,
    name: "Kemi",
    initials: "KM",
    role: "Mobile Developer",
    color: "#10b981",
    online: false,
    tasksToday: 2,
    commits: 3,
    hoursLogged: 2.0,
    project: "Mobile App v2",
  },
  {
    id: 4,
    name: "Tunde",
    initials: "TU",
    role: "Frontend Engineer",
    color: "#f59e0b",
    online: true,
    tasksToday: 5,
    commits: 9,
    hoursLogged: 5.5,
    project: "E-Commerce API",
  },
]

export function TeamActivity() {
  return (
    <div
      className="glass-card rounded-xl p-5 transition-all duration-500 hover:border-primary/30 animate-slide-in-up border border-white/5"
      style={{ animationDelay: "520ms" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <Users className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Team Activity</h2>
            <p className="text-[10px] text-muted-foreground">Today's contributions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {teamMembers.filter((m) => m.online).length} online
          </div>
          <Link href="/team" className="text-xs text-primary hover:text-primary/80 transition-colors ml-2">
            Manage →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="rounded-xl p-4 border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/15 transition-all duration-200 cursor-pointer group"
          >
            {/* Avatar + name */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-shrink-0">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-background"
                  style={{ backgroundColor: member.color, boxShadow: `0 0 12px ${member.color}40` }}
                >
                  {member.initials}
                </div>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                    member.online ? "bg-emerald-400" : "bg-muted-foreground/40"
                  }`}
                />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-foreground truncate">{member.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{member.role}</p>
              </div>
            </div>

            {/* Project tag */}
            <div
              className="text-[9px] font-bold px-2 py-1 rounded-lg mb-3 truncate"
              style={{ backgroundColor: `${member.color}15`, color: member.color, border: `1px solid ${member.color}30` }}
            >
              {member.project}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-1 text-center">
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">{member.tasksToday}</p>
                <p className="text-[8px] text-muted-foreground">tasks</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <GitCommit className="w-3 h-3 text-primary mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">{member.commits}</p>
                <p className="text-[8px] text-muted-foreground">commits</p>
              </div>
              <div className="p-1.5 rounded-lg bg-white/[0.03]">
                <Clock className="w-3 h-3 text-chart-4 mx-auto mb-1" />
                <p className="text-xs font-bold text-foreground">{member.hoursLogged}h</p>
                <p className="text-[8px] text-muted-foreground">logged</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
