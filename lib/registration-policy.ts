/**
 * Who is allowed to obtain an account through GitHub OAuth.
 *
 * The default is CLOSED: only people who already have a user record can sign
 * in. An admin creates the record first (Admin → Users), then the person signs
 * in with GitHub and the two are linked by email address.
 *
 * Two optional env vars open it up for teams that want self-serve onboarding:
 *   SIGNUP_ALLOWED_DOMAINS  — comma-separated, e.g. "acme.com,acme.dev"
 *   SIGNUP_ALLOWED_EMAILS   — comma-separated exact addresses
 *
 * SIGNUP_MODE=open disables the gate entirely (not recommended).
 */

export type RegistrationDecision =
  | { allowed: true; reason: "existing-user" | "allowlisted" | "open-mode" | "bootstrap" }
  | { allowed: false; reason: string }

function splitList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean)
}

export function getAllowedSignupDomains() {
  return splitList(process.env.SIGNUP_ALLOWED_DOMAINS)
}

export function getAllowedSignupEmails() {
  return splitList(process.env.SIGNUP_ALLOWED_EMAILS)
}

export function isSignupModeOpen() {
  return process.env.SIGNUP_MODE === "open"
}

export function isEmailAllowlisted(email: string) {
  const normalized = email.trim().toLowerCase()
  const domain = normalized.split("@")[1] ?? ""

  if (getAllowedSignupEmails().includes(normalized)) return true
  if (domain && getAllowedSignupDomains().includes(domain)) return true

  return false
}

/**
 * @param email          the address GitHub gave us
 * @param userExists     whether a user record already exists for it
 * @param workspaceEmpty whether the workspace has no users at all yet
 */
export function decideRegistration(
  email: string,
  userExists: boolean,
  workspaceEmpty: boolean,
): RegistrationDecision {
  if (userExists) return { allowed: true, reason: "existing-user" }

  // First account through the door becomes the workspace owner. Without this a
  // fresh deployment would have no way in at all.
  if (workspaceEmpty) return { allowed: true, reason: "bootstrap" }

  if (isSignupModeOpen()) return { allowed: true, reason: "open-mode" }

  if (isEmailAllowlisted(email)) return { allowed: true, reason: "allowlisted" }

  return {
    allowed: false,
    reason: `${email} is not a member of this workspace. An admin must add the account before you can sign in.`,
  }
}
