"use client"

import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  BarChart3,
  Users,
  User,
  Settings,
  HelpCircle,
  LogOut,
  ShieldCheck,
  Layers,
  MessageSquare,
  Mail,
  NotebookPen,
  Zap,
  GitBranch,
  ClipboardList,
  ScrollText,
  Bot,
  PenLine,
  Building2,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { hasPermission, type AppRole } from "@/lib/rbac"
import { WorkspaceSwitcher } from "@/components/dashboard/workspace-switcher"
import type { WorkspaceOption } from "@/lib/workspace"

type NavItem = {
  icon: typeof LayoutDashboard
  label: string
  href: string
  badge?: string | null
}

const workspaceItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Overview", href: "/", badge: null },
  { icon: Layers, label: "Projects", href: "/projects", badge: null },
  { icon: GitBranch, label: "Code Ops", href: "/commits", badge: "Live" },
  { icon: Zap, label: "Sprints", href: "/sprints", badge: "New" },
  { icon: CheckSquare, label: "Tasks", href: "/tasks", badge: null },
  { icon: NotebookPen, label: "Jot it", href: "/jot-it", badge: null },
  { icon: PenLine, label: "Whiteboard", href: "/whiteboard", badge: "New" },
  { icon: Bot, label: "AI Assistant", href: "/ai-assistant", badge: "AI" },
  { icon: BarChart3, label: "Analytics", href: "/analytics", badge: null },
]

const teamItems: NavItem[] = [
  { icon: Users, label: "Team", href: "/team", badge: null },
  { icon: ClipboardList, label: "Standups", href: "/standups", badge: "New" },
  { icon: Calendar, label: "Calendar", href: "/calendar", badge: null },
]

const commsItems: NavItem[] = [
  { icon: MessageSquare, label: "Messages", href: "/messages", badge: null },
  { icon: Mail, label: "Emails", href: "/emails", badge: null },
]

const systemItems: NavItem[] = [
  { icon: Building2, label: "Workspaces", href: "/workspaces" },
  { icon: ShieldCheck, label: "Admin", href: "/admin/users" },
  { icon: ScrollText, label: "Audit Log", href: "/admin/audit-logs" },
  { icon: User, label: "Profile", href: "/profile" },
  { icon: Settings, label: "Settings", href: "/settings" },
  { icon: HelpCircle, label: "Help", href: "/help" },
  { icon: LogOut, label: "Sign Out", href: "/logout" },
]




function NavSection({ title, items, collapsed = false }: { title: string; items: NavItem[]; collapsed?: boolean }) {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)

  if (items.length === 0) return null

  return (
    <div>
      {collapsed ? (
        <div className="mx-2 mb-2 h-px bg-primary/15" />
      ) : (
        <p className="text-[9px] font-bold text-primary/60 mb-2 uppercase tracking-[0.15em] flex items-center gap-2 px-1">
          <span className="w-4 h-px bg-gradient-to-r from-primary/40 to-transparent" />
          {title}
        </p>
      )}
      <nav className="space-y-0.5">
        {items.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.href}
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
              title={collapsed ? item.label : undefined}
              aria-label={collapsed ? item.label : undefined}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative overflow-hidden group",
                collapsed && "justify-center px-2",
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
              <span className={cn("flex-1 text-sm", collapsed && "sr-only")}>{item.label}</span>
              {"badge" in item && item.badge && (
                <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30", collapsed && "hidden")}>
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

export function Sidebar({
  role,
  workspaces = [],
  activeWorkspaceId,
  collapsed = false,
  onCollapsedChange,
}: {
  role: AppRole
  workspaces?: WorkspaceOption[]
  activeWorkspaceId?: string
  collapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}) {
  const pathname = usePathname()

  const visibleWorkspaceItems = workspaceItems.filter((item) => {
    if (item.href === "/commits") return hasPermission(role, "use_repository_workspace")
    if (item.href === "/jot-it") return hasPermission(role, "manage_own_notes")
    if (item.href === "/ai-assistant") return hasPermission(role, "manage_own_notes")
    if (item.href === "/whiteboard") return hasPermission(role, "manage_own_notes")
    if (item.href === "/analytics") return hasPermission(role, "view_analytics")
    return true
  })

  const visibleCommsItems = commsItems.filter((item) => {
    if (item.href === "/messages") return hasPermission(role, "use_messages")
    if (item.href === "/emails") return hasPermission(role, "use_email")
    return true
  })

  const visibleSystemItems = systemItems.filter((item) => {
    if (item.href === "/workspaces") return role !== "GUEST"
    if (item.href === "/admin/users" || item.href === "/admin/audit-logs") return hasPermission(role, "manage_users")
    return true
  })

  // Fills its container rather than pinning itself to the viewport: on desktop
  // the layout supplies the fixed rail, on mobile it is the drawer's content.
  // `bg-sidebar` is opaque on purpose — a translucent nav drawer lets the page
  // show through, and backdrop-filter is unreliable on mobile Safari.
  return (
    <aside className="flex h-full w-full flex-col overflow-x-hidden overflow-y-auto bg-sidebar border-r border-primary/10">
      {/* ── Logo & Brand ─────────────────────────────────── */}
      <div className={cn("relative px-4 pt-5 pb-4 border-b border-white/5", collapsed && "px-3")}>
        <Link href="/" className={cn("flex items-center gap-3 group", collapsed && "justify-center")}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform duration-300 animate-glow-pulse flex-shrink-0">
            <GitBranch className="w-4 h-4 text-primary-foreground" />
          </div>
          <div className={cn(collapsed && "hidden")}>
            <span className="text-base font-extrabold neon-text tracking-wider">Spagad</span>
            <p className="text-[9px] text-muted-foreground leading-none mt-0.5">SRAD – Rapid Application Development</p>
          </div>
        </Link>

        {/* Workspace chip */}
        {onCollapsedChange && (
          <button
            type="button"
            onClick={() => onCollapsedChange(!collapsed)}
            className={cn(
              "absolute right-3 top-5 flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              collapsed && "right-[-12px] top-12 z-50 border border-primary/20 bg-sidebar shadow-lg",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        )}
        {!collapsed && <WorkspaceSwitcher workspaces={workspaces} activeWorkspaceId={activeWorkspaceId} />}
      </div>

      {/* ── Navigation ───────────────────────────────────── */}
      <div className={cn("flex-1 py-4 space-y-5 overflow-y-auto", collapsed ? "px-2" : "px-3")}>
        <NavSection title="Workspace" items={visibleWorkspaceItems} collapsed={collapsed} />
        <NavSection title="Team" items={teamItems} collapsed={collapsed} />
        <NavSection title="Communication" items={visibleCommsItems} collapsed={collapsed} />



        {/* ── System ──────────────────────────────────── */}
        <div>
          {collapsed ? (
            <div className="mx-2 mb-2 h-px bg-primary/15" />
          ) : (
            <p className="text-[9px] font-bold text-primary/60 mb-2 uppercase tracking-[0.15em] flex items-center gap-2 px-1">
              <span className="w-4 h-px bg-gradient-to-r from-primary/40 to-transparent" />
              System
            </p>
          )}
          <nav className="space-y-0.5">
            {visibleSystemItems.map((item) => {
              const isActive = pathname === item.href
              const isDanger = item.label === "Sign Out"
              if (isDanger) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    aria-label={collapsed ? item.label : undefined}
                    className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent text-muted-foreground hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20", collapsed && "justify-center px-2")}
                  >
                    <item.icon className="w-4 h-4 flex-shrink-0" />
                    <span className={cn("text-sm", collapsed && "sr-only")}>{item.label}</span>
                  </a>
                )
              }

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  aria-label={collapsed ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border border-transparent",
                    collapsed && "justify-center px-2",
                    isActive
                      ? "bg-gradient-to-r from-primary/20 to-primary/5 text-primary border-primary/30"
                      : isDanger
                      ? "text-muted-foreground hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/20"
                      : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className={cn("text-sm", collapsed && "sr-only")}>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>


    </aside>
  )
}
