"use client"

import { type FormEvent, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CheckCircle2, Loader2, Mail, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { sendVerificationOtpAction, verifyEmailOtpAction } from "@/lib/actions/email-verification-actions"

export function EmailVerificationBanner({ email }: { email: string }) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [code, setCode] = useState("")
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null)
  const [isSending, startSending] = useTransition()
  const [isVerifying, startVerifying] = useTransition()

  if (dismissed) return null

  function handleSendCode() {
    setMessage(null)
    startSending(async () => {
      const result = await sendVerificationOtpAction()
      if (!result.success) {
        setMessage({ type: "error", text: result.error })
        return
      }
      setCodeSent(true)
      setMessage({ type: "success", text: `Code sent to ${email}.` })
    })
  }

  function handleVerify(event: FormEvent) {
    event.preventDefault()
    setMessage(null)

    startVerifying(async () => {
      const result = await verifyEmailOtpAction(code)
      if (!result.success) {
        setMessage({ type: "error", text: result.error })
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm text-amber-200">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
          <span>
            Verify <span className="font-medium text-foreground">{email}</span> to secure your account.
          </span>
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {!codeSent ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={handleSendCode}
              disabled={isSending}
              className="h-8 border-amber-500/30 text-amber-200 hover:bg-amber-500/10"
            >
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
              Send code
            </Button>
          ) : (
            <form onSubmit={handleVerify} className="flex items-center gap-2">
              <Input
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                className="h-8 w-24 glass border-amber-500/30 font-mono text-center tracking-widest"
                maxLength={6}
              />
              <Button
                type="submit"
                size="sm"
                disabled={isVerifying || code.length !== 6}
                className="h-8 bg-amber-500/90 text-black hover:bg-amber-500"
              >
                {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                Verify
              </Button>
              <button
                type="button"
                onClick={handleSendCode}
                disabled={isSending}
                className="text-xs text-amber-300/80 hover:text-amber-200 transition-colors"
              >
                Resend
              </button>
            </form>
          )}

          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-amber-300/60 hover:text-amber-200 transition-colors"
            title="Dismiss for now"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {message && (
        <p className={`mt-2 text-xs ${message.type === "error" ? "text-destructive" : "text-emerald-300"}`}>
          {message.text}
        </p>
      )}
    </div>
  )
}
