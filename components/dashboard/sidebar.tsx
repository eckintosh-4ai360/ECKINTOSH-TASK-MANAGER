"use client"

import { LayoutDashboard, CheckSquare, Calendar, BarChart3, Users, Settings, HelpCircle, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/" },
  { icon: CheckSquare, label: "Tasks", badge: "124", href: "/tasks" },
  { icon: Calendar, label: "Calendar", href: "/calendar" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Users, label: "Team", href: "/team" },
]

const generalItems = [
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help", href: "/help" },
  { icon: LogOut, label: "Logout", href: "/logout" },
]

export function Sidebar() {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const pathname = usePathname()

  return (
    <aside className="fixed top-0 left-0 w-64 glass-card border-r border-border/50 p-4 h-screen overflow-y-auto lg:block">
      <div className="flex items-center gap-3 mb-8 group cursor-pointer">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center transition-all group-hover:scale-110 duration-300 shadow-lg shadow-primary/30 animate-glow-pulse">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary-foreground">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="text-xl font-bold neon-text tracking-wide">TASKO</span>
        </Link>
      </div>

      <div className="space-y-6">
        <div>
          <p className="text-[10px] font-medium text-primary/80 mb-3 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-px bg-gradient-to-r from-primary/50 to-transparent"></span>
            Menu
          </p>
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden",
                    isActive
                      ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border border-primary/30 shadow-lg shadow-primary/10"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:border-border/50 border border-transparent",
                    hoveredItem === item.label && !isActive && "translate-x-1",
                  )}
                >
                  {isActive && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary shadow-lg shadow-primary/50"></span>}
                  <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                  <span className="text-sm">{item.label}</span>
                  {item.badge && (
                    <span className="ml-auto bg-primary/20 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full border border-primary/30">
                      {item.badge}
                    </span>
                  )}
                </Link>
              )
            })}
          </nav>
        </div>

        <div>
          <p className="text-[10px] font-medium text-primary/80 mb-3 uppercase tracking-widest flex items-center gap-2">
            <span className="w-6 h-px bg-gradient-to-r from-primary/50 to-transparent"></span>
            General
          </p>
          <nav className="space-y-1">
            {generalItems.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  onMouseEnter={() => setHoveredItem(item.label)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 relative overflow-hidden",
                    isActive
                      ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border border-primary/30 shadow-lg shadow-primary/10"
                      : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground hover:border-border/50 border border-transparent",
                    hoveredItem === item.label && !isActive && "translate-x-1",
                  )}
                >
                  {isActive && <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary shadow-lg shadow-primary/50"></span>}
                  <item.icon className={cn("w-4 h-4", isActive && "text-primary")} />
                  <span className="text-sm">{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* System Status Panel */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="glass rounded-xl p-4 border border-primary/20">
          <p className="text-[10px] font-medium text-primary/80 mb-3 uppercase tracking-widest">System Status</p>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Tasks Active</span>
              <span className="text-xs font-mono text-primary">12</span>
            </div>
            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className="h-full w-3/4 bg-gradient-to-r from-primary to-primary/60 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
