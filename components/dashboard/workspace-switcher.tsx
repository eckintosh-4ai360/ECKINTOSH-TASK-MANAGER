"use client"

import { useRouter } from "next/navigation"
import { useTransition } from "react"
import { ChevronsUpDown, Loader2 } from "lucide-react"
import { switchWorkspaceAction } from "@/lib/actions/workspace-actions"
import { cn } from "@/lib/utils"
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
      <select
        id="workspace-switcher"
        value={active.id}
        disabled={pending}
        onChange={(event) => {
          const workspaceId = event.target.value
          startTransition(async () => {
            const result = await switchWorkspaceAction(workspaceId)
            if (result.success) router.refresh()
          })
        }}
        className={cn(
          "w-full appearance-none rounded-lg border border-primary/20 bg-background/50 px-3 py-2 pr-8 text-left text-xs font-semibold text-foreground outline-none transition hover:border-primary/40 focus:border-primary",
          pending && "opacity-70",
        )}
      >
        {workspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
      {pending ? (
        <Loader2 className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 animate-spin text-primary" />
      ) : (
        <ChevronsUpDown className="pointer-events-none absolute right-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
      )}
    </div>
  )
}
