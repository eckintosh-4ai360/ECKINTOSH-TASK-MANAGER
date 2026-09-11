import { headers } from "next/headers"
import type { Prisma } from "@prisma/client"
import prisma from "@/lib/prisma"

export type AuditEvent = {
  action: string
  actorUserId?: string | null
  actorEmail?: string | null
  workspaceId?: string | null
  targetType?: string | null
  targetId?: string | null
  ip?: string | null
  userAgent?: string | null
  metadata?: Record<string, unknown> | null
}

export async function getAuditRequestContext() {
  const requestHeaders = await headers()
  const forwarded = requestHeaders.get("x-forwarded-for")

  return {
    ip: forwarded?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || null,
    userAgent: requestHeaders.get("user-agent")?.slice(0, 512) || null,
  }
}

// Auditing must never turn a successful user operation into a failed one. The
// caller still writes explicit, useful diagnostics so a broken audit table is
// observable in production.
export async function recordAuditEvent(event: AuditEvent) {
  try {
    await prisma.auditLog.create({
      data: {
        action: event.action,
        actorUserId: event.actorUserId ?? null,
        actorEmail: event.actorEmail?.toLowerCase() ?? null,
        workspaceId: event.workspaceId ?? null,
        targetType: event.targetType ?? null,
        targetId: event.targetId ?? null,
        ip: event.ip ?? null,
        userAgent: event.userAgent ?? null,
        metadata: event.metadata as Prisma.InputJsonValue | undefined,
      },
    })
  } catch (error) {
    console.error("[audit] Failed to record event", { action: event.action, error })
  }
}

export async function recordRequestAuditEvent(event: Omit<AuditEvent, "ip" | "userAgent">) {
  const context = await getAuditRequestContext()
  await recordAuditEvent({ ...event, ...context })
}
