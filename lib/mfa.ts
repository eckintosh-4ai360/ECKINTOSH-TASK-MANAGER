import crypto from "node:crypto"

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
export const MFA_CHALLENGE_COOKIE = "spagad_mfa_challenge"
export const MFA_CHALLENGE_TTL_MINUTES = 10
export const MFA_ENROLLMENT_TTL_MINUTES = 15
export const MFA_RECOVERY_CODE_COUNT = 10

export function hashOpaqueToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex")
}

export function createOpaqueToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("base64url")
}

export function generateTotpSecret(byteLength = 20) {
  return base32Encode(crypto.randomBytes(byteLength))
}

export function buildTotpUri(secret: string, accountName: string, issuer = "Spagad") {
  const label = `${issuer}:${accountName}`
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: "6", period: "30" })
  return `otpauth://totp/${encodeURIComponent(label)}?${params.toString()}`
}

export function verifyTotpCode(secret: string, code: string, now = Date.now(), window = 1) {
  const normalized = code.replace(/\s|-/g, "")
  if (!/^\d{6}$/.test(normalized)) return false

  const expected = Buffer.from(normalized)
  for (let offset = -window; offset <= window; offset += 1) {
    const candidate = Buffer.from(generateTotpCode(secret, now + offset * 30_000))
    if (candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected)) return true
  }
  return false
}

export function generateTotpCode(secret: string, now = Date.now(), periodSeconds = 30, digits = 6) {
  const counter = Math.floor(now / 1000 / periodSeconds)
  const counterBuffer = Buffer.alloc(8)
  counterBuffer.writeBigUInt64BE(BigInt(counter))
  const digest = crypto.createHmac("sha1", base32Decode(secret)).update(counterBuffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = ((digest[offset] & 0x7f) << 24)
    | (digest[offset + 1] << 16)
    | (digest[offset + 2] << 8)
    | digest[offset + 3]

  return String(binary % (10 ** digits)).padStart(digits, "0")
}

export function generateRecoveryCodes(count = MFA_RECOVERY_CODE_COUNT) {
  return Array.from({ length: count }, () => {
    const value = crypto.randomBytes(5).toString("hex").toUpperCase()
    return `${value.slice(0, 5)}-${value.slice(5)}`
  })
}

export function hashRecoveryCode(code: string) {
  return hashOpaqueToken(normalizeRecoveryCode(code))
}

export function normalizeRecoveryCode(code: string) {
  return code.replace(/[^a-z0-9]/gi, "").toUpperCase()
}

function base32Encode(buffer: Buffer) {
  let bits = 0
  let value = 0
  let output = ""

  for (const byte of buffer) {
    value = (value << 8) | byte
    bits += 8
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_ALPHABET[(value << (5 - bits)) & 31]
  return output
}

function base32Decode(input: string) {
  const normalized = input.toUpperCase().replace(/=|\s/g, "")
  let bits = 0
  let value = 0
  const bytes: number[] = []

  for (const character of normalized) {
    const index = BASE32_ALPHABET.indexOf(character)
    if (index < 0) throw new Error("Invalid Base32 secret")
    value = (value << 5) | index
    bits += 5
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255)
      bits -= 8
    }
  }
  return Buffer.from(bytes)
}
