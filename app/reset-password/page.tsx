"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react"
import { resetPasswordAction } from "@/lib/actions/security-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token") ?? ""
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState<string | null>(token ? null : "This reset link is invalid or has expired.")
  const [complete, setComplete] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (password !== confirmPassword) {
      setError("The passwords do not match.")
      return
    }
    setLoading(true)
    setError(null)
    const result = await resetPasswordAction({ token, password })
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }
    setComplete(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-background futuristic-grid flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md rounded-2xl border border-primary/20 p-8 shadow-2xl shadow-primary/10">
        <Link href="/login/email" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary"><ArrowLeft className="h-3.5 w-3.5" /> Back to sign in</Link>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          {complete ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <KeyRound className="h-6 w-6 text-primary" />}
        </div>
        <h1 className="text-xl font-bold text-foreground">Choose a new password</h1>
        {complete ? (
          <>
            <p className="mt-2 text-sm text-muted-foreground">Your password has been changed. Existing password sessions were signed out.</p>
            <Button className="mt-6 w-full" onClick={() => router.push("/login/email")}>Continue to sign in</Button>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <p className="text-xs text-muted-foreground">Use at least 12 characters and three character types.</p>
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required minLength={12} className="h-11 glass pr-11" />
                <button type="button" onClick={() => setShowPassword((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset" aria-label={showPassword ? "Hide new password" : "Show new password"} aria-pressed={showPassword}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Input id="confirm-password" type={showConfirmPassword ? "text" : "password"} value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required minLength={12} className="h-11 glass pr-11" />
                <button type="button" onClick={() => setShowConfirmPassword((visible) => !visible)} className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset" aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"} aria-pressed={showConfirmPassword}>
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error && <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
            <Button type="submit" disabled={loading || !token} className="h-11 w-full">{loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving…</> : "Save new password"}</Button>
          </form>
        )}
      </div>
    </main>
  )
}

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-background" />}><ResetPasswordForm /></Suspense>
}
