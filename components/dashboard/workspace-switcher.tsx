"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import Link from "next/link"
import { Loader2, Settings2 } from "lucide-react"
import { switchWorkspaceAction } from "@/lib/actions/workspace-actions"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { WorkspaceOption } from "@/lib/workspace"

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId,
}: {
  workspaces: WorkspaceOption[]
  activeWorkspaceId?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const active = workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0]

  if (!active) return null

  return (
    <div className="relative mt-3">
      <label className="sr-only" htmlFor="workspace-switcher">Current workspace</label>
      <Select
        value={active.id}
        disabled={pending}
        onValueChange={(workspaceId) => {
          startTransition(async () => {
            const result = await switchWorkspaceAction(workspaceId)
            if (result.success) router.refresh()
          })
        }}
      >
        <SelectTrigger
          id="workspace-switcher"
          className={cn(
            "glass w-full h-9 border-border/50 text-xs font-semibold focus:border-primary/50",
            pending && "opacity-70",
          )}
        >
          <SelectValue />
          {pending && <Loader2 className="size-3.5 animate-spin text-primary" />}
        </SelectTrigger>
        <SelectContent className="glass-card border-primary/20">
          {workspaces.map((workspace) => (
            <SelectItem key={workspace.id} value={workspace.id}>
              {workspace.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Link
        href="/workspaces"
        className="mt-2 flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-medium text-muted-foreground transition hover:bg-primary/10 hover:text-primary"
      >
        <span>Manage workspaces</span>
        <Settings2 className="h-3.5 w-3.5" />
      </Link>
    </div>
  )
}
