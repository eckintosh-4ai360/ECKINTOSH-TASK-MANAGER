import crypto from "node:crypto"
import prisma from "@/lib/prisma"
import type { AppRole } from "@/lib/rbac"

/**
 * Token-based workspace invitations.
 *
 * The raw token only ever exists in the emailed link. The database stores a
 * SHA-256 hash of it, the same way a password reset token would be handled —
 * a leaked database row is not by itself enough to accept the invite.
 */

export const INVITE_TTL_DAYS = 7

export type InvitationView = {
  id: string
  email: string
  role: AppRole
  message: string | null
  invitedByName: string
  expiresAt: Date
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function generateInviteToken() {
  return crypto.randomBytes(32).toString("base64url")
}

/**
 * Creates (or replaces) a pending invitation for an email address. Replacing
 * rather than stacking means re-inviting someone always issues a fresh link
 * and invalidates whatever was sent before.
 */
export async function createInvitation(params: {
  email: string
  role: AppRole
  message?: string
  invitedById: string
}) {
  const email = params.email.trim().toLowerCase()
  const token = generateInviteToken()
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000)

  await prisma.invitation.deleteMany({ where: { email, acceptedAt: null } })

  await prisma.invitation.create({
    data: {
      email,
      role: params.role,
      message: params.message?.trim() || null,
      tokenHash: hashToken(token),
      invitedById: params.invitedById,
      expiresAt,
    },
  })

  return token
}

/** Looks up a pending, unexpired invitation by the raw token from the link. */
export async function findInvitationByToken(token: string): Promise<InvitationView | null> {
  if (!token) return null

  const record = await prisma.invitation.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      email: true,
      role: true,
      message: true,
      acceptedAt: true,
      expiresAt: true,
      invitedBy: { select: { name: true, email: true } },
    },
  })

  if (!record || record.acceptedAt || record.expiresAt < new Date()) return null

  return {
    id: record.id,
    email: record.email,
    role: record.role,
    message: record.message,
    invitedByName: record.invitedBy.name ?? record.invitedBy.email,
    expiresAt: record.expiresAt,
  }
}

/** Looks up a pending, unexpired invitation by email — used during GitHub sign-in. */
export async function findPendingInvitationByEmail(email: string) {
  const normalized = email.trim().toLowerCase()

  return prisma.invitation.findFirst({
    where: { email: normalized, acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  })
}

export async function markInvitationAccepted(id: string) {
  await prisma.invitation.update({ where: { id }, data: { acceptedAt: new Date() } })
}
