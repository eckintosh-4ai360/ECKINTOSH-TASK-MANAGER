"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { loginAction } from "@/lib/actions/auth-actions"
import { completeMfaLoginAction } from "@/lib/actions/security-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GitBranch, Mail, Lock, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react"
import Link from "next/link"

export default function EmailLoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mfaRequired, setMfaRequired] = useState(false)
  const [mfaCode, setMfaCode] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    try {
      const result = await loginAction(formData)
      if (result?.mfaRequired) {
        setMfaRequired(true)
        setLoading(false)
        return
      }
      if (result?.error) {
        setError(result.error)
        setLoading(false)
      }
    } catch {
      // Server-action failures must not leave the form permanently disabled.
      setError("We couldn't complete sign in. Please try again.")
      setLoading(false)
    }
  }

  async function handleMfaSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)
    const result = await completeMfaLoginAction(mfaCode)
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }
    router.replace("/")
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-background developer-workspace flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors mb-6"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>

        <div className="glass-card rounded-2xl p-8 border border-primary/20 shadow-2xl shadow-primary/10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
              <GitBranch className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Spagad</h1>
            <p className="text-xs text-muted-foreground mt-0.5">SRAD – Rapid Application Development</p>
          </div>

          <h2 className="text-sm font-semibold text-foreground mb-2">{mfaRequired ? "Verify your identity" : "Sign in with email"}</h2>
          {mfaRequired && <p className="text-xs text-muted-foreground mb-5">Enter a code from your authenticator app or one of your recovery codes.</p>}

          {mfaRequired ? (
          <form onSubmit={handleMfaSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mfa-code" className="text-xs text-muted-foreground flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-primary" /> Authenticator or recovery code
              </Label>
              <Input
                id="mfa-code"
                value={mfaCode}
                onChange={(event) => setMfaCode(event.target.value)}
                placeholder="123456 or ABCDE-12345"
                autoComplete="one-time-code"
                autoFocus
                required
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 font-medium">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</> : "Verify & Sign In"}
            </Button>
            <button type="button" onClick={() => { setMfaRequired(false); setError(null); setMfaCode("") }} className="w-full text-xs text-muted-foreground hover:text-primary transition-colors">
              Use a different account
            </button>
          </form>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
              </Label>
              <Input id="email" name="email" type="email" placeholder="admin@spagad.dev" autoComplete="email" required className="glass border-border/50 focus:border-primary/50 h-11" />
            </div>

            <div className="text-right">
              <Link href="/forgot-password" className="text-xs text-primary hover:underline">Forgot password?</Link>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-primary" /> Password
              </Label>
              <div className="relative">
                <Input id="password" name="password" type={showPassword ? "text" : "password"} placeholder="••••••••" autoComplete="current-password" required className="glass h-11 border-border/50 pr-11 focus:border-primary/50" />
                <button
                  type="button"
                  onClick={() => setShowPassword((visible) => !visible)}
                  className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 font-medium">
              {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : "Sign In"}
            </Button>
          </form>
          )}

          {!mfaRequired && <p className="text-center text-xs text-muted-foreground mt-6 opacity-70">
            Contact your administrator if you don&apos;t have an account.
          </p>}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-4">
          © {new Date().getFullYear()} Spagad · SRAD – Rapid Application Development
        </p>
      </div>
    </div>
  )
}
