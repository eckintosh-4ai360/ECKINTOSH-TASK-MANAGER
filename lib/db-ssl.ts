import fs from "node:fs"
import type { ConnectionOptions } from "node:tls"

/**
 * TLS options for the Postgres pool.
 *
 * Certificate verification is ON by default. Managed providers (Neon, Supabase,
 * RDS with the public bundle) all present certificates that chain to a public
 * root, so this "just works" — an unverified TLS session is encrypted but not
 * authenticated, which leaves the connection open to an active MITM.
 *
 * Escape hatches, in order of preference:
 *   DATABASE_CA_CERT      — PEM contents of a private CA to trust
 *   DATABASE_CA_CERT_PATH — path to that PEM file
 *   DATABASE_SSL_NO_VERIFY=true — disable verification (refused in production)
 */
export function getDatabaseSslOptions(): ConnectionOptions | false {
  if (process.env.DATABASE_SSL === "false") return false

  const noVerify = process.env.DATABASE_SSL_NO_VERIFY === "true"

  if (noVerify && process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_SSL_NO_VERIFY=true is not allowed in production. Provide DATABASE_CA_CERT (or DATABASE_CA_CERT_PATH) instead so the database certificate can be verified.",
    )
  }

  if (noVerify) {
    console.warn(
      "[db] TLS certificate verification is DISABLED (DATABASE_SSL_NO_VERIFY=true). Development only — the connection is encrypted but not authenticated.",
    )
    return { rejectUnauthorized: false }
  }

  const inlineCa = process.env.DATABASE_CA_CERT
  if (inlineCa) {
    return { rejectUnauthorized: true, ca: inlineCa.replace(/\n/g, "\n") }
  }

  const caPath = process.env.DATABASE_CA_CERT_PATH
  if (caPath) {
    return { rejectUnauthorized: true, ca: fs.readFileSync(caPath, "utf8") }
  }

  return { rejectUnauthorized: true }
}

/**
 * The pg driver takes its TLS config from the `ssl` option, so libpq-style
 * query params in the URL only confuse it. Strip them.
 */
export function normalizeDatabaseUrl(url: string) {
  return url
    .replace(/[?&]sslmode=[^&]*/g, "")
    .replace(/[?&]channel_binding=[^&]*/g, "")
    .replace(/\?&/, "?")
}
