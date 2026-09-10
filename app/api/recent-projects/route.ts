import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireWorkspace } from "@/lib/auth"

export async function GET() {
  const session = await requireWorkspace()

  const projects = await prisma.project.findMany({
    where: { workspaceId: session.workspaceId },
    orderBy: { updatedAt: "desc" },
    take: 5,
    select: {
      id: true,
      name: true,
      color: true,
      status: true,
    },
  })

  return NextResponse.json(projects.map((p) => ({
    name: p.name,
    color: p.color,
    status: p.status,
  })))
}
