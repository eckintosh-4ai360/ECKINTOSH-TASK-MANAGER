import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { UserManagement } from "@/components/admin/user-management"
import { getUsers } from "@/lib/actions/auth-actions"
import { requireAdmin } from "@/lib/auth"
import { Users } from "lucide-react"

export default async function AdminUsersPage() {
  await requireAdmin()
  const users = await getUsers()

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="User Management"
          description="Create and manage user accounts for your organization."
          actions={
            <div className="flex items-center gap-2 text-sm text-muted-foreground glass border border-primary/20 rounded-lg px-3 py-1.5">
              <Users className="w-4 h-4 text-primary" />
              <span className="font-mono">{users.length} users total</span>
            </div>
          }
        />

        <div className="mt-6">
          <UserManagement users={users} />
        </div>
      </main>
    </div>
  )
}
