import { redirect } from "next/navigation"
import { getSession } from "@/lib/auth"
import { getWorkspaceOptionsForUser } from "@/lib/workspace"
import { WorkspaceHome } from "@/components/workspaces/workspace-home"

export const dynamic = "force-dynamic"

export default async function WorkspacesPage() {
  const session = await getSession()
  if (!session) redirect("/login")
  const workspaces = await getWorkspaceOptionsForUser(session.id)
  return <WorkspaceHome workspaces={workspaces} />
}
