import { NextResponse, type NextRequest } from "next/server"
import { timingSafeEqual as nodeTimingSafeEqual } from "node:crypto"

import { runReminderSweep } from "@/lib/scheduler/reminders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Vercel Cron's own timeout aside, a sweep touching every active task and
// user should stay well under a minute; this just avoids a silent 10s cutoff
// on the Hobby plan's default.
export const maxDuration = 60

/** Constant-time comparison, so a wrong secret leaks nothing through timing. */
function timingSafeEqual(a: string, b: string) {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return nodeTimingSafeEqual(left, right)
}

/**
 * Triggered on a schedule to send task reminders, escalate overdue tasks, and
 * fire daily digests.
 *
 * Two callers are supported, both authenticated with CRON_SECRET:
 *   1. Vercel Cron (see vercel.json), which signs requests with
 *      `Authorization: Bearer $CRON_SECRET` automatically once the env var
 *      is set. The Hobby plan caps this at one run per day.
 *   2. Any external scheduler (cron-job.org, GitHub Actions, an uptime pinger)
 *      sending `X-Cron-Secret: $CRON_SECRET`. This is what makes minute-grained
 *      reminders possible without a paid plan — lead times as short as 15m are
 *      meaningless if the sweep only runs at 09:00.
 *
 * Fails closed if CRON_SECRET isn't configured, the same way the GitHub
 * webhook does.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    console.error("[cron/reminders] Rejected: CRON_SECRET is not configured.")
    return NextResponse.json({ error: "Reminder scheduler is not configured." }, { status: 503 })
  }

  const presented =
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
    ?? request.headers.get("x-cron-secret")
    ?? ""

  if (!timingSafeEqual(presented, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const summary = await runReminderSweep()
    return NextResponse.json({ ok: true, ...summary })
  } catch (error) {
    console.error("[cron/reminders] Sweep failed:", error)
    return NextResponse.json({ error: "Reminder sweep failed." }, { status: 500 })
  }
}
