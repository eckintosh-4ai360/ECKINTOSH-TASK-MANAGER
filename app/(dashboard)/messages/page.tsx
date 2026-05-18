import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { ChatInterface } from "@/components/messages/chat-interface"
import { requirePermission } from "@/lib/auth"

export default async function MessagesPage() {
  const session = await requirePermission("use_messages")

  return (
    <>
      <Header
        title="Messages"
        description="Real-time chat with your team members."
      />

      <div className="mt-4">
        <ChatInterface
          currentUserId={session.id}
          currentUserName={session.name}
        />
      </div>
    </>
  )
}
