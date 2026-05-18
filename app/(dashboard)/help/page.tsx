import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { HelpContent } from "@/components/help/help-content"

export default async function HelpPage() {
  return (
    <>
      <Header title="Support Center" description="Get help with using Tasko and find answers to common questions." />

      <div className="mt-6">
        <HelpContent />
      </div>
    </>
  )
}
