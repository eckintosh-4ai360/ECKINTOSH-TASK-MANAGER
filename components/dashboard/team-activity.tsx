"use client"

import { useEffect, useState, useRef, useCallback } from "react"
import { Users, GitCommit, Clock, CheckCircle2 } from "lucide-react"
import Link from "next/link"
import { useSearch } from "./search-context"
import type { TeamMemberActivity } from "@/lib/actions/team-actions"

interface TeamActivityProps {
  currentUserId: string
  initialActivities: TeamMemberActivity[]
}

export function TeamActivity({ currentUserId, initialActivities }: TeamActivityProps) {
  const { matches, isSearching } = useSearch()
  const [activities, setActivities] = useState<TeamMemberActivity[]>(initialActivities)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(1000)
  const intentionalCloseRef = useRef(false)

  // Sync state if initialProps change
  useEffect(() => {
    setActivities(initialActivities)
  }, [initialActivities])

  // Establish a real-time WebSocket connection to listen to presence events
  const connectWs = useCallback(() => {
    if (intentionalCloseRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const protocol = window.location.protocol === "https:" ? "wss" : "ws"
    const wsUrl = `${protocol}://${window.location.host}/ws?userId=${currentUserId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      intentionalCloseRef.current = false
      reconnectDelay.current = 1000
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "presence") {
          setActivities((prev) =>
            prev.map((member) =>
              member.id === data.userId ? { ...member, online: data.online } : member
            )
          )
        }
      } catch (err) {
        console.error("Error parsing WebSocket message inside TeamActivity:", err)
      }
    }

    ws.onclose = () => {
      if (intentionalCloseRef.current) return
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000)
        connectWs()
      }, reconnectDelay.current)
    }

    ws.onerror = () => {
      if (intentionalCloseRef.current) return
      ws.close()
    }
  }, [currentUserId])

  useEffect(() => {
    intentionalCloseRef.current = false
    connectWs()
    return () => {
      intentionalCloseRef.current = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      reconnectTimer.current = null
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [connectWs])

  const filtered = activities.filter((m) =>
    matches(m.name, m.role, m.project)
  )

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
            <p className="text-[10px] text-muted-foreground">Today&apos;s contributions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-[10px] text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {filtered.filter((m) => m.online).length} online
          </div>
          <Link href="/team" className="text-xs text-primary hover:text-primary/80 transition-colors ml-2">
            Manage →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filtered.length === 0 && isSearching && (
          <p className="text-xs text-muted-foreground text-center py-6 italic col-span-full">No team members match your search.</p>
        )}
        {filtered.map((member) => (
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
              className="text-[9px] font-bold px-2 py-1 rounded-lg mb-3 truncate text-center"
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
