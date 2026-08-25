import crypto from "node:crypto"
import { getSessionSecretValue } from "@/lib/session"

/**
 * AES-256-GCM encryption for secrets that have to be stored in the database
 * and read back in plaintext later — SMTP app passwords, specifically.
 *
 * The key comes from SECRETS_ENCRYPTION_KEY when set, otherwise it is derived
 * from the session secret (which production already refuses to boot without).
 * Rotating either value makes existing ciphertexts undecryptable, and the admin
 * has to re-enter the password — that is intentional and safe.
 */

const ALGORITHM = "aes-256-gcm"
const KEY_LENGTH = 32
const IV_LENGTH = 12
const SCRYPT_SALT = "spagad.secure-store.v1"
const PREFIX = "v1"

let cachedKey: Buffer | null = null

function getKey() {
  if (cachedKey) return cachedKey

  const material = process.env.SECRETS_ENCRYPTION_KEY ?? getSessionSecretValue()
  cachedKey = crypto.scryptSync(material, SCRYPT_SALT, KEY_LENGTH)
  return cachedKey
}

export function encryptSecret(plaintext: string) {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv)
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()])
  const authTag = cipher.getAuthTag()

  return [PREFIX, iv.toString("base64"), authTag.toString("base64"), encrypted.toString("base64")].join(":")
}

/** Returns null when the payload is malformed or was encrypted under a different key. */
export function decryptSecret(payload: string): string | null {
  try {
    const [version, ivPart, tagPart, dataPart] = payload.split(":")
    if (version !== PREFIX || !ivPart || !tagPart || !dataPart) return null

    const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivPart, "base64"))
    decipher.setAuthTag(Buffer.from(tagPart, "base64"))

    return Buffer.concat([
      decipher.update(Buffer.from(dataPart, "base64")),
      decipher.final(),
    ]).toString("utf8")
  } catch {
    return null
  }
}
