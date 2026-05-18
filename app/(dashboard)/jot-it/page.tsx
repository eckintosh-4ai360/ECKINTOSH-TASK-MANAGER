import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { JotItContent } from "@/components/notes/jot-it-content"
import { getNotes } from "@/lib/actions/note-actions"
import { requirePermission } from "@/lib/auth"

export default async function JotItPage() {
  await requirePermission("manage_own_notes")
  const notes = await getNotes()

  return (
    <>
      <Header
        title="Jot it"
        description="Capture quick notes, pin important thoughts, and keep them synced to your workspace."
      />

      <div className="mt-6">
        <JotItContent initialNotes={notes} />
      </div>
    </>
  )
}
