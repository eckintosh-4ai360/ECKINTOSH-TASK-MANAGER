import { redirect } from "next/navigation"
import { ClipboardList } from "lucide-react"
import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { getWorkspaceAuditLogsAction } from "@/lib/actions/security-actions"
import { requireWorkspace } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export default async function AuditLogsPage() {
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "manage_users")) redirect("/")
  const logs = await getWorkspaceAuditLogsAction()

  return <>
    <Header title="Audit log" description="Security, authentication, and membership events for the active workspace." actions={<div className="flex items-center gap-2 rounded-lg border border-primary/20 px-3 py-1.5 text-sm text-muted-foreground"><ClipboardList className="h-4 w-4 text-primary" />{logs.length} recent events</div>} />
    <div className="mt-6 overflow-hidden rounded-2xl border border-border/50 glass-card">
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="border-b border-border/50 bg-background/30 text-xs uppercase tracking-wider text-muted-foreground"><tr><th className="px-4 py-3">When</th><th className="px-4 py-3">Event</th><th className="px-4 py-3">Actor</th><th className="px-4 py-3">Target</th><th className="px-4 py-3">IP</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id} className="border-b border-border/30 last:border-0"><td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{log.createdAt.toLocaleString()}</td><td className="px-4 py-3 font-mono text-xs text-primary">{log.action}</td><td className="px-4 py-3">{log.actorEmail ?? "Unknown"}</td><td className="px-4 py-3 text-muted-foreground">{log.targetType ? `${log.targetType}${log.targetId ? ` · ${log.targetId}` : ""}` : "—"}</td><td className="px-4 py-3 font-mono text-xs text-muted-foreground">{log.ip ?? "—"}</td></tr>)}{logs.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">No audit events have been recorded for this workspace yet.</td></tr>}</tbody></table></div>
    </div>
  </>
}
