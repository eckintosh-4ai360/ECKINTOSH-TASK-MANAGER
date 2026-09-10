"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { createWorkspaceAction, switchWorkspaceAction } from "@/lib/actions/workspace-actions"
import type { WorkspaceOption } from "@/lib/workspace"

export function WorkspaceHome({ workspaces }: { workspaces: WorkspaceOption[] }) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function createWorkspace() {
    setError(null)
    startTransition(async () => {
      const result = await createWorkspaceAction({ name, description })
      if (!result.success) {
        setError(result.error ?? "Unable to create workspace.")
        return
      }
      router.push("/")
      router.refresh()
    })
  }

  return (
    <main className="min-h-dvh bg-background px-6 py-12 text-foreground">
      <div className="mx-auto max-w-3xl space-y-8">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Spagad workspaces</p>
          <h1 className="mt-3 text-3xl font-bold">Choose your working unit</h1>
          <p className="mt-2 text-muted-foreground">Each workspace keeps projects, communication, membership, and notifications separated.</p>
        </div>

        {workspaces.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {workspaces.map((workspace) => (
              <button
                key={workspace.id}
                type="button"
                className="rounded-xl border border-primary/20 bg-card p-4 text-left transition hover:border-primary/60"
                onClick={() => startTransition(async () => {
                  const result = await switchWorkspaceAction(workspace.id)
                  if (result.success) {
                    router.push("/")
                    router.refresh()
                  } else setError(result.error ?? "Unable to switch workspace.")
                })}
              >
                <p className="font-semibold">{workspace.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{workspace.role.toLowerCase()}</p>
              </button>
            ))}
          </div>
        )}

        <section className="max-w-xl rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Create a workspace</h2>
          <div className="mt-4 space-y-3">
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Division or team name" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional description" className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm" />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button type="button" onClick={createWorkspace} disabled={pending || !name.trim()} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
              {pending ? "Creating…" : "Create workspace"}
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
