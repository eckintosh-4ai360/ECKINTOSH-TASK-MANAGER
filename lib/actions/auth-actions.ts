"use server"

import bcrypt from "bcryptjs"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { createSession, requireAdmin } from "@/lib/auth"
import { validatePassword } from "@/lib/password-policy"
import { issueVerificationOtp } from "@/lib/email-verification"
import { validateInput, createUserSchema, updateUserRoleSchema } from "@/lib/validation"
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
    return { error: "Email and password are required" }
  }

  const ip = await getClientIp()
  if (!recordIpAttempt(ip)) {
    return { error: "Too many sign-in attempts from this network. Please wait a minute and try again." }
  }

  const user = await prisma.user.findUnique({ where: { email } })

  if (!user || !user.password) {
    // Burn the same time a real comparison would take.
    await bcrypt.compare(password, DUMMY_HASH)
    return { error: GENERIC_LOGIN_ERROR }
  }

  if (isLocked(user)) {
    return { error: describeLockout(user.lockedUntil!) }
  }

  const valid = await bcrypt.compare(password, user.password)

  if (!valid) {
    const outcome = await registerFailedAttempt(user.id, user.failedLoginAttempts)

    if (outcome.locked) {
      return { error: `Too many failed sign-in attempts. This account is locked for 15 minutes.` }
    }

    return { error: GENERIC_LOGIN_ERROR }
  }

  await registerSuccessfulLogin(user.id)
  clearIpAttempts(ip)

  await createSession({
    id: user.id,
    email: user.email,
    name: user.name ?? "User",
    role: user.role as "ADMIN" | "USER" | "GUEST",
  })

  redirect("/")
}

// Logout is handled by the GET /logout Route Handler (app/logout/route.ts)
// which deletes the cookie and redirects to /login.
// No Server Action needed for logout.

// ─── Admin: Create User ───────────────────────────────────────────────────────
export async function createUserAction(formData: FormData) {
  await requireAdmin()

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
      role,
    },
  })

  // Credential accounts haven't proven control of the address the way GitHub
  // OAuth does, so send them a code to verify it.
  await issueVerificationOtp(user.id, user.email, user.name ?? "there")

  revalidatePath("/admin/users")
  return { success: true }
}

// ─── Admin: List Users ────────────────────────────────────────────────────────
export async function getUsers() {
  await requireAdmin()
  return prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
      lockedUntil: true,
      lastLoginAt: true,
      githubLogin: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

// ─── Admin: Change Role ───────────────────────────────────────────────────────
export async function updateUserRoleAction(userId: string, role: string) {
  const admin = await requireAdmin()

  const parsed = validateInput(updateUserRoleSchema, { userId, role })
  if (!parsed.success) return { error: parsed.error }
  const validated = parsed.data

  if (admin.id === validated.userId && validated.role !== "ADMIN") {
    return { error: "You cannot remove your own admin role" }
  }

  const target = await prisma.user.findUnique({ where: { id: validated.userId }, select: { role: true } })
  if (!target) return { error: "User not found" }

  // Never let the workspace end up with no administrator.
  if (target.role === "ADMIN" && validated.role !== "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
    if (adminCount <= 1) {
      return { error: "This is the only admin. Promote someone else first." }
    }
  }

  await prisma.user.update({
    where: { id: validated.userId },
    data: { role: validated.role },
  })

  // getSession() re-reads the role on every request, so this takes effect on
  // the target's next page load rather than when their cookie expires.
  revalidatePath("/admin/users")
  return { success: true }
}

// ─── Admin: Unlock a locked-out account ───────────────────────────────────────
export async function unlockUserAction(userId: string): Promise<{ success: true } | { error: string }> {
  await requireAdmin()

  try {
    await prisma.user.update({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    })
  } catch {
    return { error: "That user no longer exists." }
  }

  revalidatePath("/admin/users")
  return { success: true }
}

// ─── Admin: Delete User ───────────────────────────────────────────────────────
export async function deleteUserAction(userId: string) {
  const admin = await requireAdmin()
  if (admin.id === userId) {
    return { error: "You cannot delete your own account" }
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } })
  if (!target) return { error: "User not found" }

  if (target.role === "ADMIN") {
    const adminCount = await prisma.user.count({ where: { role: "ADMIN" } })
    if (adminCount <= 1) {
      return { error: "This is the only admin. Promote someone else first." }
    }
  }

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath("/admin/users")
  return { success: true }
}
