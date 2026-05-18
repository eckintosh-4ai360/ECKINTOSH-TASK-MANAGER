import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import pg from "pg"

const { Pool } = pg

async function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not set")

  console.log("Connecting to:", `${url.substring(0, 40)}...`)

  const cleanUrl = url
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/[?&]channel_binding=[^&]*/g, "")
    .replace(/\?&/, "?")

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  // Clear data in dependency-safe order for repeatable local demos.
  await prisma.standup.deleteMany()
  await prisma.calendarEvent.deleteMany()
  await prisma.deployment.deleteMany()
  await prisma.sprint.deleteMany()
  await prisma.task.deleteMany()
  await prisma.projectMember.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()
  console.log("Cleared existing data...")

  const adminPassword = await bcrypt.hash("Admin@2026", 10)
  const devPassword = await bcrypt.hash("Dev@2026", 10)

  const admin = await prisma.user.create({
    data: {
      email: "admin@eckintosh.dev",
      name: "Eckintosh",
      password: adminPassword,
      role: "ADMIN",
      title: "Lead Dev / Full Stack",
      timezone: "Atlantic/Reykjavik",
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
      timezone: "Africa/Lagos",
    },
  })

  const kemi = await prisma.user.create({
    data: {
      email: "kemi@eckintosh.dev",
      name: "Kemi",
      password: devPassword,
      role: "USER",
      title: "Mobile Developer",
      timezone: "Africa/Lagos",
    },
  })

  const tunde = await prisma.user.create({
    data: {
      email: "tunde@eckintosh.dev",
      name: "Tunde",
      password: devPassword,
      role: "USER",
      title: "Frontend Engineer",
      timezone: "Europe/London",
    },
  })

  console.log("Created team members: Jay, Kemi, Tunde")

  await prisma.notificationPreference.createMany({
    data: [
      { userId: admin.id },
      { userId: jay.id },
      { userId: kemi.id },
      { userId: tunde.id },
    ],
  })

  const devflow = await prisma.project.create({
    data: {
      name: "DevFlow Platform",
      description: "Developer team operations hub with sprints, standups, and deployments.",
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
      description: "REST backend for the commerce platform with Paystack integration.",
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
      description: "Cross-platform app with real-time sync and offline-first flows.",
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

  const sprint7 = await prisma.sprint.create({
    data: {
      name: "Sprint 7 - Auth and Dashboard",
      goal: "Complete authentication and ship the dashboard refresh.",
      projectId: devflow.id,
      status: "ACTIVE",
      startDate: new Date("2026-05-11"),
      endDate: new Date("2026-05-18"),
    },
  })

  const sprint3 = await prisma.sprint.create({
    data: {
      name: "Sprint 3 - Checkout Flow",
      goal: "Finish checkout and payment integration end to end.",
      projectId: ecommerce.id,
      status: "ACTIVE",
      startDate: new Date("2026-05-09"),
      endDate: new Date("2026-05-16"),
    },
  })

  console.log("Created sprints")

  const now = new Date()
  const inHours = (hours: number) => new Date(now.getTime() + hours * 60 * 60 * 1000)
  const inDays = (days: number) => new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  await prisma.task.createMany({
    data: [
      { title: "Redesign sidebar with DevFlow branding", status: "COMPLETED", priority: "high", projectId: devflow.id, sprintId: sprint7.id, assigneeId: admin.id, dueDate: inDays(-3) },
      { title: "Build sprint overview component", status: "COMPLETED", priority: "high", projectId: devflow.id, sprintId: sprint7.id, assigneeId: admin.id, dueDate: inDays(-2) },
      { title: "Add standup feed widget", status: "IN_PROGRESS", priority: "medium", projectId: devflow.id, sprintId: sprint7.id, assigneeId: admin.id, dueDate: inHours(18) },
      { title: "Setup JWT auth middleware", status: "IN_REVIEW", priority: "critical", projectId: devflow.id, sprintId: sprint7.id, assigneeId: jay.id, dueDate: inDays(-1) },
      { title: "Write API route tests", status: "TODO", priority: "medium", projectId: devflow.id, sprintId: sprint7.id, assigneeId: kemi.id, dueDate: inDays(3) },
      { title: "Paystack webhook integration", status: "IN_PROGRESS", priority: "critical", projectId: ecommerce.id, sprintId: sprint3.id, assigneeId: jay.id, dueDate: inHours(30) },
      { title: "Cart state management", status: "COMPLETED", priority: "high", projectId: ecommerce.id, sprintId: sprint3.id, assigneeId: tunde.id, dueDate: inDays(-4) },
      { title: "Order confirmation emails", status: "IN_REVIEW", priority: "medium", projectId: ecommerce.id, sprintId: sprint3.id, assigneeId: jay.id, dueDate: inDays(2) },
      { title: "Fix 401 on order endpoint", status: "COMPLETED", priority: "high", projectId: ecommerce.id, sprintId: sprint3.id, assigneeId: jay.id, dueDate: inDays(-5) },
      { title: "Initialize Flutter project structure", status: "TODO", priority: "high", projectId: mobileApp.id, assigneeId: kemi.id, dueDate: inDays(5) },
      { title: "Configure GitHub Actions CI/CD", status: "TODO", priority: "high", projectId: mobileApp.id, assigneeId: admin.id, dueDate: inDays(-1) },
    ],
  })

  console.log("Created tasks")

  await prisma.deployment.createMany({
    data: [
      { version: "v2.4.1", environment: "production", status: "success", projectId: ecommerce.id, deployedById: jay.id, duration: 192 },
      { version: "v1.8.0", environment: "staging", status: "success", projectId: devflow.id, deployedById: admin.id, duration: 108 },
      { version: "v2.4.0", environment: "production", status: "failed", projectId: ecommerce.id, deployedById: jay.id, duration: 22 },
    ],
  })

  await prisma.standup.createMany({
    data: [
      {
        userId: admin.id,
        projectId: devflow.id,
        didYesterday: "Finished the sidebar redesign, sprint overview, and deployment feed components.",
        doingToday: "Building the standup feed widget and planning a staging deploy.",
        blockers: null,
        mood: 5,
      },
      {
        userId: jay.id,
        projectId: ecommerce.id,
        didYesterday: "Resolved the auth issue on order endpoints and debugged JWT handling.",
        doingToday: "Integrating the Paystack webhook and tightening tests.",
        blockers: "Still waiting for sandbox credentials from the client side.",
        mood: 3,
      },
      {
        userId: kemi.id,
        projectId: mobileApp.id,
        didYesterday: "Set up the Flutter project structure and CI pipeline.",
        doingToday: "Building login, registration, and password reset screens.",
        blockers: null,
        mood: 4,
      },
    ],
  })

  await prisma.calendarEvent.createMany({
    data: [
      {
        title: "Sprint review sync",
        description: "Live walkthrough of sprint deliverables and blockers.",
        startTime: inHours(6),
        endTime: inHours(7),
        type: "review",
        color: "#f59e0b",
        location: "Google Meet",
      },
      {
        title: "Checkout cutover",
        description: "Production readiness check for the new payment flow.",
        startTime: inDays(1),
        endTime: new Date(inDays(1).getTime() + 45 * 60 * 1000),
        type: "deadline",
        color: "#ef4444",
        location: "War room",
      },
    ],
  })

  await prisma.notification.createMany({
    data: [
      {
        userId: admin.id,
        title: "New scheduled event",
        message: "Eckintosh scheduled Sprint review sync.",
        type: "info",
        link: "/calendar",
      },
      {
        userId: admin.id,
        title: "Task reminder",
        message: "Configure GitHub Actions CI/CD is overdue and needs attention.",
        type: "warning",
        link: "/tasks",
      },
      {
        userId: admin.id,
        title: "Standup pulse",
        message: "Jay posted a standup update for E-Commerce API.",
        type: "info",
        link: "/standups",
      },
      {
        userId: jay.id,
        title: "Task assigned or updated",
        message: "Eckintosh updated Paystack webhook integration and it is assigned to you.",
        type: "info",
        link: "/tasks",
      },
    ],
  })

  console.log("\nDevFlow database seeded successfully!")
  console.log("-----------------------------------------")
  console.log("Admin login: admin@eckintosh.dev / Admin@2026")
  console.log("Dev login:   jay@eckintosh.dev / Dev@2026")
  console.log("-----------------------------------------")

  await prisma.$disconnect()
  await pool.end()
}

main().catch((error) => {
  console.error("Seed failed:", error.message)
  process.exit(1)
})
