import Link from "next/link"
import { GitBranch, MailWarning, ShieldCheck } from "lucide-react"
import { getInvitationAction } from "@/lib/actions/invitation-actions"
import { InviteAcceptForm } from "@/components/auth/invite-accept-form"

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  USER: "Member",
  GUEST: "Viewer",
}

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const invitation = await getInvitationAction(token)

  return (
    <div className="min-h-screen bg-background futuristic-grid flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/8 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="glass-card rounded-2xl p-8 border border-primary/20 shadow-2xl shadow-primary/10">
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30 mb-4">
              <GitBranch className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">Spagad</h1>
            <p className="text-xs text-muted-foreground mt-0.5">SRAD – Rapid Application Development</p>
          </div>

          {invitation ? (
            <>
              <div className="flex items-center gap-2 mb-1">
                <ShieldCheck className="w-4 h-4 text-primary" />
                <h2 className="text-sm font-semibold text-foreground">You&apos;re invited</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-6">
                <span className="text-foreground font-medium">{invitation.invitedByName}</span> invited you to join as
                a <span className="text-primary font-medium">{ROLE_LABEL[invitation.role] ?? invitation.role}</span>.
                {invitation.message && (
                  <span className="block mt-2 italic border-l-2 border-primary/30 pl-3">&ldquo;{invitation.message}&rdquo;</span>
                )}
              </p>

              <InviteAcceptForm token={token} email={invitation.email} />
            </>
          ) : (
            <div className="text-center">
              <MailWarning className="w-8 h-8 text-destructive mx-auto mb-3" />
              <h2 className="text-sm font-semibold text-foreground mb-1">This invitation isn&apos;t valid</h2>
              <p className="text-xs text-muted-foreground mb-6">
                It may have already been used, or the link may have expired ({" "}
                <span className="font-mono">7 days</span> from when it was sent). Ask whoever invited you to send a
                new one.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center w-full h-11 rounded-lg glass border border-border/50 hover:border-primary/50 text-sm font-medium text-foreground transition-colors"
              >
                Back to sign in
              </Link>
            </div>
          )}
        </div>

        <p className="text-center text-[10px] text-muted-foreground/50 mt-4">
          © {new Date().getFullYear()} Spagad · SRAD – Rapid Application Development
        </p>
      </div>
    </div>
  )
}
