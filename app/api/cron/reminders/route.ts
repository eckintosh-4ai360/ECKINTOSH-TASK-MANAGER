import { NextResponse, type NextRequest } from "next/server"
import { runReminderSweep } from "@/lib/scheduler/reminders"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Vercel Cron's own timeout aside, a sweep touching every active task and
// user should stay well under a minute; this just avoids a silent 10s cutoff
// on the Hobby plan's default.
export const maxDuration = 60

/**
 * Triggered on a schedule (see vercel.json's `crons` entry) to send task
 * reminders, escalate overdue tasks, and fire daily digests. Vercel signs
 * requests to cron routes with `Authorization: Bearer $CRON_SECRET`
 * automatically once that env var is set — this checks it, and fails closed
 * if it isn't configured, the same way the GitHub webhook does.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET

  if (!secret) {
    console.error("[cron/reminders] Rejected: CRON_SECRET is not configured.")
    return NextResponse.json({ error: "Reminder scheduler is not configured." }, { status: 503 })
  }

  const authHeader = request.headers.get("authorization")
  if (authHeader !== `Bearer ${secret}`) {
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
