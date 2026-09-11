import assert from "node:assert/strict"
import test from "node:test"
import { generateTotpCode, verifyTotpCode, normalizeRecoveryCode, hashRecoveryCode } from "@/lib/mfa"
import { validatePassword } from "@/lib/password-policy"
import { hasPermission, canUpdateTaskStatus } from "@/lib/rbac"

test("TOTP matches the RFC 6238 SHA-1 vector", () => {
  const secret = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ"
  assert.equal(generateTotpCode(secret, 59_000), "287082")
  assert.equal(verifyTotpCode(secret, "287082", 59_000, 0), true)
  assert.equal(verifyTotpCode(secret, "000000", 59_000, 0), false)
})

test("recovery codes normalize separators before hashing", () => {
  assert.equal(normalizeRecoveryCode("abcde-12345"), "ABCDE12345")
  assert.equal(hashRecoveryCode("abcde-12345"), hashRecoveryCode("ABCDE12345"))
})

test("password policy rejects weak and identity-derived passwords", () => {
  assert.match(validatePassword("short", { email: "ada@example.com" }) ?? "", /at least 12/i)
  assert.match(validatePassword("AdaLovelace2026!", { email: "ada@example.com", name: "Ada Lovelace" }) ?? "", /name/i)
  assert.equal(validatePassword("Correct-Horse-Battery-7!", { email: "ada@example.com", name: "Ada Lovelace" }), null)
})

test("workspace role permissions remain least-privilege", () => {
  assert.equal(hasPermission("ADMIN", "manage_users"), true)
  assert.equal(hasPermission("USER", "manage_users"), false)
  assert.equal(hasPermission("GUEST", "use_messages"), false)
  assert.equal(canUpdateTaskStatus({ id: "u1", role: "USER" }, { assigneeId: "u1" }), true)
  assert.equal(canUpdateTaskStatus({ id: "u1", role: "USER" }, { assigneeId: "u2" }), false)
})
