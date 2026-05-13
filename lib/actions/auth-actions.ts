"use server"

import bcrypt from "bcryptjs"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { createSession, requireAdmin } from "@/lib/auth"

// ─── Login ────────────────────────────────────────────────────────────────────
export async function loginAction(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.password) {
    return { error: "Invalid email or password" }
  }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) {
    return { error: "Invalid email or password" }
  }

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

  const name = formData.get("name") as string
  const email = formData.get("email") as string
  const password = formData.get("password") as string
  const role = (formData.get("role") as string) || "USER"

  if (!name || !email || !password) {
    return { error: "Name, email, and password are required" }
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { error: "A user with this email already exists" }
  }

  const hashed = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      name,
      email,
      password: hashed,
      role: role as "ADMIN" | "USER" | "GUEST",
    },
  })

  revalidatePath("/admin/users")
  return { success: true }
}

// ─── Admin: List Users ────────────────────────────────────────────────────────
export async function getUsers() {
  await requireAdmin()
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  })
}

// ─── Admin: Delete User ───────────────────────────────────────────────────────
export async function deleteUserAction(userId: string) {
  const admin = await requireAdmin()
  if (admin.id === userId) {
    return { error: "You cannot delete your own account" }
  }

  await prisma.user.delete({ where: { id: userId } })
  revalidatePath("/admin/users")
  return { success: true }
}
