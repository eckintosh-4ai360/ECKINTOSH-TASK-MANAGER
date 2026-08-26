/**
 * Server-side password rules. The form's `minLength` is a hint to the browser,
 * not a control — anything that sets a password must call validatePassword.
 */

export const MIN_PASSWORD_LENGTH = 12
export const MAX_PASSWORD_LENGTH = 200

// Cheap stop-list for the passwords that actually show up in credential stuffing.
const COMMON_PASSWORDS = new Set([
  "password", "password1", "password123", "passw0rd",
  "12345678", "123456789", "1234567890", "qwertyuiop",
  "letmein", "welcome", "admin123", "administrator",
  "iloveyou", "changeme", "secret123", "spagad2026",
])

export function validatePassword(password: string, context: { email?: string; name?: string } = {}) {
  if (!password) return "A password is required."
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }
  if (password.length > MAX_PASSWORD_LENGTH) {
    return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`
  }

  const lowered = password.toLowerCase()

  if (COMMON_PASSWORDS.has(lowered)) {
    return "That password is too common. Choose something less predictable."
  }

  // Reject passwords built out of the account's own identifiers. The full
  // address is checked unconditionally; the local part only when it is long
  // enough that a match is not a coincidence.
  const email = context.email?.toLowerCase()
  const localPart = email?.split("@")[0]

  if (email && lowered.includes(email)) {
    return "Password must not contain your email address."
  }
  if (localPart && localPart.length >= 4 && lowered.includes(localPart)) {
    return "Password must not contain your email address."
  }
  // Check the whole name and each individual part, so "Lovelace2026!" is
  // rejected for Ada Lovelace and not just the full string.
  const nameParts = context.name
    ? [context.name, ...context.name.split(/\s+/)].map((part) => part.toLowerCase()).filter((part) => part.length >= 4)
    : []

  if (nameParts.some((part) => lowered.includes(part))) {
    return "Password must not contain your name."
  }

  const classes = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((pattern) => pattern.test(password)).length
  if (classes < 3) {
    return "Password must include at least three of: lowercase, uppercase, numbers, symbols."
  }

  return null
}
