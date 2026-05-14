"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { GitBranch, Github, Loader2, AlertCircle, Code2, Zap, Users, Rocket } from "lucide-react"

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleGitHubSignIn() {
    setLoading(true)
    setError(null)
    try {
      await signIn("github", { callbackUrl: "/auth/complete" })
    } catch {
      setError("Sign-in failed. Please try again.")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background futuristic-grid flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background ambient glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/3 w-[700px] h-[700px] bg-primary/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-chart-2/6 rounded-full blur-[100px]" />
      </div>

      <div className="w-full max-w-4xl relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">

        {/* ── Left: Branding panel ─────────────────────────── */}
        <div className="hidden lg:flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-xl shadow-primary/30 animate-glow-pulse">
              <GitBranch className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold neon-text tracking-wider">Eckintosh</h1>
              <p className="text-sm text-muted-foreground font-medium tracking-wide">Engineering Digital Solutions</p>
            </div>
          </div>

          {/* Description */}
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2 leading-snug">
              Your dev team's<br />
              <span className="neon-text">command center.</span>
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              Sprints, standups, deployments, and team collaboration — all in one place, built for developers.
            </p>
          </div>

          {/* Feature highlights */}
          <div className="space-y-3">
            {[
              { icon: Zap, label: "Sprint Management", desc: "Track cycles across all projects" },
              { icon: Users, label: "Daily Standups", desc: "Keep your team aligned every day" },
              { icon: Rocket, label: "Deployment Feed", desc: "Monitor releases in real time" },
              { icon: Code2, label: "Multi-Project Workspace", desc: "Switch contexts without friction" },
            ].map((f) => (
              <div key={f.label} className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-foreground">{f.label}</p>
                  <p className="text-[10px] text-muted-foreground">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Sign-in card ──────────────────────────── */}
        <div className="glass-card rounded-2xl p-8 border border-primary/20 shadow-2xl shadow-primary/10 w-full max-w-md mx-auto">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/50 flex items-center justify-center shadow-lg shadow-primary/30">
              <GitBranch className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-lg font-extrabold neon-text tracking-wider">Eckintosh</p>
              <p className="text-[10px] text-muted-foreground">Engineering Digital Solutions</p>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-bold text-foreground mb-1">Welcome back</h2>
            <p className="text-sm text-muted-foreground">Sign in with your GitHub account to access your workspace.</p>
          </div>

          {/* GitHub OAuth button */}
          <button
            id="github-signin-btn"
            onClick={handleGitHubSignIn}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 rounded-xl bg-[#24292e] hover:bg-[#2f363d] border border-white/10 text-white font-semibold text-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-xl hover:shadow-black/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 group"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Connecting to GitHub...
              </>
            ) : (
              <>
                <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                Continue with GitHub
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/5" />
          </div>

          {/* Email fallback link */}
          <a
            href="/login/email"
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl border border-primary/20 text-sm text-muted-foreground hover:text-primary hover:border-primary/40 hover:bg-primary/5 transition-all duration-200 font-medium"
          >
            Sign in with Email & Password
          </a>

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Info */}
          <div className="mt-6 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              <span className="text-primary font-semibold">First time?</span> Your account will be created automatically using your GitHub profile. Contact{" "}
              <span className="text-primary">admin@eckintosh.dev</span> to be granted admin access.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/50 text-center">
        © {new Date().getFullYear()} Eckintosh · Engineering Digital Solutions
      </p>
    </div>
  )
}
