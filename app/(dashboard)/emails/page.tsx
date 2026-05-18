import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { EmailInterface } from "@/components/emails/email-interface"
import { getInbox, getSentEmails, getEmailableUsers } from "@/lib/actions/email-actions"
import { requirePermission } from "@/lib/auth"

export default async function EmailsPage() {
  await requirePermission("use_email")
  const [inbox, sent, users] = await Promise.all([
    getInbox(),
    getSentEmails(),
    getEmailableUsers(),
  ])

  return (
    <>
      <Header
        title="Email"
        description="Internal email system for your team."
      />

      <div className="mt-4">
        <EmailInterface inbox={inbox} sent={sent} users={users} />
      </div>
    </>
  )
}
