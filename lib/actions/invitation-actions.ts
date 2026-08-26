"use server"

import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { createSession } from "@/lib/auth"
import { validatePassword } from "@/lib/password-policy"
import { findInvitationByToken, markInvitationAccepted } from "@/lib/invitations"
import type { InvitationView } from "@/lib/invitations"
import { issueVerificationOtp } from "@/lib/email-verification"

export async function getInvitationAction(token: string): Promise<InvitationView | null> {
  return findInvitationByToken(token)
}

/**
 * Sets a password and creates the account for an invited email — the
 * credential-login counterpart to accepting via "Continue with GitHub"
 * (handled in auth.ts's signIn callback instead, since that path never
 * touches this action).
 */
export async function acceptInvitationAction(formData: FormData) {
  const token = formData.get("token") as string | null
  const name = (formData.get("name") as string | null)?.trim()
  const password = formData.get("password") as string | null

  if (!token) return { error: "Missing invitation token." }
  if (!name) return { error: "Please enter your name." }
  if (!password) return { error: "Please choose a password." }

  const invitation = await findInvitationByToken(token)
  if (!invitation) {
    return { error: "This invitation is invalid or has expired. Ask for a new one." }
  }

  const policyError = validatePassword(password, { email: invitation.email, name })
  if (policyError) return { error: policyError }

  const existing = await prisma.user.findUnique({ where: { email: invitation.email } })
  if (existing) {
    // They must already have joined some other way — just consume the invite.
    await markInvitationAccepted(invitation.id)
    return { error: "An account already exists for this email. Try signing in instead." }
  }

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email: invitation.email,
      name,
      password: hashed,
      role: invitation.role,
      title: "Team member",
    },
  })

  await markInvitationAccepted(invitation.id)

  // The invite link itself was emailed to this address, which is meaningful
  // evidence — but not proof they, not just someone forwarding the link, hold
  // it. Still require the OTP step rather than treating that as verification.
  await issueVerificationOtp(user.id, user.email, user.name ?? "there")

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name ?? "User",
    role: user.role as "ADMIN" | "USER" | "GUEST",
  })

  redirect("/")
}
