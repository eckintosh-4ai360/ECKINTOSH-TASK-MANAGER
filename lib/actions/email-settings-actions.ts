"use server"

import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { requireSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import { encryptSecret, decryptSecret } from "@/lib/secure-store"
import {
  EMAIL_SETTINGS_ID,
  GMAIL_DEFAULTS,
  type EmailDeliveryConfig,
  type EmailProvider,
  resetEmailTransport,
  sendWithConfig,
  verifyEmailConfig,
} from "@/lib/email-delivery"
import type { EmailSettingsView } from "@/lib/settings"
import { readEmailSettings } from "@/lib/email-settings"

export type EmailSettingsInput = {
  provider: EmailProvider
  host: string
  port: number
  secure: boolean
  username: string
  /** Omit or leave blank to keep the password already on file. */
  password?: string
  fromEmail: string
  fromName: string
  enabled: boolean
}

type ActionResult<T = unknown> = ({ success: true } & T) | { success: false; error: string }

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// ─── Guard ───────────────────────────────────────────────────────────────────

async function requireEmailAdmin() {
  const session = await requireSession()

  // Outbound mail credentials are workspace-wide infrastructure, so they sit
  // behind the same permission that gates user management.
  if (!hasPermission(session.role, "manage_users")) {
    return { ok: false as const, error: "Only admins can manage email delivery settings." }
  }

  return { ok: true as const, session }
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getEmailSettingsAction(): Promise<EmailSettingsView | null> {
  const guard = await requireEmailAdmin()
  if (!guard.ok) return null

  return readEmailSettings()
}

// ─── Validation ──────────────────────────────────────────────────────────────

function normalize(input: EmailSettingsInput) {
  const provider: EmailProvider = input.provider === "gmail" ? "gmail" : "smtp"

  // Gmail's endpoint is fixed; don't let a typo in the host field break it.
  const host = provider === "gmail" ? GMAIL_DEFAULTS.host : (input.host?.trim() ?? "")
  const port = provider === "gmail" ? GMAIL_DEFAULTS.port : Number(input.port)
  const secure = provider === "gmail" ? GMAIL_DEFAULTS.secure : Boolean(input.secure)

  return {
    provider,
    host,
    port,
    secure,
    username: input.username?.trim().toLowerCase() ?? "",
    fromEmail: input.fromEmail?.trim().toLowerCase() ?? "",
    fromName: input.fromName?.trim() || "Spagad Notifications",
    enabled: Boolean(input.enabled),
  }
}

function validate(values: ReturnType<typeof normalize>, password: string | null) {
  if (!values.host) return "SMTP host is required."
  if (!Number.isInteger(values.port) || values.port < 1 || values.port > 65535) {
    return "SMTP port must be a number between 1 and 65535."
  }
  if (!values.username) return "The SMTP username (your email address) is required."
  if (!EMAIL_PATTERN.test(values.fromEmail)) return "Enter a valid 'from' email address."
  if (!password) return "An SMTP password is required."

  if (values.provider === "gmail") {
    if (!values.username.includes("@")) {
      return "Enter the full Google account address as the username."
    }
    // Google renders app passwords as 4 groups of 4; users often paste the spaces.
    if (password.replace(/\s+/g, "").length !== 16) {
      return "Google App Passwords are 16 characters. Generate one at myaccount.google.com/apppasswords — your normal account password will not work."
    }
  }

  return null
}

function toConfig(values: ReturnType<typeof normalize>, password: string): EmailDeliveryConfig {
  return { ...values, password, source: "database" }
}

async function resolvePassword(input: EmailSettingsInput) {
  const supplied = input.password?.trim()

  // Gmail shows app passwords space-separated; strip so it matches what SMTP wants.
  if (supplied) return supplied.replace(/\s+/g, "")

  const existing = await prisma.emailSetting.findUnique({
    where: { id: EMAIL_SETTINGS_ID },
    select: { passwordCipher: true },
  })

  return existing?.passwordCipher ? decryptSecret(existing.passwordCipher) : null
}

// ─── Write ───────────────────────────────────────────────────────────────────

export async function saveEmailSettingsAction(
  input: EmailSettingsInput,
): Promise<ActionResult<{ settings: EmailSettingsView; verified: boolean; warning?: string }>> {
  const guard = await requireEmailAdmin()
  if (!guard.ok) return { success: false, error: guard.error }

  const values = normalize(input)
  const password = await resolvePassword(input)

  const validationError = validate(values, password)
  if (validationError) return { success: false, error: validationError }

  // Prove the credentials work before persisting them, so a bad save cannot
  // silently disable every notification email in the workspace.
  const verification = await verifyEmailConfig(toConfig(values, password as string))

  if (!verification.success && values.enabled) {
    return { success: false, error: verification.error }
  }

  try {
    await prisma.emailSetting.upsert({
      where: { id: EMAIL_SETTINGS_ID },
      update: {
        ...values,
        passwordCipher: encryptSecret(password as string),
        updatedByEmail: guard.session.email,
      },
      create: {
        id: EMAIL_SETTINGS_ID,
        ...values,
        passwordCipher: encryptSecret(password as string),
        updatedByEmail: guard.session.email,
      },
    })
  } catch (error) {
    console.error("[email-settings] Failed to save:", error)
    return { success: false, error: "Could not save the email settings. Please try again." }
  }

  resetEmailTransport()
  revalidatePath("/settings")

  const settings = await readEmailSettings()

  return {
    success: true,
    settings: settings as EmailSettingsView,
    verified: verification.success,
    warning: verification.success ? undefined : verification.error,
  }
}

export async function sendTestEmailAction(recipient?: string): Promise<ActionResult<{ message: string }>> {
  const guard = await requireEmailAdmin()
  if (!guard.ok) return { success: false, error: guard.error }

  const record = await prisma.emailSetting.findUnique({ where: { id: EMAIL_SETTINGS_ID } })
  if (!record) {
    return { success: false, error: "Save your email settings before sending a test." }
  }

  const password = decryptSecret(record.passwordCipher)
  if (!password) {
    return { success: false, error: "The stored password could not be decrypted. Re-enter it and save again." }
  }

  const to = recipient?.trim().toLowerCase() || guard.session.email
  if (!EMAIL_PATTERN.test(to)) {
    return { success: false, error: "Enter a valid recipient email address." }
  }

  const config: EmailDeliveryConfig = {
    provider: record.provider === "gmail" ? "gmail" : "smtp",
    host: record.host,
    port: record.port,
    secure: record.secure,
    username: record.username,
    password,
    fromEmail: record.fromEmail,
    fromName: record.fromName,
    source: "database",
  }

  const result = await sendWithConfig(config, {
    to,
    subject: "Spagad SRAD — email delivery test",
    text: `This is a test message from Spagad SRAD.\n\nIf you are reading it, outbound email is working. Sent via ${config.host}:${config.port} as ${config.username}.`,
    html: buildTestEmailHtml(config),
  })

  await prisma.emailSetting.update({
    where: { id: EMAIL_SETTINGS_ID },
    data: {
      lastTestedAt: new Date(),
      lastTestStatus: result.success ? "success" : "failed",
      lastTestError: result.success ? null : (result.error?.slice(0, 500) ?? "Unknown error"),
    },
  })

  revalidatePath("/settings")

  if (!result.success) {
    return { success: false, error: result.error ?? "The test email could not be sent." }
  }

  return { success: true, message: `Test email sent to ${to}.` }
}

export async function deleteEmailSettingsAction(): Promise<ActionResult> {
  const guard = await requireEmailAdmin()
  if (!guard.ok) return { success: false, error: guard.error }

  await prisma.emailSetting.deleteMany({ where: { id: EMAIL_SETTINGS_ID } })
  resetEmailTransport()
  revalidatePath("/settings")

  return { success: true }
}

function buildTestEmailHtml(config: EmailDeliveryConfig) {
  return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#09111f;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="background:#121e37;border:1px solid rgba(0,212,255,0.2);border-radius:20px;padding:32px;">
      <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.15em;color:#00d4ff;text-transform:uppercase;font-weight:600;">Delivery test</p>
      <h1 style="margin:0 0 16px;font-size:22px;font-weight:800;color:#f8fafc;">Outbound email is working</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#94a3b8;line-height:1.6;">
        Spagad SRAD sent this through your configured mail server. Notifications, invitations, and reminders will now reach real inboxes.
      </p>
      <div style="background:#1a2a42;border:1px solid rgba(0,212,255,0.1);border-radius:10px;padding:14px 18px;font-family:ui-monospace,monospace;font-size:12px;color:#cbd5e1;">
        <div>host: ${config.host}:${config.port}</div>
        <div>user: ${config.username}</div>
        <div>from: ${config.fromName} &lt;${config.fromEmail}&gt;</div>
      </div>
    </div>
  </div>
</body>
</html>`
}
