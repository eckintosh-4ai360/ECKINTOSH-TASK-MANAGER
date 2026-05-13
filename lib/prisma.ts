import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const { Pool } = pg

let _client: PrismaClient | undefined

export function getDb(): PrismaClient {
  if (_client) return _client

  const url = process.env.DATABASE_URL
  if (!url) throw new Error("DATABASE_URL is not defined. Check your .env or .env.local file.")

  // Strip SSL params that confuse the pg driver, pass ssl explicitly
  const cleanUrl = url
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/[?&]channel_binding=[^&]*/g, "")
    .replace(/\?&/, "?")

  const pool = new Pool({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } })
  const adapter = new PrismaPg(pool)
  _client = new PrismaClient({ adapter })
  return _client
}

// Proxy that uses Reflect.get with the real PrismaClient as receiver
// so model delegate getters (like .internalEmail) retain the correct `this`
const prisma = new Proxy(Object.create(null) as PrismaClient, {
  get(_, prop) {
    const client = getDb()
    return Reflect.get(client, prop, client)
  },
})

export default prisma
