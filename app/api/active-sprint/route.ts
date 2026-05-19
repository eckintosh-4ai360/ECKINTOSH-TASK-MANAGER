import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function GET() {
  await requireSession()

  const sprint = await prisma.sprint.findFirst({
    where: { status: "ACTIVE" },
    include: {
      project: {
        select: { id: true, name: true, color: true },
      },
      tasks: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  if (!sprint) {
    return NextResponse.json({ sprint: null })
  }

  const total = sprint.tasks.length
  const done = sprint.tasks.filter((t) => t.status === "COMPLETED").length

  return NextResponse.json({
    sprint: {
      id: sprint.id,
      name: sprint.name,
      status: sprint.status,
      project: sprint.project,
      stats: { total, done },
    },
  })
}
