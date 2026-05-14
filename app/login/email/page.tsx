"use client"

import { useState } from "react"
import { loginAction } from "@/lib/actions/auth-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { GitBranch, Mail, Lock, AlertCircle, Loader2, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function EmailLoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const formData = new FormData(e.currentTarget)
    const result = await loginAction(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background futuristic-grid flex items-center justify-center p-4 relative overflow-hidden">
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
            <h1 className="text-xl font-bold text-foreground tracking-tight">Eckintosh</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Engineering Digital Solutions</p>
          </div>

          <h2 className="text-sm font-semibold text-foreground mb-5">Sign in with email</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs text-muted-foreground flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-primary" /> Email Address
              </Label>
              <Input id="email" name="email" type="email" placeholder="admin@eckintosh.dev" autoComplete="email" required className="glass border-border/50 focus:border-primary/50 h-11" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs text-muted-foreground flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-primary" /> Password
              </Label>
              <Input id="password" name="password" type="password" placeholder="••••••••" autoComplete="current-password" required className="glass border-border/50 focus:border-primary/50 h-11" />
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

          <p className="text-center text-xs text-muted-foreground mt-6 opacity-70">
            Contact your administrator if you don&apos;t have an account.
          </p>
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-4">
          © {new Date().getFullYear()} Eckintosh · Engineering Digital Solutions
        </p>
      </div>
    </div>
  )
}
