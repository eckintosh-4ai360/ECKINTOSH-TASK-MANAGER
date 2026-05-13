import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { ChatInterface } from "@/components/messages/chat-interface"
import { requireSession } from "@/lib/auth"

export default async function MessagesPage() {
  const session = await requireSession()

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
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
      </main>
    </div>
  )
}
