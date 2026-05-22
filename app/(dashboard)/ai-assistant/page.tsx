import { AIAssistantContent } from "@/components/ai/ai-assistant-content"
import { requireSession } from "@/lib/auth"
import prisma from "@/lib/prisma"

export const dynamic = "force-dynamic"

export const metadata = {
  title: "AI Assistant — Eckintosh",
  description: "Chat, plan, and act across your Eckintosh workspace with AI.",
}

async function getStats() {
  try {
    const [projects, notes, calendarEvents] = await Promise.all([
      prisma.project.count(),
      prisma.note.count(),
      prisma.calendarEvent.count({
        where: { startTime: { gte: new Date() } },
      }),
    ])
    return { projects, notes, calendarEvents }
  } catch {
    return { projects: 0, notes: 0, calendarEvents: 0 }
  }
}

export default async function AIAssistantPage() {
  await requireSession()
  const stats = await getStats()

  return (
    <div className="max-w-5xl mx-auto">
      <AIAssistantContent stats={stats} />
    </div>
  )
}
