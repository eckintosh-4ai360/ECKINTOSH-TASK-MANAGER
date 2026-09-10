import { AIAssistantContent } from "@/components/ai/ai-assistant-content"
import { requireWorkspace } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "AI Assistant — Spagad SRAD",
  description: "Chat, plan, and act across your Spagad workspace with AI.",
}

async function getStats(workspaceId: string) {
  try {
    const [projects, notes, calendarEvents] = await Promise.all([
      prisma.project.count({ where: { workspaceId } }),
      prisma.note.count({ where: { workspaceId } }),
      prisma.calendarEvent.count({
        where: { workspaceId, startTime: { gte: new Date() } },
      }),
    ])
    return { projects, notes, calendarEvents }
  } catch {
    return { projects: 0, notes: 0, calendarEvents: 0 }
  }
}

export default async function AIAssistantPage() {
  const session = await requireWorkspace()
  const stats = await getStats(session.workspaceId)

  return (
    <div className="max-w-5xl mx-auto">
      <AIAssistantContent stats={stats} />
    </div>
  )
}
