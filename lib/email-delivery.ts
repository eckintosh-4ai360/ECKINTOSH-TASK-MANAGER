import nodemailer from "nodemailer"

export type ExternalEmailPayload = {
  to: string
  subject: string
  text: string
  html?: string
  replyTo?: string | null
}

type DeliveryMode = "resend" | "smtp" | null

let smtpTransporter: nodemailer.Transporter | null = null

function getEmailDeliveryMode(): DeliveryMode {
  if (process.env.RESEND_API_KEY && process.env.NOTIFICATION_FROM_EMAIL) {
    return "resend"
  }

  if (
    process.env.SMTP_HOST
    && process.env.SMTP_PORT
    && process.env.SMTP_USER
    && process.env.SMTP_PASSWORD
    && process.env.NOTIFICATION_FROM_EMAIL
  ) {
    return "smtp"
  }

  return null
}

function getFromAddress() {
  const email = process.env.NOTIFICATION_FROM_EMAIL
  const name = process.env.NOTIFICATION_FROM_NAME ?? "Eckintosh Notifications"

  if (!email) return null

  return `${name} <${email}>`
}

function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter

  const port = Number(process.env.SMTP_PORT ?? 587)
  smtpTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465 || process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  })

  return smtpTransporter
}

async function sendWithResend(payload: ExternalEmailPayload) {
  const from = getFromAddress()
  if (!from || !process.env.RESEND_API_KEY) {
    return { success: false, skipped: true, error: "Resend is not configured." }
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [payload.to],
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
      reply_to: payload.replyTo ?? undefined,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    return {
      success: false,
      skipped: false,
      error: `Resend delivery failed: ${response.status} ${errorText}`,
    }
  }

  const data = await response.json()
  return {
    success: true,
    skipped: false,
    provider: "resend" as const,
    messageId: data.id as string | undefined,
  }
}

async function sendWithSmtp(payload: ExternalEmailPayload) {
  const from = getFromAddress()
  if (!from) {
    return { success: false, skipped: true, error: "SMTP is not configured." }
  }

  const transporter = getSmtpTransporter()
  const result = await transporter.sendMail({
    from,
    to: payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html,
    replyTo: payload.replyTo ?? undefined,
  })

  return {
    success: true,
    skipped: false,
    provider: "smtp" as const,
    messageId: result.messageId,
  }
}

export function hasExternalEmailDeliveryConfig() {
  return getEmailDeliveryMode() !== null
}

export async function sendExternalEmail(payload: ExternalEmailPayload) {
  const mode = getEmailDeliveryMode()
  if (!mode) {
    return { success: false, skipped: true, error: "No external email provider is configured." }
  }

  try {
    if (mode === "resend") {
      return await sendWithResend(payload)
    }

    return await sendWithSmtp(payload)
  } catch (error) {
    return {
      success: false,
      skipped: false,
      error: error instanceof Error ? error.message : "External email delivery failed.",
    }
  }
}
