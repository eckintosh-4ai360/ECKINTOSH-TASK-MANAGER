"use client"

import { Button } from "@/components/ui/button"
import { Pause, Play, Square, Timer } from "lucide-react"
import { useState, useEffect } from "react"

export function TimeTracker() {
  const [seconds, setSeconds] = useState(24 * 3600 + 8)
  const [isRunning, setIsRunning] = useState(true)

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((s) => s + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRunning])

  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  const formatTime = (num: number) => String(num).padStart(2, "0")

  return (
    <div
      className="glass-card rounded-xl p-5 transition-all duration-500 hover:border-primary/30 animate-slide-in-up relative overflow-hidden"
      style={{ animationDelay: "1000ms" }}
    >
      {/* Animated background lines */}
      <div className="absolute inset-0 overflow-hidden opacity-20">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute h-px bg-gradient-to-r from-transparent via-primary to-transparent"
            style={{
              top: `${20 + i * 20}%`,
              left: 0,
              right: 0,
              animation: `shimmer ${2 + i * 0.5}s ease-in-out infinite`,
              animationDelay: `${i * 0.3}s`
            }}
          />
        ))}
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Session Timer</h2>
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
            isRunning 
              ? "bg-primary/20 text-primary border border-primary/30" 
              : "bg-muted text-muted-foreground border border-border"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-primary animate-pulse" : "bg-muted-foreground"}`}></span>
            {isRunning ? "ACTIVE" : "PAUSED"}
          </div>
        </div>

        {/* Time Display */}
        <div className="text-center mb-5">
          <div className="text-5xl font-mono font-bold tracking-wider text-primary animate-text-glow">
            {formatTime(hours)}:{formatTime(minutes)}:{formatTime(secs)}
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-mono">Current Session Duration</p>
        </div>

        {/* Control Buttons */}
        <div className="flex justify-center gap-3">
          <Button
            onClick={() => setIsRunning(!isRunning)}
            size="icon"
            className="w-12 h-12 rounded-xl glass border border-primary/30 hover:border-primary/50 hover:bg-primary/10 transition-all duration-300 hover:scale-105 text-foreground"
          >
            {isRunning ? <Pause className="w-5 h-5 text-primary" /> : <Play className="w-5 h-5 text-primary" />}
          </Button>
          <Button
            onClick={() => {
              setSeconds(0)
              setIsRunning(false)
            }}
            size="icon"
            className="w-12 h-12 rounded-xl glass border border-destructive/30 hover:border-destructive/50 hover:bg-destructive/10 transition-all duration-300 hover:scale-105 text-foreground"
          >
            <Square className="w-5 h-5 text-destructive" />
          </Button>
        </div>
      </div>
    </div>
  )
}
