import { Sidebar } from "@/components/dashboard/sidebar"
import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { SettingsContent } from "@/components/settings/settings-content"
import { getSettingsPageData } from "@/lib/actions/settings-actions"

export default async function SettingsPage() {
  const settings = await getSettingsPageData()

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header title="System Config" description="Manage your account preferences and application settings." />

        <div className="mt-6">
          <SettingsContent settings={settings} />
        </div>
      </main>
    </div>
  )
}
