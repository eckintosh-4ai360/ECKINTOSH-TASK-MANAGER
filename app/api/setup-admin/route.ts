import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import prisma from "@/lib/prisma"

// ONE-TIME SETUP ROUTE — DELETE THIS FILE AFTER USE
// Hit GET /api/setup-admin to create/update the admin user with a password
// Protected by a setup token to prevent abuse

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get("token")

  // Simple protection — require token param
  const SETUP_TOKEN = process.env.SETUP_TOKEN ?? "spagad-setup-2026"
  if (token !== SETUP_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const adminEmail = searchParams.get("email") ?? "admin@spagad.dev"
  const adminPassword = searchParams.get("password") ?? "Spagad2026!"
  const adminName = searchParams.get("name") ?? "Spagad Admin"

  try {
    const hashed = await bcrypt.hash(adminPassword, 10)

    const user = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        password: hashed,
        role: "ADMIN",
        name: adminName,
      },
      create: {
        email: adminEmail,
        name: adminName,
        password: hashed,
        role: "ADMIN",
        title: "Administrator",
      },
    })

    return NextResponse.json({
      success: true,
      message: `Admin user ready. You can now sign in with email: ${user.email}`,
      userId: user.id,
      role: user.role,
    })
  } catch (err: any) {
    console.error("[setup-admin] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
