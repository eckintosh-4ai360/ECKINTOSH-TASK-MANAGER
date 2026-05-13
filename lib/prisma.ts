import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const { Pool } = pg

// Lazy singleton - defer Pool/adapter creation until first use
// so that Next.js has finished loading env vars before we connect.
let _prisma: PrismaClient | undefined

function getPrisma(): PrismaClient {
  if (_prisma) return _prisma

  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "DATABASE_URL is not defined. Check your .env or .env.local file."
    )
  }

  // Strip sslmode and channel_binding params to avoid pg SSL warnings,
  // then pass ssl explicitly instead.
  const cleanUrl = url
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/[?&]channel_binding=[^&]*/g, "")
    .replace(/\?&/, "?")

  const pool = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)
  _prisma = new PrismaClient({ adapter })

  return _prisma
}

// Proxy so callers can use `prisma.user.findMany()` etc. directly
const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop) {
    return (getPrisma() as any)[prop]
  },
})

export default prisma
