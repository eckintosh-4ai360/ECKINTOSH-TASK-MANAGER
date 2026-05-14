"use client"

import { useState } from "react"
import { Smile, Meh, Frown, Plus, X, Send } from "lucide-react"

const todaysStandups = [
  {
    id: 1,
    user: "Eckintosh",
    initials: "EC",
    color: "#00d4ff",
    role: "Lead Dev / Full Stack",
    project: "DevFlow Platform",
    time: "9:02 AM",
    did: "Finished the sidebar redesign, sprint overview, and deployment feed components. Also upgraded the schema with Sprint, Standup, Deployment, and Repository models.",
    doing: "Building the standup feed widget and sprint board page. Planning to push a staging deploy by EOD.",
    blockers: null,
    mood: 5,
  },
  {
    id: 2,
    user: "Jay",
    initials: "JY",
    color: "#a855f7",
    role: "Backend Engineer",
    project: "E-Commerce API",
    time: "9:15 AM",
    did: "Resolved the 401 auth error on order endpoints. Debugged the JWT middleware issue.",
    doing: "Integrating Paystack webhook. Aiming to finish endpoint + test cases today.",
    blockers: "Still waiting for sandbox credentials from the client side. Escalated.",
    mood: 3,
  },
  {
    id: 3,
    user: "Kemi",
    initials: "KM",
    color: "#10b981",
    role: "Mobile Developer",
    project: "Mobile App v2",
    time: "9:30 AM",
    did: "Set up the Flutter project structure and CI/CD pipeline on GitHub Actions.",
    doing: "Building the authentication flow — login, register, and password reset screens.",
    blockers: null,
    mood: 4,
  },
]

const moodOptions = [
  { value: 5, icon: Smile, label: "Great 🚀", color: "text-emerald-400", border: "border-emerald-500/40", bg: "bg-emerald-500/10" },
  { value: 4, icon: Smile, label: "Good 👍", color: "text-primary", border: "border-primary/40", bg: "bg-primary/10" },
  { value: 3, icon: Meh, label: "Okay 😐", color: "text-amber-400", border: "border-amber-500/40", bg: "bg-amber-500/10" },
  { value: 2, icon: Frown, label: "Meh 😓", color: "text-orange-400", border: "border-orange-500/40", bg: "bg-orange-500/10" },
  { value: 1, icon: Frown, label: "Rough 😤", color: "text-red-400", border: "border-red-500/40", bg: "bg-red-500/10" },
]

const moodMap = {
  5: { icon: Smile, color: "text-emerald-400" },
  4: { icon: Smile, color: "text-primary" },
  3: { icon: Meh, color: "text-amber-400" },
  2: { icon: Frown, color: "text-orange-400" },
  1: { icon: Frown, color: "text-red-400" },
}

export function StandupsView() {
  const [showForm, setShowForm] = useState(false)
  const [mood, setMood] = useState(4)
  const [did, setDid] = useState("")
  const [doing, setDoing] = useState("")
  const [blockers, setBlockers] = useState("")

  return (
    <div className="space-y-4">
      {/* Post standup form */}
      {showForm ? (
        <div className="glass-card rounded-xl p-5 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-foreground">Post Your Standup</h3>
            <button onClick={() => setShowForm(false)} className="w-7 h-7 rounded-lg glass border border-white/10 flex items-center justify-center hover:bg-white/5 transition-colors">
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          </div>

          {/* Mood selector */}
          <div className="mb-4">
            <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest mb-2">How are you feeling?</p>
            <div className="flex gap-2 flex-wrap">
              {moodOptions.map((m) => {
                const Icon = m.icon
                return (
                  <button
                    key={m.value}
                    onClick={() => setMood(m.value)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all duration-200 ${
                      mood === m.value ? `${m.bg} ${m.border} ${m.color}` : "bg-white/5 border-white/10 text-muted-foreground hover:bg-white/10"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-widest block mb-1.5">✅ What did you do yesterday?</label>
              <textarea
                value={did}
                onChange={(e) => setDid(e.target.value)}
                placeholder="Completed the login page, fixed the API error..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-white/[0.07] transition-all resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-primary/80 uppercase tracking-widest block mb-1.5">🚀 What are you doing today?</label>
              <textarea
                value={doing}
                onChange={(e) => setDoing(e.target.value)}
                placeholder="Working on payment integration, writing unit tests..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 focus:bg-white/[0.07] transition-all resize-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-red-400/80 uppercase tracking-widest block mb-1.5">🚧 Any blockers? (optional)</label>
              <textarea
                value={blockers}
                onChange={(e) => setBlockers(e.target.value)}
                placeholder="Waiting for API keys, need design review..."
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-red-500/30 focus:bg-white/[0.07] transition-all resize-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Cancel
            </button>
            <button className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg hover:scale-105 transition-all duration-200 shadow-lg shadow-primary/30">
              <Send className="w-3.5 h-3.5" />
              Post Standup
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-primary/30 text-sm text-primary/70 hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 font-medium"
        >
          <Plus className="w-4 h-4" />
          Post your standup for today
        </button>
      )}

      {/* Today's standups */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <p className="text-[10px] font-bold text-primary/60 uppercase tracking-widest">Today — {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
          <span className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
          <span className="text-[10px] text-muted-foreground">{todaysStandups.length} posted</span>
        </div>

        {todaysStandups.map((standup) => {
          const mood = moodMap[standup.mood as keyof typeof moodMap] ?? moodMap[3]
          const MoodIcon = mood.icon

          return (
            <div key={standup.id} className="glass-card rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all duration-200">
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
                    <span className="text-[10px] text-muted-foreground ml-auto">{standup.time}</span>
                  </div>
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-[10px] text-muted-foreground">{standup.role}</p>
                    <span className="text-muted-foreground/30">·</span>
                    <div
                      className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${standup.color}15`, color: standup.color, border: `1px solid ${standup.color}30` }}
                    >
                      {standup.project}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <span className="text-[10px] font-bold text-emerald-400/80 uppercase tracking-wide w-14 flex-shrink-0 mt-0.5">DONE</span>
                      <p className="text-sm text-foreground/90 leading-relaxed">{standup.did}</p>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-[10px] font-bold text-primary/80 uppercase tracking-wide w-14 flex-shrink-0 mt-0.5">TODAY</span>
                      <p className="text-sm text-foreground/90 leading-relaxed">{standup.doing}</p>
                    </div>
                    {standup.blockers && (
                      <div className="flex gap-3 p-3 rounded-lg bg-red-500/5 border border-red-500/20">
                        <span className="text-[10px] font-bold text-red-400/80 uppercase tracking-wide w-14 flex-shrink-0 mt-0.5">BLOCK</span>
                        <p className="text-sm text-red-300/90 leading-relaxed">{standup.blockers}</p>
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
