"use server"

import bcrypt from "bcryptjs"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { createSession, requireWorkspace } from "@/lib/auth"
import { validatePassword } from "@/lib/password-policy"
import { issueVerificationOtp } from "@/lib/email-verification"
import { validateInput, createUserSchema, updateUserRoleSchema } from "@/lib/validation"
import { hasPermission } from "@/lib/rbac"
import { recordRequestAuditEvent } from "@/lib/audit"
import { createOpaqueToken, hashOpaqueToken, MFA_CHALLENGE_COOKIE, MFA_CHALLENGE_TTL_MINUTES } from "@/lib/mfa"
import {
  clearIpAttempts,
  describeLockout,
  isLocked,
  recordIpAttempt,
  registerFailedAttempt,
  registerSuccessfulLogin,
} from "@/lib/login-throttle"

// A bcrypt hash of a random value. Comparing against it when no account exists
// keeps the "no such user" path as slow as the "wrong password" path, so
// response timing cannot be used to enumerate valid addresses.
const DUMMY_HASH = "$2b$12$6Nc3bDSnZtv4GE9KIQkWUuJFCSfLPaYXdLN2RTiIgNyEK.JPl6IuC"

const GENERIC_LOGIN_ERROR = "Invalid email or password"

async function requireWorkspaceAdmin() {
  const session = await requireWorkspace()
  if (!hasPermission(session.role, "manage_users")) redirect("/")
  return session
}

async function getClientIp() {
  const headerList = await headers()

  const forwarded = headerList.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0]!.trim()

  return headerList.get("x-real-ip") ?? "unknown"
}

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string | null)?.trim().toLowerCase()
  const password = formData.get("password") as string | null

  if (!email || !password) {
    await recordRequestAuditEvent({ action: "auth.login_failed", actorEmail: email, metadata: { reason: "missing_credentials" } })
    return { error: "Email and password are required" }
  }

  const ip = await getClientIp()
  if (!recordIpAttempt(ip)) {
    await recordRequestAuditEvent({ action: "auth.login_rate_limited", actorEmail: email })
    return { error: "Too many sign-in attempts from this network. Please wait a minute and try again." }
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.password) {
    // Burn the same time a real comparison would take.
    await bcrypt.compare(password, DUMMY_HASH)
    await recordRequestAuditEvent({ action: "auth.login_failed", actorEmail: email, metadata: { reason: "invalid_credentials" } })
    return { error: GENERIC_LOGIN_ERROR }
  }

  if (isLocked(user)) {
    await recordRequestAuditEvent({ action: "auth.login_locked", actorUserId: user.id, actorEmail: user.email })
    return { error: describeLockout(user.lockedUntil!) }
  }

  const valid = await bcrypt.compare(password, user.password)

  if (!valid) {
    const outcome = await registerFailedAttempt(user.id, user.failedLoginAttempts)

    if (outcome.locked) {
      await recordRequestAuditEvent({ action: "auth.login_locked", actorUserId: user.id, actorEmail: user.email, metadata: { reason: "failed_password" } })
      return { error: `Too many failed sign-in attempts. This account is locked for 15 minutes.` }
    }

    await recordRequestAuditEvent({ action: "auth.login_failed", actorUserId: user.id, actorEmail: user.email, metadata: { reason: "invalid_credentials" } })
    return { error: GENERIC_LOGIN_ERROR }
  }

  if (user.mfaEnabledAt && user.mfaSecretCipher) {
    const token = createOpaqueToken()
    const expiresAt = new Date(Date.now() + MFA_CHALLENGE_TTL_MINUTES * 60_000)
    await prisma.$transaction([
      prisma.mfaLoginChallenge.deleteMany({ where: { userId: user.id, usedAt: null } }),
      prisma.mfaLoginChallenge.create({ data: { userId: user.id, tokenHash: hashOpaqueToken(token), expiresAt, requestedIp: ip } }),
    ])

    const cookieStore = await cookies()
    cookieStore.set(MFA_CHALLENGE_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      expires: expiresAt,
      path: "/",
    })
    await recordRequestAuditEvent({ action: "auth.mfa_challenge_issued", actorUserId: user.id, actorEmail: user.email })
    return { mfaRequired: true as const }
  }

  await registerSuccessfulLogin(user.id)
  clearIpAttempts(ip)

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name ?? "User",
    role: user.role as "ADMIN" | "USER" | "GUEST",
    sessionVersion: user.sessionVersion,
  })

  await recordRequestAuditEvent({ action: "auth.login_succeeded", actorUserId: user.id, actorEmail: user.email })

  redirect("/")
}

// Logout is handled by the GET /logout Route Handler (app/logout/route.ts)
// which deletes the cookie and redirects to /login.
// No Server Action needed for logout.

// ─── Admin: Create User ───────────────────────────────────────────────────────
export async function createUserAction(formData: FormData) {
  const admin = await requireWorkspaceAdmin()

  const parsed = validateInput(createUserSchema, {
    name: (formData.get("name") as string | null)?.trim(),
    email: (formData.get("email") as string | null)?.trim().toLowerCase(),
    password: formData.get("password") as string | null,
    role: (formData.get("role") as string | null) || "USER",
  })
  if (!parsed.success) return { error: parsed.error }
  const { name, email, password, role } = parsed.data

  const policyError = validatePassword(password, { email, name })
  if (policyError) return { error: policyError }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: "A user with this email already exists" }
  }

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      // Platform-wide ADMIN is reserved for the bootstrap/super-admin account.
      // Workspace administrators are represented by WorkspaceMember.role.
      role: "USER",
    },
  })

  await prisma.workspaceMember.create({
    data: {
      workspaceId: admin.workspaceId,
      userId: user.id,
      role: role === "ADMIN" ? "ADMIN" : role === "GUEST" ? "VIEWER" : "MEMBER",
    },
  })

  await recordRequestAuditEvent({
    action: "workspace.member_created",
    actorUserId: admin.id,
    actorEmail: admin.email,
    workspaceId: admin.workspaceId,
    targetType: "user",
    targetId: user.id,
    metadata: { role },
  })

  // Credential accounts haven't proven control of the address the way GitHub
  // OAuth does, so send them a code to verify it.
  await issueVerificationOtp(user.id, user.email, user.name ?? "there")

  revalidatePath("/admin/users")
  return { success: true }
}

// ─── Admin: List Users ────────────────────────────────────────────────────────
export async function getUsers() {
  const admin = await requireWorkspaceAdmin()
  const users = await prisma.user.findMany({
    where: { workspaceMemberships: { some: { workspaceId: admin.workspaceId } } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lockedUntil: true,
      lastLoginAt: true,
      githubLogin: true,
      workspaceMemberships: { where: { workspaceId: admin.workspaceId }, select: { role: true } },
    },
    orderBy: { createdAt: "desc" },
  })

  return users.map(({ workspaceMemberships, ...user }) => ({
    ...user,
    role: workspaceMemberships[0]?.role === "VIEWER" ? "GUEST" : workspaceMemberships[0]?.role === "MEMBER" ? "USER" : "ADMIN",
  }))
}

// ─── Admin: Change Role ───────────────────────────────────────────────────────
export async function updateUserRoleAction(userId: string, role: string) {
  const admin = await requireWorkspaceAdmin()

  const parsed = validateInput(updateUserRoleSchema, { userId, role })
  if (!parsed.success) return { error: parsed.error }
  const validated = parsed.data

  if (admin.id === validated.userId && validated.role !== "ADMIN") {
    return { error: "You cannot remove your own admin role" }
  }

  const target = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: admin.workspaceId, userId: validated.userId } },
    select: { role: true },
  })
  if (!target) return { error: "User is not a member of the active workspace" }

  // Never let the workspace end up with no administrator.
  if (["OWNER", "ADMIN"].includes(target.role) && validated.role !== "ADMIN") {
    const adminCount = await prisma.workspaceMember.count({ where: { workspaceId: admin.workspaceId, role: { in: ["OWNER", "ADMIN"] } } })
    if (adminCount <= 1) {
      return { error: "This is the only admin. Promote someone else first." }
    }
  }

  await prisma.workspaceMember.update({
    where: { workspaceId_userId: { workspaceId: admin.workspaceId, userId: validated.userId } },
    data: { role: validated.role === "ADMIN" ? "ADMIN" : validated.role === "GUEST" ? "VIEWER" : "MEMBER" },
  })

  await recordRequestAuditEvent({
    action: "workspace.member_role_changed",
    actorUserId: admin.id,
    actorEmail: admin.email,
    workspaceId: admin.workspaceId,
    targetType: "user",
    targetId: validated.userId,
    metadata: { role: validated.role },
  })

  // getSession() re-reads the role on every request, so this takes effect on
  // the target's next page load rather than when their cookie expires.
  revalidatePath("/admin/users")
  return { success: true }
}

// ─── Admin: Unlock a locked-out account ───────────────────────────────────────
export async function unlockUserAction(userId: string): Promise<{ success: true } | { error: string }> {
  const admin = await requireWorkspaceAdmin()
  const member = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: admin.workspaceId, userId } }, select: { userId: true } })
  if (!member) return { error: "User is not a member of the active workspace." }

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    })
  } catch {
    return { error: "That user no longer exists." }
  }

  revalidatePath("/admin/users")
  await recordRequestAuditEvent({
    action: "workspace.member_unlocked",
    actorUserId: admin.id,
    actorEmail: admin.email,
    workspaceId: admin.workspaceId,
    targetType: "user",
    targetId: userId,
  })
  return { success: true }
}

// ─── Admin: Delete User ───────────────────────────────────────────────────────
export async function deleteUserAction(userId: string) {
  const admin = await requireWorkspaceAdmin()
  if (admin.id === userId) {
    return { error: "You cannot delete your own account" }
  }

  const target = await prisma.workspaceMember.findUnique({ where: { workspaceId_userId: { workspaceId: admin.workspaceId, userId } }, select: { role: true } })
  if (!target) return { error: "User not found" }

  if (["OWNER", "ADMIN"].includes(target.role)) {
    const adminCount = await prisma.workspaceMember.count({ where: { workspaceId: admin.workspaceId, role: { in: ["OWNER", "ADMIN"] } } })
    if (adminCount <= 1) {
      return { error: "This is the only admin. Promote someone else first." }
    }
  }

  await prisma.workspaceMember.delete({ where: { workspaceId_userId: { workspaceId: admin.workspaceId, userId } } })
  await recordRequestAuditEvent({
    action: "workspace.member_removed",
    actorUserId: admin.id,
    actorEmail: admin.email,
    workspaceId: admin.workspaceId,
    targetType: "user",
    targetId: userId,
  })
  revalidatePath("/admin/users")
  return { success: true }
}
