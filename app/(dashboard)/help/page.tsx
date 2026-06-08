import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { HelpContent } from "@/components/help/help-content"

export default async function HelpPage() {
  return (
    <>
      <Header title="Help Center" description="Documentation, tutorials, and support — everything you need to get the most out of Spagad." />

      <div className="mt-6">
        <HelpContent />
      </div>
    </>
  )
}
