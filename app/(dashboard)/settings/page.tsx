import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { SettingsContent } from "@/components/settings/settings-content"
import { getSettingsPageData } from "@/lib/actions/settings-actions"

export default async function SettingsPage() {
  const settings = await getSettingsPageData()

  return (
    <>
      <Header title="System Config" description="Manage your account preferences and application settings." />

      <div className="mt-6">
        <SettingsContent settings={settings} />
      </div>
    </>
  )
}
