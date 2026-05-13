import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { EmailInterface } from "@/components/emails/email-interface"
import { getInbox, getSentEmails, getEmailableUsers } from "@/lib/actions/email-actions"
import { requireSession } from "@/lib/auth"

export default async function EmailsPage() {
  await requireSession()
  const [inbox, sent, users] = await Promise.all([
    getInbox(),
    getSentEmails(),
    getEmailableUsers(),
  ])

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Email"
          description="Internal email system for your team."
        />

        <div className="mt-4">
          <EmailInterface inbox={inbox} sent={sent} users={users} />
        </div>
      </main>
    </div>
  )
}
