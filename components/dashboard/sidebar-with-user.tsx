import { getSession } from "@/lib/auth"
import { Sidebar } from "./sidebar"

export async function SidebarWithUser() {
  const session = await getSession()

  return <Sidebar role={session?.role ?? "GUEST"} />
}
