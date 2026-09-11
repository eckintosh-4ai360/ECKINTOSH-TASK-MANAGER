import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { SettingsContent } from "@/components/settings/settings-content"
import { getSettingsPageData } from "@/lib/actions/settings-actions"
import { getSecuritySettingsAction } from "@/lib/actions/security-actions"
import { SecuritySettings } from "@/components/settings/security-settings"

export default async function SettingsPage() {
  const [settings, security] = await Promise.all([getSettingsPageData(), getSecuritySettingsAction()])

  return (
    <>
      <Header title="System Config" description="Manage your account preferences and application settings." />

      <div className="mt-6">
        <SettingsContent settings={settings} />
      </div>
      <div className="mt-6">
        <SecuritySettings initial={security} />
      </div>
    </>
  )
}
