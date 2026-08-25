import prisma from "@/lib/prisma"

/**
 * Two layers of brute-force defence:
 *
 *  1. Per-account lockout persisted on the user row, so it survives restarts
 *     and applies no matter which IP the attempts come from.
 *  2. An in-process sliding window keyed by IP, which catches spraying across
 *     many accounts before it ever reaches the database.
 *
 * The in-memory half is per-instance. On multi-instance deployments the
 * database lockout is the one that actually holds, which is why it exists.
 */

export const MAX_FAILED_ATTEMPTS = 5
export const LOCKOUT_MINUTES = 15

const IP_WINDOW_MS = 60_000
const IP_MAX_ATTEMPTS = 20
const IP_BUCKET_SWEEP_MS = 5 * 60_000

const ipBuckets = new Map<string, number[]>()
let lastSweep = Date.now()

function sweep(now: number) {
  if (now - lastSweep < IP_BUCKET_SWEEP_MS) return
  lastSweep = now

  for (const [ip, stamps] of ipBuckets) {
    const live = stamps.filter((stamp) => now - stamp < IP_WINDOW_MS)
    if (live.length) ipBuckets.set(ip, live)
    else ipBuckets.delete(ip)
  }
}

export function recordIpAttempt(ip: string) {
  const now = Date.now()
  sweep(now)

  const stamps = (ipBuckets.get(ip) ?? []).filter((stamp) => now - stamp < IP_WINDOW_MS)
  stamps.push(now)
  ipBuckets.set(ip, stamps)

  return stamps.length <= IP_MAX_ATTEMPTS
}

export function clearIpAttempts(ip: string) {
  ipBuckets.delete(ip)
}

export function describeLockout(lockedUntil: Date) {
  const minutes = Math.max(1, Math.ceil((lockedUntil.getTime() - Date.now()) / 60_000))
  return `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`
}

export function isLocked(user: { lockedUntil: Date | null }) {
  return Boolean(user.lockedUntil && user.lockedUntil.getTime() > Date.now())
}

export async function registerFailedAttempt(userId: string, currentAttempts: number) {
  const attempts = currentAttempts + 1
  const shouldLock = attempts >= MAX_FAILED_ATTEMPTS

  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: shouldLock ? 0 : attempts,
      lockedUntil: shouldLock ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000) : null,
    },
  })

  return { locked: shouldLock, remaining: Math.max(0, MAX_FAILED_ATTEMPTS - attempts) }
}

export async function registerSuccessfulLogin(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
  })
}
