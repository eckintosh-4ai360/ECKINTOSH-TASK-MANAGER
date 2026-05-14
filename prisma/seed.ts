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

  // Clean existing data
  await prisma.standup.deleteMany()
  await prisma.deployment.deleteMany()
  await prisma.sprint.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  console.log("Cleared existing data...")

  // Hash passwords
  const adminPassword = await bcrypt.hash("Admin@2026", 10)
  const devPassword = await bcrypt.hash("Dev@2026", 10)

  // ── Create team members ────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: "admin@eckintosh.dev",
      name: "Eckintosh",
      password: adminPassword,
      role: "ADMIN",
      title: "Lead Dev / Full Stack",
    },
  })
  console.log("Created admin:", admin.email, "| password: Admin@2026")

  const jay = await prisma.user.create({
    data: {
      email: "jay@eckintosh.dev",
      name: "Jay",
      password: devPassword,
      role: "USER",
      title: "Backend Engineer",
    },
  })

  const kemi = await prisma.user.create({
    data: {
      email: "kemi@eckintosh.dev",
      name: "Kemi",
      password: devPassword,
      role: "USER",
      title: "Mobile Developer",
    },
  })

  const tunde = await prisma.user.create({
    data: {
      email: "tunde@eckintosh.dev",
      name: "Tunde",
      password: devPassword,
      role: "USER",
      title: "Frontend Engineer",
    },
  })

  console.log("Created team members: Jay, Kemi, Tunde")

  // ── Create Projects ────────────────────────────────────────────────────────
  const devflow = await prisma.project.create({
    data: {
      name: "DevFlow Platform",
      description: "Developer team operations hub — sprints, standups, deployments in one place.",
      priority: "critical",
      status: "active",
      color: "#a855f7",
      tech: ["Next.js", "Prisma", "PostgreSQL", "WebSocket"],
      progress: 45,
      ownerId: admin.id,
      endDate: new Date("2026-09-01"),
    },
  })

  const ecommerce = await prisma.project.create({
    data: {
      name: "E-Commerce API",
      description: "RESTful backend API for e-commerce platform with Paystack payment integration.",
      priority: "high",
      status: "active",
      color: "#00d4ff",
      tech: ["Node.js", "Express", "PostgreSQL", "Paystack"],
      progress: 72,
      ownerId: admin.id,
      endDate: new Date("2026-07-15"),
    },
  })

  const mobileApp = await prisma.project.create({
    data: {
      name: "Mobile App v2",
      description: "Cross-platform mobile app with real-time sync and offline-first architecture.",
      priority: "medium",
      status: "paused",
      color: "#10b981",
      tech: ["Flutter", "Firebase", "Dart"],
      progress: 20,
      ownerId: admin.id,
      endDate: new Date("2026-11-01"),
    },
  })

  console.log("Created 3 projects")

  // ── Project Members ─────────────────────────────────────────────────────────
  await prisma.projectMember.createMany({
    data: [
      { projectId: devflow.id, userId: admin.id, role: "lead" },
      { projectId: devflow.id, userId: jay.id, role: "backend" },
      { projectId: ecommerce.id, userId: jay.id, role: "lead" },
      { projectId: ecommerce.id, userId: tunde.id, role: "frontend" },
      { projectId: mobileApp.id, userId: kemi.id, role: "lead" },
      { projectId: mobileApp.id, userId: admin.id, role: "devops" },
    ],
  })

  // ── Sprints ─────────────────────────────────────────────────────────────────
  const sprint7 = await prisma.sprint.create({
    data: {
      name: "Sprint 7 – Auth & Dashboard",
      goal: "Complete authentication system and redesign the dashboard with dev-team focused widgets.",
      projectId: devflow.id,
      status: "ACTIVE",
      startDate: new Date("2026-05-11"),
      endDate: new Date("2026-05-18"),
    },
  })

  const sprint3 = await prisma.sprint.create({
    data: {
      name: "Sprint 3 – Checkout Flow",
      goal: "Complete end-to-end checkout with Paystack payment integration.",
      projectId: ecommerce.id,
      status: "ACTIVE",
      startDate: new Date("2026-05-09"),
      endDate: new Date("2026-05-16"),
    },
  })

  console.log("Created sprints")

  // ── Tasks ───────────────────────────────────────────────────────────────────
  await prisma.task.createMany({
    data: [
      { title: "Redesign sidebar with DevFlow branding", status: "COMPLETED", priority: "high", projectId: devflow.id, sprintId: sprint7.id, assigneeId: admin.id },
      { title: "Build sprint overview component", status: "COMPLETED", priority: "high", projectId: devflow.id, sprintId: sprint7.id, assigneeId: admin.id },
      { title: "Add standup feed widget", status: "IN_PROGRESS", priority: "medium", projectId: devflow.id, sprintId: sprint7.id, assigneeId: admin.id },
      { title: "Setup JWT auth middleware", status: "IN_REVIEW", priority: "critical", projectId: devflow.id, sprintId: sprint7.id, assigneeId: jay.id },
      { title: "Write API route tests", status: "TODO", priority: "medium", projectId: devflow.id, sprintId: sprint7.id, assigneeId: kemi.id },
      { title: "Paystack webhook integration", status: "IN_PROGRESS", priority: "critical", projectId: ecommerce.id, sprintId: sprint3.id, assigneeId: jay.id },
      { title: "Cart state management", status: "COMPLETED", priority: "high", projectId: ecommerce.id, sprintId: sprint3.id, assigneeId: tunde.id },
      { title: "Order confirmation emails", status: "IN_REVIEW", priority: "medium", projectId: ecommerce.id, sprintId: sprint3.id, assigneeId: jay.id },
      { title: "Fix 401 on order endpoint", status: "COMPLETED", priority: "high", projectId: ecommerce.id, sprintId: sprint3.id, assigneeId: jay.id },
      { title: "Initialize Flutter project structure", status: "TODO", priority: "high", projectId: mobileApp.id, assigneeId: kemi.id },
      { title: "Configure GitHub Actions CI/CD", status: "TODO", priority: "high", projectId: mobileApp.id, assigneeId: admin.id },
    ],
  })

  console.log("Created tasks")

  // ── Deployments ─────────────────────────────────────────────────────────────
  await prisma.deployment.createMany({
    data: [
      { version: "v2.4.1", environment: "production", status: "success", projectId: ecommerce.id, deployedById: jay.id, duration: 192 },
      { version: "v1.8.0", environment: "staging", status: "success", projectId: devflow.id, deployedById: admin.id, duration: 108 },
      { version: "v2.4.0", environment: "production", status: "failed", projectId: ecommerce.id, deployedById: jay.id, duration: 22 },
    ],
  })

  // ── Standups ────────────────────────────────────────────────────────────────
  await prisma.standup.createMany({
    data: [
      {
        userId: admin.id,
        projectId: devflow.id,
        didYesterday: "Finished the sidebar redesign, sprint overview, and deployment feed components. Also upgraded the Prisma schema.",
        doingToday: "Building the standup feed widget and sprints board page. Planning to push a staging deploy by EOD.",
        blockers: null,
        mood: 5,
      },
      {
        userId: jay.id,
        projectId: ecommerce.id,
        didYesterday: "Resolved the 401 auth error on order endpoints. Debugged the JWT middleware issue.",
        doingToday: "Integrating Paystack webhook. Aiming to finish endpoint + test cases today.",
        blockers: "Still waiting for sandbox credentials from the client side. Escalated.",
        mood: 3,
      },
      {
        userId: kemi.id,
        projectId: mobileApp.id,
        didYesterday: "Set up Flutter project structure and CI/CD pipeline on GitHub Actions.",
        doingToday: "Building the authentication flow — login, register, and password reset screens.",
        blockers: null,
        mood: 4,
      },
    ],
  })

  console.log("\n✅ DevFlow database seeded successfully!")
  console.log("─────────────────────────────────────────")
  console.log("🔑 Admin login: admin@eckintosh.dev / Admin@2026")
  console.log("👤 Dev login:   jay@eckintosh.dev   / Dev@2026")
  console.log("─────────────────────────────────────────")

  await prisma.$disconnect()
  await pool.end()
}

main().catch((e) => {
  console.error("❌ Seed failed:", e.message)
  process.exit(1)
})
