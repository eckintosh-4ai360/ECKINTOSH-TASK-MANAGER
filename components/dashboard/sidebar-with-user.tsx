import { getSession } from "@/lib/auth"
import { getWorkspaceOptionsForUser } from "@/lib/workspace"
import { Sidebar } from "./sidebar"

export async function SidebarWithUser() {
  const session = await getSession()

  const workspaces = session ? await getWorkspaceOptionsForUser(session.id) : []
  return <Sidebar role={session?.role ?? "GUEST"} workspaces={workspaces} activeWorkspaceId={session?.workspaceId} />
}
