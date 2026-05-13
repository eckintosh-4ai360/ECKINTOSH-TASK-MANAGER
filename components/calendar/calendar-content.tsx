"use client"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Video, Clock, MapPin } from "lucide-react"
import { useState } from "react"

const events = [
  { id: 1, title: "Team Standup", time: "09:00 AM", duration: "30 min", type: "meeting", color: "from-blue-500/20 to-blue-500/5 border-blue-500/30" },
  { id: 2, title: "Design Review", time: "11:00 AM", duration: "1 hour", type: "review", color: "from-purple-500/20 to-purple-500/5 border-purple-500/30" },
  { id: 3, title: "Client Presentation", time: "02:00 PM", duration: "2 hours", type: "presentation", color: "from-green-500/20 to-green-500/5 border-green-500/30" },
  { id: 4, title: "Code Review Session", time: "04:30 PM", duration: "45 min", type: "meeting", color: "from-amber-500/20 to-amber-500/5 border-amber-500/30" },
]

const daysInMonth = Array.from({ length: 30 }, (_, i) => i + 1)
const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

export function CalendarContent() {
  const [currentDate] = useState(new Date())
  const today = 13

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold min-w-[140px] text-center text-foreground font-mono">May 2026</span>
          <Button variant="outline" size="icon" className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-primary/60 py-2 font-mono tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((day) => (
              <button
                key={day}
                className={`
                  aspect-square rounded-lg flex items-center justify-center text-sm font-medium font-mono
                  transition-all duration-300 hover:scale-110
                  ${
                    day === today
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 border border-primary/50"
                      : "glass hover:bg-primary/10 hover:border-primary/30 text-foreground border border-transparent"
                  }
                  ${day < today ? "opacity-40" : ""}
                `}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-lg text-foreground">Today&apos;s Schedule</h3>
          </div>
          <div className="space-y-3">
            {events.map((event, index) => (
              <div
                key={event.id}
                className={`p-3 rounded-lg bg-gradient-to-r ${event.color} border hover:shadow-md transition-all duration-300 cursor-pointer animate-slide-in hover:scale-[1.02]`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-1.5">
                    <h4 className="font-medium text-sm text-foreground">{event.title}</h4>
                    <p className="text-xs text-muted-foreground font-mono">{event.time}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px] glass border-border/30 font-mono">
                        {event.duration}
                      </Badge>
                      {event.type === "meeting" && (
                        <span className="flex items-center gap-1 text-[10px] text-primary">
                          <Video className="w-3 h-3" />
                          VIDEO
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
