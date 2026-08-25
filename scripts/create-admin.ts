import "dotenv/config"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"
import pg from "pg"
import { getDatabaseSslOptions, normalizeDatabaseUrl } from "../lib/db-ssl"

/**
 * Bootstraps (or promotes) an admin account from the command line.
 *
 * This replaces the old GET /api/setup-admin route, which was reachable by
 * anyone who knew — or guessed — the default token.
 *
 *   npx tsx scripts/create-admin.ts admin@example.com "Strong Password" "Admin Name"
 */

const MIN_PASSWORD_LENGTH = 12

function usage(message: string): never {
  console.error(`\n${message}\n`)
  console.error('Usage: npx tsx scripts/create-admin.ts <email> <password> [name]\n')
  process.exit(1)
}

async function main() {
  const [email, password, name = "Workspace Admin"] = process.argv.slice(2)

  if (!email || !email.includes("@")) usage("A valid email address is required.")
  if (!password) usage("A password is required.")
  if (password.length < MIN_PASSWORD_LENGTH) {
    usage(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`)
  }

  const url = process.env.DATABASE_URL
  if (!url) usage("DATABASE_URL is not set.")

  const pool = new pg.Pool({
    connectionString: normalizeDatabaseUrl(url),
    ssl: getDatabaseSslOptions(),
  })
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

  try {
    const hashed = await bcrypt.hash(password, 12)
    const normalizedEmail = email.trim().toLowerCase()

    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: { password: hashed, role: "ADMIN", name },
      create: {
        email: normalizedEmail,
        name,
        password: hashed,
        role: "ADMIN",
        title: "Administrator",
      },
      select: { id: true, email: true, role: true },
    })

    console.log(`\n✅ Admin ready: ${user.email} (${user.id})`)
    console.log("   Sign in at /login/email\n")
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

main().catch((error) => {
  console.error("\n❌ Failed to create admin:", error instanceof Error ? error.message : error)
  process.exit(1)
})
