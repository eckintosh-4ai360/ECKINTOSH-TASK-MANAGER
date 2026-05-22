import { WhiteboardContent } from "@/components/whiteboard/whiteboard-content"
import { getWhiteboards } from "@/lib/actions/whiteboard-actions"
import { requireSession } from "@/lib/auth"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "Whiteboard — Eckintosh",
  description: "Sketch, plan, and design on an infinite canvas — powered by Excalidraw.",
}

export default async function WhiteboardPage() {
  await requireSession()
  const boards = await getWhiteboards()

  return (
    <div className="h-[calc(100vh-80px)]">
      <WhiteboardContent initialBoards={boards} />
    </div>
  )
}
