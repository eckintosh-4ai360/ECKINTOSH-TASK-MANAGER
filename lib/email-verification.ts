import crypto from "node:crypto"
import prisma from "@/lib/prisma"
import { sendExternalEmail } from "@/lib/email-delivery"

/**
 * Plain module (not "use server") — issueVerificationOtp is called on behalf
 * of a user who isn't the current session (freshly admin-created, or mid
 * invitation-acceptance), so it can't be a directly callable action.
 */

export const OTP_TTL_MINUTES = 15
export const OTP_MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_SECONDS = 60

function hashCode(code: string) {
  return crypto.createHash("sha256").update(code).digest("hex")
}

function generateCode() {
  // 6 digits, zero-padded — crypto.randomInt is uniform, unlike Math.random.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0")
}

export async function isEmailVerified(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { emailVerified: true } })
  return Boolean(user?.emailVerified)
}

export type IssueOtpResult =
  | { success: true }
  | { success: false; error: string; retryAfterSeconds?: number }

export async function issueVerificationOtp(userId: string, email: string, name: string): Promise<IssueOtpResult> {
  const existing = await prisma.emailVerification.findUnique({ where: { userId } })

  if (existing) {
    const secondsSinceLast = (Date.now() - existing.createdAt.getTime()) / 1000
    if (secondsSinceLast < RESEND_COOLDOWN_SECONDS) {
      return {
        success: false,
        error: "A code was just sent. Please wait before requesting another.",
        retryAfterSeconds: Math.ceil(RESEND_COOLDOWN_SECONDS - secondsSinceLast),
      }
    }
  }

  const code = generateCode()
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000)

  await prisma.emailVerification.upsert({
    where: { userId },
    update: { codeHash: hashCode(code), attempts: 0, expiresAt, createdAt: new Date() },
    create: { userId, codeHash: hashCode(code), expiresAt },
  })

  const result = await sendExternalEmail({
    to: email,
    subject: "Verify your Spagad SRAD email",
    text: `Your verification code is ${code}. It expires in ${OTP_TTL_MINUTES} minutes.`,
    html: buildOtpEmailHtml({ name, code }),
  })

  if (!result.success && !result.skipped) {
    return { success: false, error: result.error ?? "Could not send the verification email." }
  }

  return { success: true }
}

export type VerifyOtpResult =
  | { success: true }
  | { success: false; error: string; attemptsRemaining?: number }

export async function consumeVerificationOtp(userId: string, code: string): Promise<VerifyOtpResult> {
  const record = await prisma.emailVerification.findUnique({ where: { userId } })

  if (!record) {
    return { success: false, error: "No verification code is pending. Request a new one." }
  }

  if (record.expiresAt < new Date()) {
    await prisma.emailVerification.delete({ where: { userId } })
    return { success: false, error: "That code expired. Request a new one." }
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.emailVerification.delete({ where: { userId } })
    return { success: false, error: "Too many incorrect attempts. Request a new code." }
  }

  const normalized = code.trim()
  const matches =
    normalized.length === 6 &&
    crypto.timingSafeEqual(Buffer.from(hashCode(normalized)), Buffer.from(record.codeHash))

  if (!matches) {
    const updated = await prisma.emailVerification.update({
      where: { userId },
      data: { attempts: { increment: 1 } },
    })
    return {
      success: false,
      error: "Incorrect code.",
      attemptsRemaining: Math.max(0, OTP_MAX_ATTEMPTS - updated.attempts),
    }
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { emailVerified: new Date() } }),
    prisma.emailVerification.delete({ where: { userId } }),
  ])

  return { success: true }
}

function buildOtpEmailHtml({ name, code }: { name: string; code: string }) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#09111f;">
  <div style="max-width:480px;margin:0 auto;padding:40px 20px;">
    <div style="background:#121e37;border:1px solid rgba(0,212,255,0.2);border-radius:20px;padding:32px;text-align:center;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.15em;color:#00d4ff;text-transform:uppercase;font-weight:600;">Verify your email</p>
      <p style="margin:0 0 24px;font-size:14px;color:#94a3b8;">Hi ${escapeHtml(name)}, use this code to verify your Spagad SRAD account:</p>
      <div style="font-family:ui-monospace,monospace;font-size:36px;font-weight:800;letter-spacing:0.3em;color:#f8fafc;background:#1a2a42;border:1px solid rgba(0,212,255,0.2);border-radius:12px;padding:20px;margin:0 0 20px;">
        ${code}
      </div>
      <p style="margin:0;font-size:12px;color:#64748b;">This code expires in ${OTP_TTL_MINUTES} minutes. If you didn't request it, you can ignore this email.</p>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}
