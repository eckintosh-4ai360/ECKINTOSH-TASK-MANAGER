"use client"

import { type FormEvent, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  KeyRound,
  Loader2,
  Mail,
  Save,
  Send,
  Server,
  ShieldCheck,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { EmailSettingsView, SettingsEmailProvider } from "@/lib/settings"
import {
  deleteEmailSettingsAction,
  saveEmailSettingsAction,
  sendTestEmailAction,
} from "@/lib/actions/email-settings-actions"

type Feedback = { type: "success" | "error" | "warning"; text: string } | null

type EmailDeliverySettingsProps = {
  settings: EmailSettingsView | null
  /** True when delivery currently comes from SMTP_* env vars instead of this form. */
  configuredFromEnvironment: boolean
  adminEmail: string
}

const GMAIL_APP_PASSWORD_URL = "https://myaccount.google.com/apppasswords"

const PROVIDERS: Array<{ value: SettingsEmailProvider; label: string; hint: string }> = [
  { value: "gmail", label: "Google / Gmail", hint: "smtp.gmail.com over SSL — needs a 16-character App Password" },
  { value: "smtp", label: "Custom SMTP", hint: "Any other mail server — set the host and port yourself" },
]

function emptyForm(adminEmail: string) {
  return {
    provider: "gmail" as SettingsEmailProvider,
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    username: "",
    password: "",
    fromEmail: adminEmail,
    fromName: "Spagad Notifications",
    enabled: true,
  }
}

function formFrom(settings: EmailSettingsView | null, adminEmail: string) {
  if (!settings) return emptyForm(adminEmail)

  return {
    provider: settings.provider,
    host: settings.host,
    port: settings.port,
    secure: settings.secure,
    username: settings.username,
    password: "",
    fromEmail: settings.fromEmail,
    fromName: settings.fromName,
    enabled: settings.enabled,
  }
}

export function EmailDeliverySettings({
  settings,
  configuredFromEnvironment,
  adminEmail,
}: EmailDeliverySettingsProps) {
  const router = useRouter()
  const [form, setForm] = useState(() => formFrom(settings, adminEmail))
  const [current, setCurrent] = useState(settings)
  const [testRecipient, setTestRecipient] = useState(adminEmail)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [isSaving, startSaving] = useTransition()
  const [isTesting, startTesting] = useTransition()
  const [isRemoving, startRemoving] = useTransition()

  const isGmail = form.provider === "gmail"
  const keepsExistingPassword = Boolean(current?.hasPassword) && !form.password.trim()
  const busy = isSaving || isTesting || isRemoving

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((state) => ({ ...state, [key]: value }))
    setFeedback(null)
  }

  function selectProvider(provider: SettingsEmailProvider) {
    setFeedback(null)
    setForm((state) => ({
      ...state,
      provider,
      // Gmail's endpoint is fixed, so snap the connection fields back to it.
      ...(provider === "gmail" ? { host: "smtp.gmail.com", port: 465, secure: true } : {}),
    }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedback(null)

    startSaving(async () => {
      const result = await saveEmailSettingsAction({
        provider: form.provider,
        host: form.host,
        port: Number(form.port),
        secure: form.secure,
        username: form.username,
        // Blank means "keep the password already on file".
        password: form.password.trim() || undefined,
        fromEmail: form.fromEmail,
        fromName: form.fromName,
        enabled: form.enabled,
      })

      if (!result.success) {
        setFeedback({ type: "error", text: result.error })
        return
      }

      setCurrent(result.settings)
      setForm((state) => ({ ...state, password: "" }))
      setFeedback(
        result.warning
          ? { type: "warning", text: `Saved, but the server did not accept the connection: ${result.warning}` }
          : { type: "success", text: "Email settings saved and the connection was verified." },
      )
      router.refresh()
    })
  }

  function handleTest() {
    setFeedback(null)

    startTesting(async () => {
      const result = await sendTestEmailAction(testRecipient)

      setFeedback(
        result.success
          ? { type: "success", text: result.message }
          : { type: "error", text: result.error },
      )
      router.refresh()
    })
  }

  function handleRemove() {
    setFeedback(null)

    startRemoving(async () => {
      const result = await deleteEmailSettingsAction()

      if (!result.success) {
        setFeedback({ type: "error", text: result.error })
        return
      }

      setCurrent(null)
      setForm(emptyForm(adminEmail))
      setFeedback({ type: "warning", text: "Email settings removed. Outbound email is now disabled." })
      router.refresh()
    })
  }

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center border border-primary/30">
            <Mail className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Email Delivery</h3>
            <p className="text-xs text-muted-foreground">
              Workspace-wide SMTP credentials for notifications, invitations, and reminders. Admins only.
            </p>
          </div>
        </div>
        <StatusPill settings={current} />
      </div>

      {configuredFromEnvironment && !current && (
        <Notice type="warning" className="mb-5">
          Email is currently going out through the <code className="font-mono text-xs">SMTP_*</code> environment
          variables. Saving here overrides them.
        </Notice>
      )}

      {current && !current.passwordReadable && (
        <Notice type="error" className="mb-5">
          The stored password can no longer be decrypted — the app&apos;s encryption key changed. Re-enter the password
          below and save.
        </Notice>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Provider */}
        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground flex items-center gap-2">
            <Server className="w-3.5 h-3.5 text-primary" />
            Provider
          </Label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {PROVIDERS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => selectProvider(option.value)}
                aria-pressed={form.provider === option.value}
                className={cn(
                  "text-left p-4 rounded-xl border transition-all",
                  form.provider === option.value
                    ? "border-primary/50 bg-primary/10"
                    : "border-border/40 glass hover:border-primary/30",
                )}
              >
                <p className="font-medium text-sm text-foreground">{option.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{option.hint}</p>
              </button>
            ))}
          </div>
        </div>

        {isGmail ? (
          <Notice type="info">
            Gmail rejects normal account passwords over SMTP. Turn on 2-Step Verification, then generate a 16-character
            App Password and paste it below.{" "}
            <a
              href={GMAIL_APP_PASSWORD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline inline-flex items-center gap-1"
            >
              Create an App Password
              <ExternalLink className="w-3 h-3" />
            </a>
          </Notice>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="smtp-host" className="text-sm text-muted-foreground">
                SMTP host
              </Label>
              <Input
                id="smtp-host"
                value={form.host}
                onChange={(event) => update("host", event.target.value)}
                placeholder="smtp.yourdomain.com"
                className="glass border-primary/20 focus:border-primary/50 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="smtp-port" className="text-sm text-muted-foreground">
                Port
              </Label>
              <Input
                id="smtp-port"
                type="number"
                min={1}
                max={65535}
                value={form.port}
                onChange={(event) => update("port", Number(event.target.value))}
                className="glass border-primary/20 focus:border-primary/50 h-11"
              />
            </div>
          </div>
        )}

        {!isGmail && (
          <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 glass">
            <div>
              <p className="font-medium text-sm text-foreground">Implicit TLS (SSL)</p>
              <p className="text-xs text-muted-foreground">
                On for port 465. Leave off for 587, which upgrades with STARTTLS.
              </p>
            </div>
            <Switch
              checked={form.secure}
              onCheckedChange={(checked) => update("secure", checked)}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        )}

        {/* Credentials */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="smtp-username" className="text-sm text-muted-foreground">
              {isGmail ? "Google account" : "SMTP username"}
            </Label>
            <Input
              id="smtp-username"
              type="email"
              value={form.username}
              onChange={(event) => update("username", event.target.value)}
              placeholder={isGmail ? "you@gmail.com" : "mailer@yourdomain.com"}
              autoComplete="off"
              className="glass border-primary/20 focus:border-primary/50 h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="smtp-password" className="text-sm text-muted-foreground flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-primary" />
              {isGmail ? "App Password" : "SMTP password"}
            </Label>
            <Input
              id="smtp-password"
              type="password"
              value={form.password}
              onChange={(event) => update("password", event.target.value)}
              placeholder={keepsExistingPassword ? "•••••••• (unchanged)" : isGmail ? "abcd efgh ijkl mnop" : "••••••••"}
              autoComplete="new-password"
              className="glass border-primary/20 focus:border-primary/50 h-11 font-mono"
            />
            <p className="text-[11px] text-muted-foreground">
              {keepsExistingPassword
                ? "Stored encrypted. Leave blank to keep it."
                : "Encrypted before it is written to the database."}
            </p>
          </div>
        </div>

        {/* Sender identity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="from-email" className="text-sm text-muted-foreground">
              From address
            </Label>
            <Input
              id="from-email"
              type="email"
              value={form.fromEmail}
              onChange={(event) => update("fromEmail", event.target.value)}
              placeholder="notifications@yourdomain.com"
              className="glass border-primary/20 focus:border-primary/50 h-11"
            />
            {isGmail && (
              <p className="text-[11px] text-muted-foreground">
                Gmail rewrites this to the account address unless it is a verified alias.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="from-name" className="text-sm text-muted-foreground">
              From name
            </Label>
            <Input
              id="from-name"
              value={form.fromName}
              onChange={(event) => update("fromName", event.target.value)}
              placeholder="Spagad Notifications"
              className="glass border-primary/20 focus:border-primary/50 h-11"
            />
          </div>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border/40 glass">
          <div>
            <p className="font-medium text-sm text-foreground">Outbound email enabled</p>
            <p className="text-xs text-muted-foreground">
              Turn off to keep the credentials but stop all outbound delivery.
            </p>
          </div>
          <Switch
            checked={form.enabled}
            onCheckedChange={(checked) => update("enabled", checked)}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        {feedback && <Notice type={feedback.type}>{feedback.text}</Notice>}

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button type="submit" disabled={busy} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isSaving ? "Verifying…" : "Save & verify"}
          </Button>

          {current && (
            <Button
              type="button"
              variant="outline"
              disabled={busy}
              onClick={handleRemove}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            >
              {isRemoving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Remove
            </Button>
          )}
        </div>
      </form>

      {current && (
        <div className="mt-6 pt-6 border-t border-border/40">
          <p className="text-sm font-medium text-foreground mb-1">Send a test email</p>
          <p className="text-xs text-muted-foreground mb-3">
            Delivers a message through the saved settings so you can confirm it lands in a real inbox.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              type="email"
              value={testRecipient}
              onChange={(event) => setTestRecipient(event.target.value)}
              placeholder="you@example.com"
              className="glass border-primary/20 focus:border-primary/50 h-11 flex-1"
            />
            <Button type="button" variant="outline" disabled={busy} onClick={handleTest} className="border-primary/30">
              {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Send test
            </Button>
          </div>

          <dl className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <MetaRow label="Last test">
              {current.lastTestedAt
                ? `${new Date(current.lastTestedAt).toLocaleString()} — ${current.lastTestStatus ?? "unknown"}`
                : "Never tested"}
            </MetaRow>
            <MetaRow label="Last updated by">{current.updatedByEmail ?? "—"}</MetaRow>
          </dl>

          {current.lastTestStatus === "failed" && current.lastTestError && (
            <Notice type="error" className="mt-3">
              {current.lastTestError}
            </Notice>
          )}
        </div>
      )}
    </div>
  )
}

function StatusPill({ settings }: { settings: EmailSettingsView | null }) {
  const active = Boolean(settings?.enabled && settings?.passwordReadable)

  return (
    <div
      className={cn(
        "glass rounded-xl px-3 py-2 text-xs border flex items-center gap-2 shrink-0",
        active ? "border-emerald-500/30 text-emerald-400" : "border-border/40 text-muted-foreground",
      )}
    >
      {active ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
      {active ? "Delivery active" : settings ? "Delivery paused" : "Not configured"}
    </div>
  )
}

function MetaRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-1 border-b border-border/20">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-foreground font-mono text-[11px] text-right">{children}</dd>
    </div>
  )
}

function Notice({
  type,
  children,
  className,
}: {
  type: "success" | "error" | "warning" | "info"
  children: React.ReactNode
  className?: string
}) {
  const tone = {
    success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
    error: "border-destructive/30 bg-destructive/10 text-destructive",
    warning: "border-amber-500/30 bg-amber-500/10 text-amber-400",
    info: "border-primary/25 bg-primary/5 text-muted-foreground",
  }[type]

  const Icon = type === "success" ? CheckCircle2 : type === "info" ? Mail : AlertTriangle

  return (
    <div className={cn("flex items-start gap-2 p-3 rounded-xl border text-xs leading-relaxed", tone, className)}>
      <Icon className="w-4 h-4 shrink-0 mt-0.5" />
      <div>{children}</div>
    </div>
  )
}
