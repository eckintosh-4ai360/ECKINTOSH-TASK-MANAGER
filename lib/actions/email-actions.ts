"use server"

import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { sendExternalEmail } from "@/lib/email-delivery"
import { getPermissionError, hasPermission } from "@/lib/rbac"
import { revalidatePath } from "next/cache"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function buildInternalEmailHtml({
  senderName,
  subject,
  body,
}: {
  senderName: string
  subject: string
  body: string
}) {
  return `
    <div style="font-family:Arial,sans-serif;background:#09111f;color:#f8fafc;padding:24px;">
      <div style="max-width:640px;margin:0 auto;background:#121e37;border:1px solid rgba(0,212,255,0.2);border-radius:16px;padding:24px;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.08em;color:#00d4ff;text-transform:uppercase;">Spagad Email</p>
        <h1 style="margin:0 0 12px;font-size:22px;color:#f8fafc;">${escapeHtml(subject)}</h1>
        <p style="margin:0 0 16px;font-size:13px;color:#94a3b8;">From ${escapeHtml(senderName)}</p>
        <div style="font-size:14px;line-height:1.7;color:#cbd5e1;white-space:pre-wrap;">${escapeHtml(body)}</div>
      </div>
    </div>
  `
}

// Send internal email
export async function sendEmail(formData: FormData) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_email")) {
    return { error: getPermissionError("use_email") }
  }
  const toId = formData.get("toId") as string
  const subject = formData.get("subject") as string
  const body = formData.get("body") as string

  if (!toId || !subject?.trim() || !body?.trim()) {
    return { error: "All fields are required" }
  }

  const recipient = await prisma.user.findUnique({
    where: { id: toId },
    select: {
      email: true,
      name: true,
      notificationPreference: {
        select: { emailEnabled: true },
      },
    },
  })

  if (!recipient) {
    return { error: "Recipient not found" }
  }

  const cleanSubject = subject.trim()
  const cleanBody = body.trim()

  await prisma.internalEmail.create({
    data: { fromId: session.id, toId, subject: cleanSubject, body: cleanBody },
  })

  let externalWarning: string | null = null
  const recipientAllowsExternalEmail = recipient.notificationPreference?.emailEnabled ?? true
  if (recipientAllowsExternalEmail) {
    const deliveryResult = await sendExternalEmail({
      to: recipient.email,
      subject: cleanSubject,
      text: cleanBody,
      html: buildInternalEmailHtml({
        senderName: session.name ?? session.email,
        subject: cleanSubject,
        body: cleanBody,
      }),
      replyTo: session.email,
    })

    if (!deliveryResult.success) {
      externalWarning = deliveryResult.skipped
        ? "Internal email saved. Configure Resend or SMTP to send it to the recipient's real inbox too."
        : `Internal email saved, but external delivery failed: ${deliveryResult.error}`
    }
  }

  // Only revalidate on send so the recipient's inbox updates
  revalidatePath("/emails")
  return { success: true, externalWarning }
}

// Get inbox (emails received by current user)
export async function getInbox() {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_email")) return []
  return prisma.internalEmail.findMany({
    where: { toId: session.id },
    include: { from: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })
}

// Get sent emails
export async function getSentEmails() {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_email")) return []
  return prisma.internalEmail.findMany({
    where: { fromId: session.id },
    include: { to: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
  })
}

// Mark email as read — NO revalidatePath: client state already reflects it
export async function markEmailRead(emailId: string) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_email")) return
  await prisma.internalEmail.updateMany({
    where: { id: emailId, toId: session.id },
    data: { read: true },
  })
  // Intentionally no revalidatePath — prevents page remount that wipes UI state
}

// Delete email — updates local state, no full page revalidation needed
export async function deleteEmail(emailId: string) {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_email")) return
  await prisma.internalEmail.deleteMany({
    where: { id: emailId, OR: [{ fromId: session.id }, { toId: session.id }] },
  })
  // Intentionally no revalidatePath — client removes it from state immediately
}

// Get all users to send email to
export async function getEmailableUsers() {
  const session = await requireSession()
  if (!hasPermission(session.role, "use_email")) return []
  return prisma.user.findMany({
    where: { id: { not: session.id } },
    select: { id: true, name: true, email: true },
    orderBy: { name: "asc" },
  })
}
