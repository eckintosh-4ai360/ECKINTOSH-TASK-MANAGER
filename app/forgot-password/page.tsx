"use client"

import { useState } from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, KeyRound, Loader2, Mail } from "lucide-react"
import { requestPasswordResetAction } from "@/lib/actions/security-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    await requestPasswordResetAction(email)
    setSent(true)
    setLoading(false)
  }

  return (
    <main className="min-h-screen bg-background developer-workspace flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md rounded-2xl border border-primary/20 p-8 shadow-2xl shadow-primary/10">
        <Link href="/login/email" className="mb-6 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
        <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10">
          {sent ? <CheckCircle2 className="h-6 w-6 text-primary" /> : <KeyRound className="h-6 w-6 text-primary" />}
        </div>
        <h1 className="text-xl font-bold text-foreground">Reset your password</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {sent ? "If that account can use password sign-in, a secure reset link has been sent." : "Enter your work email and we’ll send a single-use reset link."}
        </p>

        {!sent && (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2 text-xs text-muted-foreground"><Mail className="h-3.5 w-3.5 text-primary" /> Email address</Label>
              <Input id="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required className="h-11 glass" />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending…</> : "Send reset link"}
            </Button>
          </form>
        )}
      </div>
    </main>
  )
}
