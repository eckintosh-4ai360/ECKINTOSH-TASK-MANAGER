import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import pg from "pg"

const { Pool } = pg

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")

  console.log("Connecting to:", url.substring(0, 40) + "...")

  const cleanUrl = url
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/[?&]channel_binding=[^&]*/g, "")
    .replace(/\?&/, "?")

  const pool = new Pool({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Clean existing seed data
  await prisma.task.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  console.log("Cleared existing data...")

  // Hash admin password
  const adminPassword = await bcrypt.hash("Admin@2026", 10)

  // Create admin user
  const user = await prisma.user.create({
    data: {
      email: "admin@eckintosh.dev",
      name: "Eckintosh Admin",
      password: adminPassword,
      role: "ADMIN",
    },
  })
  console.log("Created admin user:", user.email)
  console.log("Admin password: Admin@2026")


  // Seed Project 1
  const project1 = await prisma.project.create({
    data: {
      name: "Eckintosh Task Manager",
      description: "Full-stack project management platform built with Next.js and Neon PostgreSQL",
      priority: "high",
      status: "active",
      progress: 60,
      ownerId: user.id,
      endDate: new Date("2026-08-01"),
    },
  })
  console.log("Created project:", project1.name)

  // Seed Project 2
  const project2 = await prisma.project.create({
    data: {
      name: "Mobile App V2",
      description: "Cross-platform mobile app for task management with real-time sync",
      priority: "medium",
      status: "active",
      progress: 25,
      ownerId: user.id,
      endDate: new Date("2026-10-15"),
    },
  })
  console.log("Created project:", project2.name)

  // Seed Task 1
  await prisma.task.create({
    data: {
      title: "Wire Neon database connection",
      description: "Connect the Next.js app to NeonDB via Prisma adapter",
      status: "COMPLETED",
      priority: "high",
      projectId: project1.id,
      assigneeId: user.id,
      dueDate: new Date("2026-05-15"),
    },
  })
  console.log("Created task: Wire Neon database connection")

  // Seed Task 2
  await prisma.task.create({
    data: {
      title: "Build authentication system",
      description: "Implement JWT-based user login and registration",
      status: "TODO",
      priority: "high",
      projectId: project1.id,
      assigneeId: user.id,
      dueDate: new Date("2026-06-01"),
    },
  })
  console.log("Created task: Build authentication system")

  // Seed Task 3
  await prisma.task.create({
    data: {
      title: "Design mobile UI screens",
      description: "Create Figma mockups for core screens",
      status: "IN_PROGRESS",
      priority: "medium",
      projectId: project2.id,
      assigneeId: user.id,
      dueDate: new Date("2026-07-01"),
    },
  })
  console.log("Created task: Design mobile UI screens")

  console.log("\n✅ Database seeded successfully!")
  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message)
  process.exit(1)
})
