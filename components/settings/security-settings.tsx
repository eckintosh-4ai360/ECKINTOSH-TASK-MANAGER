"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Copy, KeyRound, Loader2, ShieldCheck, Smartphone, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  beginMfaEnrollmentAction,
  confirmMfaEnrollmentAction,
  disableMfaAction,
  getSecuritySettingsAction,
} from "@/lib/actions/security-actions"

type SecuritySettings = Awaited<ReturnType<typeof getSecuritySettingsAction>>

export function SecuritySettings({ initial }: { initial: SecuritySettings }) {
  const [security, setSecurity] = useState(initial)
  const [currentPassword, setCurrentPassword] = useState("")
  const [setup, setSetup] = useState<{ secret: string; uri: string; expiresAt: string } | null>(null)
  const [verificationCode, setVerificationCode] = useState("")
  const [disableCode, setDisableCode] = useState("")
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function beginEnrollment() {
    setMessage(null)
    startTransition(async () => {
      const result = await beginMfaEnrollmentAction({ currentPassword })
      if (!result.success) {
        setMessage({ type: "error", text: result.error })
        return
      }
      setSetup(result)
      setVerificationCode("")
      setCurrentPassword("")
    })
  }

  function confirmEnrollment() {
    setMessage(null)
    startTransition(async () => {
      const result = await confirmMfaEnrollmentAction(verificationCode)
      if (!result.success) {
        setMessage({ type: "error", text: result.error })
        return
      }
      setSecurity((current) => ({ ...current, mfaEnabled: true, recoveryCodesRemaining: result.recoveryCodes.length }))
      setRecoveryCodes(result.recoveryCodes)
      setSetup(null)
      setVerificationCode("")
      setMessage({ type: "success", text: "Authenticator MFA is now enabled. Save your recovery codes before leaving this page." })
    })
  }

  function disableMfa() {
    setMessage(null)
    startTransition(async () => {
      const result = await disableMfaAction({ currentPassword, code: disableCode })
      if (!result.success) {
        setMessage({ type: "error", text: result.error })
        return
      }
      setSecurity((current) => ({ ...current, mfaEnabled: false, recoveryCodesRemaining: 0 }))
      setCurrentPassword("")
      setDisableCode("")
      setRecoveryCodes(null)
      setMessage({ type: "success", text: "MFA has been disabled. Sign in again on other devices to refresh their sessions." })
    })
  }

  async function copy(value: string) {
    await navigator.clipboard?.writeText(value)
    setMessage({ type: "success", text: "Copied to clipboard." })
  }

  return (
    <section className="glass-card rounded-2xl p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10"><ShieldCheck className="h-5 w-5 text-primary" /></div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">Account security</h3>
            <p className="mt-1 text-sm text-muted-foreground">Protect password sign-in with a time-based authenticator app and one-time recovery codes.</p>
          </div>
        </div>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${security.mfaEnabled ? "border-primary/30 bg-primary/10 text-primary" : "border-border/60 text-muted-foreground"}`}>
          {security.mfaEnabled ? "MFA enabled" : "MFA off"}
        </span>
      </div>

      {message && <div className={`mt-5 flex gap-2 rounded-xl border px-3 py-3 text-sm ${message.type === "success" ? "border-primary/25 bg-primary/10 text-primary" : "border-destructive/30 bg-destructive/10 text-destructive"}`}>
        {message.type === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <TriangleAlert className="h-4 w-4 shrink-0" />}{message.text}
      </div>}

      {!security.mfaEnabled && !setup && (
        <div className="mt-6 rounded-xl border border-border/50 bg-background/30 p-4">
          <p className="text-sm font-semibold text-foreground">Enable authenticator MFA</p>
          <p className="mt-1 text-xs text-muted-foreground">Works with 1Password, Authy, Google Authenticator, Microsoft Authenticator, and similar apps.</p>
          {security.credentialPasswordEnabled && <div className="mt-4 max-w-sm space-y-2"><Label htmlFor="mfa-current-password">Current password</Label><Input id="mfa-current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></div>}
          <Button className="mt-4" onClick={beginEnrollment} disabled={pending || (security.credentialPasswordEnabled && !currentPassword)}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />} Set up authenticator
          </Button>
        </div>
      )}

      {setup && (
        <div className="mt-6 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="text-sm font-semibold text-foreground">1. Add this key to your authenticator</p>
          <p className="mt-1 text-xs text-muted-foreground">Choose “enter setup key” in your authenticator app. The account name is your email, the type is time-based, and the period is 30 seconds.</p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 p-3 font-mono text-sm break-all"><code className="flex-1">{setup.secret}</code><Button variant="ghost" size="icon" onClick={() => copy(setup.secret)} aria-label="Copy MFA secret"><Copy className="h-4 w-4" /></Button></div>
          <details className="mt-3 text-xs text-muted-foreground"><summary className="cursor-pointer">Advanced: otpauth URI</summary><code className="mt-2 block break-all rounded bg-background/40 p-2">{setup.uri}</code></details>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"><div className="flex-1 space-y-2"><Label htmlFor="mfa-verify-code">2. Enter the 6-digit code</Label><Input id="mfa-verify-code" value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="123456" /></div><Button onClick={confirmEnrollment} disabled={pending || !verificationCode}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Confirm MFA</Button></div>
        </div>
      )}

      {security.mfaEnabled && (
        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-background/30 p-4"><p className="text-sm font-semibold text-foreground">Recovery codes</p><p className="mt-1 text-xs text-muted-foreground">{security.recoveryCodesRemaining} unused code{security.recoveryCodesRemaining === 1 ? "" : "s"} remain. Each code can be used only once during sign-in.</p>{recoveryCodes && <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 font-mono text-xs text-foreground">{recoveryCodes.map((code) => <code key={code}>{code}</code>)}</div>}</div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm font-semibold text-foreground">Disable MFA</p><p className="mt-1 text-xs text-muted-foreground">Requires your current password, when present, and a current authenticator or recovery code.</p>{security.credentialPasswordEnabled && <div className="mt-3 space-y-2"><Label htmlFor="disable-mfa-password">Current password</Label><Input id="disable-mfa-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" /></div>}<div className="mt-3 space-y-2"><Label htmlFor="disable-mfa-code">Authenticator or recovery code</Label><Input id="disable-mfa-code" value={disableCode} onChange={(event) => setDisableCode(event.target.value)} autoComplete="one-time-code" /></div><Button variant="outline" className="mt-3 border-destructive/40 text-destructive hover:bg-destructive/10" onClick={disableMfa} disabled={pending || !disableCode || (security.credentialPasswordEnabled && !currentPassword)}>{pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}Disable MFA</Button></div>
        </div>
      )}
    </section>
  )
}
