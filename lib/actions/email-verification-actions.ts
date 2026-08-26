"use server"

import { requireSession } from "@/lib/auth"
import { consumeVerificationOtp, isEmailVerified, issueVerificationOtp } from "@/lib/email-verification"

export async function getEmailVerificationStatusAction() {
  const session = await requireSession()
  return isEmailVerified(session.id)
}

export async function sendVerificationOtpAction() {
  const session = await requireSession()

  if (await isEmailVerified(session.id)) {
    return { success: true as const }
  }

  return issueVerificationOtp(session.id, session.email, session.name)
}

export async function verifyEmailOtpAction(code: string) {
  const session = await requireSession()
  return consumeVerificationOtp(session.id, code)
}
