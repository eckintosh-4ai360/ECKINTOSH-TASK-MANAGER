"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Sidebar } from "@/components/dashboard/sidebar"
import { cn } from "@/lib/utils"
import type { AppRole } from "@/lib/rbac"
import type { WorkspaceOption } from "@/lib/workspace"

const SIDEBAR_COLLAPSED_KEY = "spagad_sidebar_collapsed"

type DashboardShellProps = {
  children: ReactNode
  role: AppRole
  workspaces: WorkspaceOption[]
  activeWorkspaceId: string
}

export function DashboardShell({ children, role, workspaces, activeWorkspaceId }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true")
  }, [])

  function setSidebarCollapsed(nextCollapsed: boolean) {
    setCollapsed(nextCollapsed)
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(nextCollapsed))
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 hidden transition-[width] duration-200 lg:block",
        collapsed ? "w-20" : "w-64",
      )}>
        <Sidebar
          role={role}
          workspaces={workspaces}
          activeWorkspaceId={activeWorkspaceId}
          collapsed={collapsed}
          onCollapsedChange={setSidebarCollapsed}
        />
      </div>
      <main className={cn("flex-1 p-3 transition-[margin] duration-200 md:p-4 lg:p-6", collapsed ? "lg:ml-20" : "lg:ml-64")}>
        {children}
      </main>
    </div>
  )
}
