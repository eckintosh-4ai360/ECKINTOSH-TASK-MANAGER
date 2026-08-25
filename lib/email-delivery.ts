import nodemailer from "nodemailer"
import prisma from "@/lib/prisma"
import { decryptSecret } from "@/lib/secure-store"

export type ExternalEmailPayload = {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string | null
}

export type EmailProvider = "gmail" | "smtp"

export type EmailDeliveryConfig = {
  provider: EmailProvider
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  fromEmail: string
  fromName: string
  source: "database" | "environment"
}

export type EmailSendResult = {
  success: boolean
  skipped: boolean
  error?: string
  provider?: EmailProvider
  messageId?: string
}

export const EMAIL_SETTINGS_ID = "singleton"

export const GMAIL_DEFAULTS = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
} as const

// ─── Transport cache ─────────────────────────────────────────────────────────
// Keyed on the connection details so a settings change swaps the transport
// automatically instead of reusing a stale authenticated connection.

let cachedTransporter: nodemailer.Transporter | null = null
let cachedTransporterKey: string | null = null

function transportKey(config: EmailDeliveryConfig) {
  return [config.host, config.port, config.secure, config.username, config.password].join("|")
}

function getTransporter(config: EmailDeliveryConfig) {
  const key = transportKey(config)

  if (cachedTransporter && cachedTransporterKey === key) {
    return cachedTransporter
  }

  cachedTransporter?.close()
  cachedTransporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: {
      user: config.username,
      pass: config.password,
    },
  })
  cachedTransporterKey = key

  return cachedTransporter
}

/** Call after saving or clearing settings so the next send re-reads them. */
export function resetEmailTransport() {
  cachedTransporter?.close()
  cachedTransporter = null
  cachedTransporterKey = null
}

// ─── Config resolution ───────────────────────────────────────────────────────

function getEnvConfig(): EmailDeliveryConfig | null {
  const host = process.env.SMTP_HOST
  const username = process.env.SMTP_USER
  const password = process.env.SMTP_PASSWORD
  const fromEmail = process.env.NOTIFICATION_FROM_EMAIL

  if (!host || !username || !password || !fromEmail) return null

  const port = Number(process.env.SMTP_PORT ?? 587)

  return {
    provider: host.includes("gmail") ? "gmail" : "smtp",
    host,
    port,
    secure: port === 465 || process.env.SMTP_SECURE === "true",
    username,
    password,
    fromEmail,
    fromName: process.env.NOTIFICATION_FROM_NAME ?? "Spagad Notifications",
    source: "environment",
  }
}

/**
 * Admin-managed settings win; environment variables are the fallback so an
 * existing deployment keeps working before anyone opens the settings page.
 */
export async function getEmailDeliveryConfig(): Promise<EmailDeliveryConfig | null> {
  try {
    const record = await prisma.emailSetting.findUnique({ where: { id: EMAIL_SETTINGS_ID } })

    if (record?.enabled) {
      const password = decryptSecret(record.passwordCipher)

      if (!password) {
        console.error(
          "[email] Stored SMTP password could not be decrypted — the encryption key changed. Re-enter it under Settings → Email Delivery.",
        )
      } else {
        return {
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
      }
    }
  } catch (error) {
    console.error("[email] Failed to read email settings from the database:", error)
  }

  return getEnvConfig()
}

export async function hasExternalEmailDeliveryConfig() {
  return (await getEmailDeliveryConfig()) !== null
}

function formatFrom(config: EmailDeliveryConfig) {
  return `${config.fromName} <${config.fromEmail}>`
}

// ─── Sending ─────────────────────────────────────────────────────────────────

export async function sendExternalEmail(payload: ExternalEmailPayload): Promise<EmailSendResult> {
  const config = await getEmailDeliveryConfig()

  if (!config) {
    return {
      success: false,
      skipped: true,
      error: "Email delivery is not configured. An admin can add credentials under Settings → Email Delivery.",
    }
  }

  return sendWithConfig(config, payload)
}

/** Used by the settings page to test credentials before they are saved. */
export async function sendWithConfig(
  config: EmailDeliveryConfig,
  payload: ExternalEmailPayload,
): Promise<EmailSendResult> {
  try {
    const result = await getTransporter(config).sendMail({
      from: formatFrom(config),
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      replyTo: payload.replyTo ?? undefined,
    })

    return {
      success: true,
      skipped: false,
      provider: config.provider,
      messageId: result.messageId,
    }
  } catch (error) {
    return {
      success: false,
      skipped: false,
      error: describeSmtpError(error),
    }
  }
}

export async function verifyEmailConfig(config: EmailDeliveryConfig) {
  try {
    await getTransporter(config).verify()
    return { success: true as const }
  } catch (error) {
    return { success: false as const, error: describeSmtpError(error) }
  }
}

/**
 * Nodemailer's raw errors are terse. Gmail in particular fails in two very
 * common, very fixable ways, so name them explicitly.
 */
function describeSmtpError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const code = (error as { code?: string })?.code

  if (/invalid login|username and password not accepted|535/i.test(message)) {
    return "The mail server rejected these credentials. For Gmail you must use a 16-character App Password (not your account password), which requires 2-Step Verification to be enabled."
  }

  if (/application-specific password/i.test(message)) {
    return "Gmail requires an App Password for SMTP. Enable 2-Step Verification, then create one at myaccount.google.com/apppasswords."
  }

  if (code === "ETIMEDOUT" || code === "ECONNREFUSED" || /timed out/i.test(message)) {
    return "Could not reach the mail server. Check the host and port — and that outbound SMTP is not blocked by your host."
  }

  if (code === "EDNS" || /getaddrinfo/i.test(message)) {
    return "The mail server hostname could not be resolved. Check the SMTP host."
  }

  return message
}
