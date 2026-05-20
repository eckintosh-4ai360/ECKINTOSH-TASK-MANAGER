import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { ProfileContent } from "@/components/profile/profile-content"
import { getSettingsPageData } from "@/lib/actions/settings-actions"

export default async function ProfilePage() {
  const settings = await getSettingsPageData()

  return (
    <>
      <Header
        title="My Profile"
        description="Keep your identity, timezone, and work context up to date across the workspace."
      />

      <div className="mt-6">
        <ProfileContent settings={settings} />
      </div>
    </>
  )
}
