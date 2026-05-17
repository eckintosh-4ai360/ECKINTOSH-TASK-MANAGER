import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { Sidebar } from "@/components/dashboard/sidebar"
import { JotItContent } from "@/components/notes/jot-it-content"
import { getNotes } from "@/lib/actions/note-actions"

export default async function JotItPage() {
  const notes = await getNotes()

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Jot it"
          description="Capture quick notes, pin important thoughts, and keep them synced to your workspace."
        />

        <div className="mt-6">
          <JotItContent initialNotes={notes} />
        </div>
      </main>
    </div>
  )
}
