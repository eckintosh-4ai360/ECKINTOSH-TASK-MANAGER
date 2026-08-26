"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Github, Lock, AlertCircle, Loader2, User, Mail } from "lucide-react"
import { acceptInvitationAction } from "@/lib/actions/invitation-actions"

type InviteAcceptFormProps = {
  token: string
  email: string
}

export function InviteAcceptForm({ token, email }: InviteAcceptFormProps) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [githubLoading, setGithubLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setLoading(true)

    const formData = new FormData(event.currentTarget)
    const result = await acceptInvitationAction(formData)

    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
    // On success the action redirects — no further state update needed.
  }

  async function handleGitHub() {
    setError(null)
    setGithubLoading(true)
    try {
      // auth.ts's signIn callback matches this GitHub email against the same
      // invitation record and assigns the role from it.
      await signIn("github", { redirectTo: "/auth/complete?returnTo=/" })
    } catch {
      setError("GitHub sign-in failed. Please try again.")
      setGithubLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <Button
        type="button"
        variant="outline"
        onClick={handleGitHub}
        disabled={githubLoading || loading}
        className="w-full h-11 glass border-border/50 hover:border-primary/50 font-medium"
      >
        {githubLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Github className="w-4 h-4 mr-2" />}
        Continue with GitHub
      </Button>

      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-border/50" />
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or set a password</span>
        <div className="h-px flex-1 bg-border/50" />
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input type="hidden" name="token" value={token} />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-primary" /> Email
          </Label>
          <Input value={email} disabled className="glass border-border/50 h-11 opacity-70" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name" className="text-xs text-muted-foreground flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-primary" /> Full name
          </Label>
          <Input
            id="name"
            name="name"
            placeholder="Ada Lovelace"
            autoComplete="name"
            required
            className="glass border-border/50 focus:border-primary/50 h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-xs text-muted-foreground flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-primary" /> Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="At least 12 characters"
            autoComplete="new-password"
            required
            minLength={12}
            className="glass border-border/50 focus:border-primary/50 h-11"
          />
          <p className="text-[11px] text-muted-foreground">
            12+ characters, mixing at least three of: lowercase, uppercase, numbers, symbols.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          disabled={loading || githubLoading}
          className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20 font-medium"
        >
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</> : "Create account & join"}
        </Button>
      </form>
    </div>
  )
}
