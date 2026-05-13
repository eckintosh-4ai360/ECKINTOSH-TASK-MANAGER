"use client"

import { Button } from "@/components/ui/button"
import { Video, Clock, Zap, Shield, Download, Terminal } from "lucide-react"
import { useEffect, useState } from "react"

export function Reminders() {
  const [time, setTime] = useState<Date | null>(null)
  const [mounted, setMounted] = useState(false)
  
  useEffect(() => {
    setMounted(true)
    setTime(new Date())
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date | null) => {
    if (!date) return "00:00:00"
    return date.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  const formatDate = (date: Date | null) => {
    if (!date) return ""
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    })
  }

  return (
    <div
      className="glass-card rounded-xl p-5 transition-all duration-500 hover:border-primary/30 animate-slide-in-up"
      style={{ animationDelay: "500ms" }}
    >
      {/* System Time Display */}
      <div className="text-center mb-6">
        <p className="text-[10px] text-muted-foreground uppercase tracking-widest mb-2">System Time</p>
        <p className="text-3xl font-bold font-mono text-primary animate-text-glow tracking-wider">
          {mounted ? formatTime(time) : "00:00:00"}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{mounted ? formatDate(time) : ""}</p>
      </div>

      {/* System Info Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="glass rounded-lg p-3 border border-border/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Uptime</p>
          <p className="text-sm font-mono text-foreground">14d 06:42:18</p>
        </div>
        <div className="glass rounded-lg p-3 border border-border/30">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Time Zone</p>
          <p className="text-sm font-mono text-foreground">UTC-08:00</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <p className="text-[10px] text-primary/80 uppercase tracking-widest mb-3">Quick Actions</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Shield, label: "Security Scan" },
            { icon: Zap, label: "Sync Data" },
            { icon: Download, label: "Backup" },
            { icon: Terminal, label: "Console" },
          ].map((action) => (
            <button
              key={action.label}
              className="glass rounded-lg p-3 border border-border/30 hover:border-primary/30 hover:bg-primary/5 transition-all flex flex-col items-center gap-2 group"
            >
              <action.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
