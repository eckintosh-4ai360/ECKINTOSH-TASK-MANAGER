import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { HelpContent } from "@/components/help/help-content"
import { getMySupportTickets } from "@/lib/actions/support-actions"

export default async function HelpPage() {
  const tickets = await getMySupportTickets()

  return (
    <>
      <Header title="Help Center" description="Documentation, tutorials, and support — everything you need to get the most out of Spagad." />

      <div className="mt-6">
        <HelpContent initialTickets={tickets} />
      </div>
    </>
  )
}
