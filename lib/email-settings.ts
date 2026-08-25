import prisma from "@/lib/prisma"
import { decryptSecret } from "@/lib/secure-store"
import { EMAIL_SETTINGS_ID } from "@/lib/email-delivery"
import type { EmailSettingsView } from "@/lib/settings"

/**
 * Plain server-side reader — deliberately NOT in a "use server" module, because
 * every export of one becomes a callable endpoint. Callers are responsible for
 * checking that the requester is an admin.
 *
 * Never returns the password, only whether one is on file and decryptable.
 */
export async function readEmailSettings(): Promise<EmailSettingsView | null> {
  const record = await prisma.emailSetting.findUnique({ where: { id: EMAIL_SETTINGS_ID } })
  if (!record) return null

  return {
    provider: record.provider === "gmail" ? "gmail" : "smtp",
    host: record.host,
    port: record.port,
    secure: record.secure,
    username: record.username,
    fromEmail: record.fromEmail,
    fromName: record.fromName,
    enabled: record.enabled,
    hasPassword: Boolean(record.passwordCipher),
    passwordReadable: record.passwordCipher ? decryptSecret(record.passwordCipher) !== null : false,
    lastTestedAt: record.lastTestedAt?.toISOString() ?? null,
    lastTestStatus: record.lastTestStatus,
    lastTestError: record.lastTestError,
    updatedByEmail: record.updatedByEmail,
    updatedAt: record.updatedAt.toISOString(),
  }
}
