"use server"

import bcrypt from "bcryptjs"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { createSession, requireSession, requireWorkspace } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import { sendExternalEmail } from "@/lib/email-delivery"
import { decryptSecret, encryptSecret } from "@/lib/secure-store"
import { validatePassword } from "@/lib/password-policy"
import { getAuditRequestContext, recordAuditEvent, recordRequestAuditEvent } from "@/lib/audit"
import {
  buildTotpUri,
  createOpaqueToken,
  generateRecoveryCodes,
  generateTotpSecret,
  hashOpaqueToken,
  hashRecoveryCode,
  MFA_CHALLENGE_COOKIE,
  MFA_CHALLENGE_TTL_MINUTES,
  MFA_ENROLLMENT_TTL_MINUTES,
  normalizeRecoveryCode,
  verifyTotpCode,
} from "@/lib/mfa"
import { clearIpAttempts, registerSuccessfulLogin } from "@/lib/login-throttle"

const PASSWORD_RESET_TTL_MINUTES = 30
const MAX_MFA_CHALLENGE_ATTEMPTS = 5

function appBaseUrl() {
  const configured = process.env.NEXT_PUBLIC_APP_URL ?? process.env.AUTH_URL ?? "http://localhost:3000"
  try {
    return new URL(configured).origin
  } catch {
    return "http://localhost:3000"
  }
}

function deleteMfaChallengeCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  cookieStore.delete(MFA_CHALLENGE_COOKIE)
}

export async function getSecuritySettingsAction() {
  const session = await requireSession()
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { password: true, mfaEnabledAt: true, mfaRecoveryCodeHashes: true },
  })

  return {
    credentialPasswordEnabled: Boolean(user?.password),
    mfaEnabled: Boolean(user?.mfaEnabledAt),
    recoveryCodesRemaining: user?.mfaRecoveryCodeHashes.length ?? 0,
  }
}

export async function beginMfaEnrollmentAction(input: { currentPassword?: string }) {
  const session = await requireSession()
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: { id: true, email: true, password: true },
  })
  if (!user) return { success: false as const, error: "Your account no longer exists." }

  if (user.password) {
    const validPassword = Boolean(input.currentPassword) && await bcrypt.compare(input.currentPassword!, user.password)
    if (!validPassword) {
      await recordRequestAuditEvent({ action: "auth.mfa_enrollment_denied", actorUserId: user.id, actorEmail: user.email, metadata: { reason: "invalid_password" } })
      return { success: false as const, error: "Enter your current password to enable MFA." }
    }
  }

  const secret = generateTotpSecret()
  const expiresAt = new Date(Date.now() + MFA_ENROLLMENT_TTL_MINUTES * 60_000)
  await prisma.mfaEnrollment.upsert({
    where: { userId: user.id },
    update: { secretCipher: encryptSecret(secret), expiresAt },
    create: { userId: user.id, secretCipher: encryptSecret(secret), expiresAt },
  })

  await recordRequestAuditEvent({ action: "auth.mfa_enrollment_started", actorUserId: user.id, actorEmail: user.email })
  return {
    success: true as const,
    secret,
    uri: buildTotpUri(secret, user.email),
    expiresAt: expiresAt.toISOString(),
  }
}

export async function confirmMfaEnrollmentAction(code: string) {
  const session = await requireSession()
  const enrollment = await prisma.mfaEnrollment.findUnique({ where: { userId: session.id } })
  if (!enrollment || enrollment.expiresAt <= new Date()) {
    if (enrollment) await prisma.mfaEnrollment.delete({ where: { userId: session.id } })
    return { success: false as const, error: "Your MFA setup expired. Start again." }
  }

  const secret = decryptSecret(enrollment.secretCipher)
  if (!secret || !verifyTotpCode(secret, code)) {
    await recordRequestAuditEvent({ action: "auth.mfa_enrollment_failed", actorUserId: session.id, actorEmail: session.email })
    return { success: false as const, error: "That verification code is not valid. Check your authenticator and try again." }
  }

  const recoveryCodes = generateRecoveryCodes()
  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.id },
      data: {
        mfaSecretCipher: enrollment.secretCipher,
        mfaEnabledAt: new Date(),
        mfaLastVerifiedAt: new Date(),
        mfaRecoveryCodeHashes: recoveryCodes.map(hashRecoveryCode),
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.mfaEnrollment.delete({ where: { userId: session.id } }),
  ])

  await recordRequestAuditEvent({ action: "auth.mfa_enabled", actorUserId: session.id, actorEmail: session.email })
  revalidatePath("/settings")
  return { success: true as const, recoveryCodes }
}

export async function disableMfaAction(input: { currentPassword?: string; code: string }) {
  const session = await requireSession()
  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      password: true,
      mfaSecretCipher: true,
      mfaRecoveryCodeHashes: true,
    },
  })
  if (!user?.mfaSecretCipher) return { success: false as const, error: "MFA is not enabled for this account." }

  if (user.password && (!input.currentPassword || !await bcrypt.compare(input.currentPassword, user.password))) {
    return { success: false as const, error: "Your current password is incorrect." }
  }

  const secret = decryptSecret(user.mfaSecretCipher)
  const recoveryHash = hashRecoveryCode(input.code)
  const validCode = Boolean(secret && verifyTotpCode(secret, input.code)) || user.mfaRecoveryCodeHashes.includes(recoveryHash)
  if (!validCode) {
    await recordRequestAuditEvent({ action: "auth.mfa_disable_denied", actorUserId: user.id, actorEmail: user.email })
    return { success: false as const, error: "Enter a valid authenticator or recovery code." }
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: {
        mfaSecretCipher: null,
        mfaEnabledAt: null,
        mfaLastVerifiedAt: null,
        mfaRecoveryCodeHashes: [],
        sessionVersion: { increment: 1 },
      },
    }),
    prisma.mfaEnrollment.deleteMany({ where: { userId: user.id } }),
    prisma.mfaLoginChallenge.deleteMany({ where: { userId: user.id } }),
  ])

  await recordRequestAuditEvent({ action: "auth.mfa_disabled", actorUserId: user.id, actorEmail: user.email })
  revalidatePath("/settings")
  return { success: true as const }
}

export async function completeMfaLoginAction(code: string) {
  const cookieStore = await cookies()
  const rawToken = cookieStore.get(MFA_CHALLENGE_COOKIE)?.value
  if (!rawToken) return { success: false as const, error: "Your MFA sign-in session expired. Start again." }

  const challenge = await prisma.mfaLoginChallenge.findUnique({
    where: { tokenHash: hashOpaqueToken(rawToken) },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          sessionVersion: true,
          mfaSecretCipher: true,
          mfaRecoveryCodeHashes: true,
        },
      },
    },
  })

  if (!challenge || challenge.usedAt || challenge.expiresAt <= new Date() || !challenge.user.mfaSecretCipher) {
    if (challenge) await prisma.mfaLoginChallenge.delete({ where: { id: challenge.id } })
    deleteMfaChallengeCookie(cookieStore)
    return { success: false as const, error: "Your MFA sign-in session expired. Start again." }
  }

  const secret = decryptSecret(challenge.user.mfaSecretCipher)
  const recoveryHash = hashRecoveryCode(code)
  const usedRecoveryCode = challenge.user.mfaRecoveryCodeHashes.includes(recoveryHash)
  const valid = Boolean(secret && verifyTotpCode(secret, code)) || usedRecoveryCode
  const context = await getAuditRequestContext()

  if (!valid) {
    const attempts = challenge.attempts + 1
    if (attempts >= MAX_MFA_CHALLENGE_ATTEMPTS) {
      await prisma.mfaLoginChallenge.delete({ where: { id: challenge.id } })
      deleteMfaChallengeCookie(cookieStore)
    } else {
      await prisma.mfaLoginChallenge.update({ where: { id: challenge.id }, data: { attempts } })
    }
    await recordAuditEvent({
      action: "auth.mfa_challenge_failed",
      actorUserId: challenge.user.id,
      actorEmail: challenge.user.email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { attempts },
    })
    return { success: false as const, error: attempts >= MAX_MFA_CHALLENGE_ATTEMPTS ? "Too many invalid codes. Start signing in again." : "That verification code is not valid." }
  }

  // Claim the challenge atomically. Without the conditional update, two
  // simultaneous requests could both observe usedAt=null and reuse the same
  // recovery code or TOTP challenge.
  const challengeConsumed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.mfaLoginChallenge.updateMany({
      where: { id: challenge.id, usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() },
    })
    if (claimed.count !== 1) return false

    if (usedRecoveryCode) {
      const recoveryCodeConsumed = await tx.user.updateMany({
        where: { id: challenge.user.id, mfaRecoveryCodeHashes: { has: recoveryHash } },
        data: { mfaRecoveryCodeHashes: challenge.user.mfaRecoveryCodeHashes.filter((hash) => hash !== recoveryHash) },
      })
      if (recoveryCodeConsumed.count !== 1) return false
    } else {
      await tx.user.update({ where: { id: challenge.user.id }, data: { mfaLastVerifiedAt: new Date() } })
    }

    return true
  })

  if (!challengeConsumed) {
    deleteMfaChallengeCookie(cookieStore)
    return { success: false as const, error: "That MFA sign-in session has already been used. Start again." }
  }

  await registerSuccessfulLogin(challenge.user.id)
  if (context.ip) clearIpAttempts(context.ip)
  deleteMfaChallengeCookie(cookieStore)
  await createSession({
    id: challenge.user.id,
    email: challenge.user.email,
    name: challenge.user.name ?? "User",
    role: challenge.user.role,
    sessionVersion: challenge.user.sessionVersion,
  })
  await recordAuditEvent({
    action: usedRecoveryCode ? "auth.login_recovery_code" : "auth.login_mfa_succeeded",
    actorUserId: challenge.user.id,
    actorEmail: challenge.user.email,
    ip: context.ip,
    userAgent: context.userAgent,
  })

  return { success: true as const }
}

export async function requestPasswordResetAction(emailInput: string) {
  const email = emailInput.trim().toLowerCase()
  const genericResult = { success: true as const, message: "If that account can use password sign-in, a reset link is on its way." }
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return genericResult

  const context = await getAuditRequestContext()
  const resetWindowStart = new Date(Date.now() - 15 * 60_000)
  const recentRequests = await prisma.auditLog.count({
    where: {
      action: "auth.password_reset_requested",
      createdAt: { gte: resetWindowStart },
      OR: [
        { actorEmail: email },
        ...(context.ip ? [{ ip: context.ip }] : []),
      ],
    },
  })
  if (recentRequests >= 5) {
    await recordAuditEvent({
      action: "auth.password_reset_rate_limited",
      actorEmail: email,
      ip: context.ip,
      userAgent: context.userAgent,
      metadata: { windowMinutes: 15 },
    })
    return genericResult
  }

  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true } })
  if (!user) {
    await recordAuditEvent({ action: "auth.password_reset_requested", actorEmail: email, ip: context.ip, userAgent: context.userAgent, metadata: { knownAccount: false } })
    return genericResult
  }

  const token = createOpaqueToken()
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000)
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: hashOpaqueToken(token), expiresAt, requestedIp: context.ip } }),
  ])

  const url = new URL("/reset-password", appBaseUrl())
  url.searchParams.set("token", token)
  const delivery = await sendExternalEmail({
    to: user.email,
    subject: "Reset your Spagad password",
    text: `Use this secure link to reset your password: ${url.toString()}\n\nThe link expires in ${PASSWORD_RESET_TTL_MINUTES} minutes. If you did not request it, you can ignore this email.`,
    html: passwordResetEmailHtml(user.name ?? "there", url.toString()),
  })

  await recordAuditEvent({
    action: "auth.password_reset_requested",
    actorUserId: user.id,
    actorEmail: user.email,
    ip: context.ip,
    userAgent: context.userAgent,
    metadata: { delivery: delivery.success ? "sent" : delivery.skipped ? "skipped" : "failed" },
  })
  return genericResult
}

export async function resetPasswordAction(input: { token: string; password: string }) {
  const token = input.token.trim()
  if (!token) return { success: false as const, error: "This reset link is invalid or has expired." }

  const now = new Date()

  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashOpaqueToken(token) },
    include: { user: { select: { id: true, email: true, name: true } } },
  })
  if (!reset || reset.usedAt || reset.expiresAt <= now) {
    return { success: false as const, error: "This reset link is invalid or has expired." }
  }

  const policyError = validatePassword(input.password, { email: reset.user.email, name: reset.user.name ?? undefined })
  if (policyError) return { success: false as const, error: policyError }

  const hash = await bcrypt.hash(input.password, 12)
  // Claim the token as part of the same transaction as the password update so
  // concurrent submissions cannot both use a one-time reset link.
  const tokenConsumed = await prisma.$transaction(async (tx) => {
    const claimed = await tx.passwordResetToken.updateMany({
      where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    })
    if (claimed.count !== 1) return false

    await tx.user.update({
      where: { id: reset.user.id },
      data: {
        password: hash,
        passwordChangedAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
        sessionVersion: { increment: 1 },
      },
    })
    await tx.passwordResetToken.deleteMany({ where: { userId: reset.user.id, id: { not: reset.id } } })
    await tx.mfaLoginChallenge.deleteMany({ where: { userId: reset.user.id } })
    return true
  })

  if (!tokenConsumed) return { success: false as const, error: "This reset link is invalid or has expired." }
  await recordRequestAuditEvent({ action: "auth.password_reset_completed", actorUserId: reset.user.id, actorEmail: reset.user.email })
  return { success: true as const }
}

export async function getWorkspaceAuditLogsAction(limit = 100) {
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "manage_users")) return []

  const safeLimit = Math.max(1, Math.min(limit, 200))
  return prisma.auditLog.findMany({
    where: {
      OR: [
        { workspaceId: session.workspaceId },
        { workspaceId: null, actor: { workspaceMemberships: { some: { workspaceId: session.workspaceId } } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: safeLimit,
    select: {
      id: true,
      action: true,
      actorEmail: true,
      targetType: true,
      targetId: true,
      ip: true,
      metadata: true,
      createdAt: true,
    },
  })
}

function passwordResetEmailHtml(name: string, url: string) {
  const safeName = name.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return `<div style="font-family:Arial,sans-serif;background:#09111f;color:#f8fafc;padding:32px"><div style="max-width:560px;margin:auto;background:#121e37;border:1px solid rgba(0,212,255,.25);border-radius:16px;padding:28px"><p style="color:#00d4ff;font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase">Security request</p><h1 style="font-size:24px">Reset your password</h1><p>Hi ${safeName}, use the secure link below to choose a new password. It expires in ${PASSWORD_RESET_TTL_MINUTES} minutes.</p><p style="margin:24px 0"><a href="${url}" style="background:#00d4ff;color:#00111a;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:700">Reset password</a></p><p style="font-size:12px;color:#94a3b8">If you did not request this, you can safely ignore this email.</p></div></div>`
}
