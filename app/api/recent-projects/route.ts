import { NextResponse } from "next/server"
import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"

export async function GET() {
  await requireSession()

  const projects = await prisma.project.findMany({
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
