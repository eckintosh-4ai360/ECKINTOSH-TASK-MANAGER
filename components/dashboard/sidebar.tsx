"use client"

import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  BarChart3,
  Users,
  Settings,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Layers,
  MessageSquare,
  Mail,
  Zap,
  GitBranch,
  Rocket,
  ClipboardList,
  ChevronRight,
  Circle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const workspaceItems = [
  { icon: LayoutDashboard, label: "Overview", href: "/", badge: null },
  { icon: Layers, label: "Projects", href: "/projects", badge: null },
  { icon: Zap, label: "Sprints", href: "/sprints", badge: "New" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks", badge: null },
  { icon: BarChart3, label: "Analytics", href: "/analytics", badge: null },
]

const teamItems = [
  { icon: Users, label: "Team", href: "/team", badge: null },
  { icon: ClipboardList, label: "Standups", href: "/standups", badge: "New" },
  { icon: Calendar, label: "Calendar", href: "/calendar", badge: null },
]

const commsItems = [
  { icon: MessageSquare, label: "Messages", href: "/messages", badge: null },
  { icon: Mail, label: "Emails", href: "/emails", badge: null },
]

const systemItems = [
  { icon: ShieldCheck, label: "Admin", href: "/admin/users" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help", href: "/help" },
  { icon: LogOut, label: "Sign Out", href: "/logout" },
]

// Sample recent projects for sidebar quick-access
const recentProjects = [
  { name: "E-Commerce API", color: "#00d4ff", status: "active" },
  { name: "DevFlow Platform", color: "#a855f7", status: "active" },
  { name: "Mobile App v2", color: "#10b981", status: "paused" },
]

function NavSection({ title, items }: { title: string; items: typeof workspaceItems }) {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <div>
      <p className="text-[9px] font-bold text-primary/60 mb-2 uppercase tracking-[0.15em] flex items-center gap-2 px-1">
        <span className="w-4 h-px bg-gradient-to-r from-primary/40 to-transparent" />
        {title}
      </p>
      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative overflow-hidden group",
                isActive
                  ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border border-primary/30 shadow-lg shadow-primary/10"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground border border-transparent",
                hovered === item.label && !isActive && "translate-x-0.5"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-full shadow-lg shadow-primary/50" />
              )}
              <item.icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1 text-sm">{item.label}</span>
              {"badge" in item && item.badge && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                  {item.badge}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 w-64 h-screen overflow-y-auto flex flex-col glass-card border-r border-primary/10 lg:block">
      {/* ── Logo & Brand ─────────────────────────────────── */}
      <div className="px-4 pt-5 pb-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-300 animate-glow-pulse flex-shrink-0">
            <GitBranch className="w-4 h-4 text-primary-foreground" />
          </div>
          <div>
            <span className="text-base font-extrabold neon-text tracking-wider">Eckintosh</span>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5">Engineering Digital Solutions</p>
          </div>
        </Link>

        {/* Workspace chip */}
        <button className="mt-3 w-full flex items-center justify-between px-3 py-2 rounded-lg glass border border-primary/20 hover:border-primary/40 transition-all duration-200 group">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
              <span className="text-[8px] font-bold text-primary">EC</span>
            </div>
            <span className="text-xs font-semibold text-foreground">Eckintosh Workspace</span>
          </div>
          <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-primary transition-colors" />
        </button>
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto">
        <NavSection title="Workspace" items={workspaceItems} />
        <NavSection title="Team" items={teamItems} />
        <NavSection title="Communication" items={commsItems} />

        {/* ── Recent Projects ──────────────────────────── */}
        <div>
          <p className="text-[9px] font-bold text-primary/60 mb-2 uppercase tracking-[0.15em] flex items-center gap-2 px-1">
            <span className="w-4 h-px bg-gradient-to-r from-primary/40 to-transparent" />
            Recent Projects
          </p>
          <nav className="space-y-0.5">
            {recentProjects.map((proj) => (
              <Link
                key={proj.name}
                href="/projects"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/5 border border-transparent transition-all duration-200 group"
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: proj.color, boxShadow: `0 0 6px ${proj.color}60` }}
                />
                <span className="flex-1 text-xs truncate">{proj.name}</span>
                <Circle
                  className={cn(
                    "w-1.5 h-1.5 fill-current flex-shrink-0",
                    proj.status === "active" ? "text-emerald-400" : "text-amber-400"
                  )}
                />
              </Link>
            ))}
            <Link
              href="/projects"
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-xs text-primary/60 hover:text-primary transition-colors"
            >
              + View all projects
            </Link>
          </nav>
        </div>

        {/* ── System ──────────────────────────────────── */}
        <div>
          <p className="text-[9px] font-bold text-primary/60 mb-2 uppercase tracking-[0.15em] flex items-center gap-2 px-1">
            <span className="w-4 h-px bg-gradient-to-r from-primary/40 to-transparent" />
            System
          </p>
          <nav className="space-y-0.5">
            {systemItems.map((item) => {
              const isActive = pathname === item.href
              const isDanger = item.label === "Sign Out"
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent",
                    isActive
                      ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border-primary/30"
                      : isDanger
                      ? "text-muted-foreground hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* ── Live Status Footer ─────────────────────────── */}
      <div className="px-3 pb-4 border-t border-white/5 pt-3">
        <div className="glass rounded-xl p-3 border border-primary/15">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest">Sprint Status</p>
            <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              LIVE
            </span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Active Sprint</span>
              <span className="text-[10px] font-mono text-primary">Sprint 7</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full w-[68%] bg-gradient-to-r from-primary to-primary/60 rounded-full" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Tasks Done</span>
              <span className="text-[10px] font-mono text-foreground">17 / 25</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-white/5 flex items-center gap-1.5">
            <Rocket className="w-3 h-3 text-primary" />
            <span className="text-[9px] text-muted-foreground">Last deploy: <span className="text-primary">2h ago</span></span>
          </div>
        </div>
      </div>
    </aside>
  )
}
