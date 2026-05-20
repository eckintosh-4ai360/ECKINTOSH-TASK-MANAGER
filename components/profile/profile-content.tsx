"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useEffect, useState, useTransition } from "react"
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
  CalendarClock,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Globe2,
  Mail,
  Shield,
  Sparkles,
  TimerReset,
  UserRound,
  Users,
} from "lucide-react"
import { updateProfileAction } from "@/lib/actions/settings-actions"
import type { SettingsPageData } from "@/lib/settings"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ProfileContentProps = {
  settings: SettingsPageData
}

const TIMEZONE_SUGGESTIONS = [
  "UTC",
  "Atlantic/Reykjavik",
  "Africa/Lagos",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
]

function getInitials(name: string, email: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()

  return initials || email[0]?.toUpperCase() || "U"
}

function formatJoinedDate(value: string | null) {
  if (!value) return "Recently active"

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function formatDueLabel(value: string | null) {
  if (!value) {
    return {
      label: "No due date",
      tone: "border-border/50 bg-background/40 text-muted-foreground",
    }
  }

  const now = new Date()
  const due = new Date(value)
  const diff = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diff / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    return {
      label: `${Math.abs(diffDays)}d overdue`,
      tone: "border-destructive/30 bg-destructive/10 text-destructive",
    }
  }

  if (diffDays === 0) {
    return {
      label: "Due today",
      tone: "border-amber-400/30 bg-amber-400/10 text-amber-500",
    }
  }

  if (diffDays === 1) {
    return {
      label: "Due tomorrow",
      tone: "border-primary/30 bg-primary/10 text-primary",
    }
  }

  return {
    label: `Due in ${diffDays}d`,
    tone: "border-primary/30 bg-primary/10 text-primary",
  }
}

function StatusPill({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
        enabled
          ? "border-primary/30 bg-primary/10 text-primary"
          : "border-border/50 bg-background/40 text-muted-foreground",
      )}
    >
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          enabled ? "bg-primary shadow-[0_0_12px_rgba(0,212,255,0.6)]" : "bg-muted-foreground/40",
        )}
      />
      {label}
    </span>
  )
}

export function ProfileContent({ settings }: ProfileContentProps) {
  const router = useRouter()
  const [profile, setProfile] = useState(settings.profile)
  const [form, setForm] = useState({
    name: settings.profile.name,
    email: settings.profile.email,
    title: settings.profile.title ?? "",
    timezone: settings.profile.timezone ?? "UTC",
    avatar: settings.profile.avatar ?? "",
  })
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error"
    text: string
  } | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    setProfile(settings.profile)
    setForm({
      name: settings.profile.name,
      email: settings.profile.email,
      title: settings.profile.title ?? "",
      timezone: settings.profile.timezone ?? "UTC",
      avatar: settings.profile.avatar ?? "",
    })
  }, [settings.profile])

  const initials = getInitials(form.name || profile.name, form.email || profile.email)
  const activeTasks = settings.reminderSummary.activeAssigned
  const dueSoonTasks = settings.reminderSummary.dueSoon
  const overdueTasks = settings.reminderSummary.overdue

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaveMessage(null)

    const formData = new FormData(event.currentTarget)

    startTransition(() => {
      void updateProfileAction(formData)
        .then((result) => {
          if (!result.success || !result.profile) {
            setSaveMessage({
              type: "error",
              text: "error" in result && result.error
                ? result.error
                : "Something went wrong while saving your profile.",
            })
            return
          }

          setProfile(result.profile)
          setForm({
            name: result.profile.name,
            email: result.profile.email,
            title: result.profile.title ?? "",
            timezone: result.profile.timezone ?? "UTC",
            avatar: result.profile.avatar ?? "",
          })
          setSaveMessage({
            type: "success",
            text: "Profile saved and synced across your workspace.",
          })
          router.refresh()
        })
        .catch(() => {
          setSaveMessage({
            type: "error",
            text: "Something went wrong while saving your profile.",
          })
        })
    })
  }

  return (
    <div className="space-y-6">
      <section className="glass-card overflow-hidden rounded-2xl border border-primary/15">
        <div className="futuristic-grid border-b border-white/10 px-6 py-6 lg:px-7">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <Avatar className="h-24 w-24 border border-primary/20 shadow-2xl shadow-primary/20">
                <AvatarImage src={form.avatar || undefined} alt={form.name} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/40 text-2xl font-bold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>

              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-primary/15 text-primary hover:bg-primary/15">
                    <Sparkles className="h-3 w-3" />
                    Profile hub
                  </Badge>
                  <Badge variant="outline" className="border-border/60 bg-background/35 font-mono">
                    {profile.role}
                  </Badge>
                </div>

                <div>
                  <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                    {profile.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.title || "Workspace contributor"} - {profile.email}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/35 px-3 py-1">
                    <CalendarClock className="h-3.5 w-3.5 text-primary" />
                    Joined {formatJoinedDate(profile.joinedAt)}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/35 px-3 py-1">
                    <Globe2 className="h-3.5 w-3.5 text-primary" />
                    {profile.timezone || "UTC"}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/35 px-3 py-1">
                    <Briefcase className="h-3.5 w-3.5 text-primary" />
                    Eckintosh Workspace
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
                <Link href="/settings">
                  Notification settings
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="shadow-lg shadow-primary/20">
                <Link href="/team">
                  View team
                  <Users className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-3 px-6 py-5 sm:grid-cols-2 xl:grid-cols-4 lg:px-7">
          {[
            {
              label: "Unread alerts",
              value: settings.unreadNotifications,
              detail: "Need your attention",
              icon: Bell,
            },
            {
              label: "Active tasks",
              value: activeTasks,
              detail: "Currently assigned",
              icon: TimerReset,
            },
            {
              label: "Due this week",
              value: dueSoonTasks,
              detail: "Near-term deadlines",
              icon: Clock3,
            },
            {
              label: "Overdue",
              value: overdueTasks,
              detail: "Needs recovery plan",
              icon: AlertTriangle,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border/40 bg-background/35 p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                  {item.label}
                </p>
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-3 text-3xl font-semibold text-foreground">{item.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(340px,0.8fr)]">
        <section className="glass-card rounded-2xl p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Identity</p>
              <h3 className="mt-2 text-xl font-semibold text-foreground">Profile details</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Keep your name, title, timezone, and avatar current for tasks, standups, and messages.
              </p>
            </div>
            <div className="hidden rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-right text-xs text-primary sm:block">
              <p className="font-semibold">Live sync</p>
              <p className="text-primary/80">Header, team, and workspace views update from here.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm text-muted-foreground">
                  Full name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                  className="glass border-border/50 focus:border-primary/50 h-11"
                  placeholder="Ada Lovelace"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">
                  Work email
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                  className="glass border-border/50 focus:border-primary/50 h-11"
                  placeholder="name@company.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm text-muted-foreground">
                  Role title
                </Label>
                <Input
                  id="title"
                  name="title"
                  value={form.title}
                  onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                  className="glass border-border/50 focus:border-primary/50 h-11"
                  placeholder="Lead engineer"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="timezone" className="text-sm text-muted-foreground">
                  Timezone
                </Label>
                <Input
                  id="timezone"
                  name="timezone"
                  list="profile-timezones"
                  value={form.timezone}
                  onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                  className="glass border-border/50 focus:border-primary/50 h-11"
                  placeholder="Atlantic/Reykjavik"
                />
                <datalist id="profile-timezones">
                  {TIMEZONE_SUGGESTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="avatar" className="text-sm text-muted-foreground">
                Avatar URL or local path
              </Label>
              <Input
                id="avatar"
                name="avatar"
                value={form.avatar}
                onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.value }))}
                className="glass border-border/50 focus:border-primary/50 h-11"
                placeholder="https://example.com/avatar.png"
              />
              <p className="text-xs text-muted-foreground">
                Accepts hosted images and local paths inside the app&apos;s public folder.
              </p>
            </div>

            {saveMessage && (
              <div
                aria-live="polite"
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
                  saveMessage.type === "success"
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-destructive/30 bg-destructive/10 text-destructive",
                )}
              >
                {saveMessage.type === "success"
                  ? <CheckCircle2 className="h-4 w-4" />
                  : <AlertTriangle className="h-4 w-4" />}
                {saveMessage.text}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                Your current session will refresh after save so the new identity shows up everywhere.
              </p>
              <Button
                type="submit"
                disabled={isPending}
                className="min-w-40 shadow-lg shadow-primary/20"
              >
                {isPending ? "Saving..." : "Save profile"}
              </Button>
            </div>
          </form>
        </section>

        <div className="space-y-6">
          <section className="glass-card rounded-2xl p-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Signals</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">Delivery and preferences</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              <StatusPill enabled={settings.preferences.email} label="Email alerts" />
              <StatusPill enabled={settings.preferences.push} label="Push alerts" />
              <StatusPill enabled={settings.preferences.taskReminders} label="Task reminders" />
              <StatusPill enabled={settings.preferences.teamUpdates} label="Team updates" />
              <StatusPill enabled={!settings.preferences.quietHours} label="After-hours delivery" />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/40 bg-background/35 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Mail className="h-4 w-4 text-primary" />
                  Email delivery
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {settings.externalEmailConfigured
                    ? "External delivery is configured for real inbox notifications."
                    : "Inbox mirroring works, but external email delivery still needs configuration."}
                </p>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/35 p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <Bell className="h-4 w-4 text-primary" />
                  Browser push
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {settings.pushDeliveryConfigured
                    ? "Background push delivery is ready for subscribed browsers."
                    : "Permission can be granted now; background push needs VAPID keys on the server."}
                </p>
              </div>
            </div>

            <Button asChild variant="outline" className="mt-5 w-full glass border-primary/20 hover:border-primary/40 hover:bg-primary/5">
              <Link href="/settings">
                Open full notification controls
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </section>

          <section className="glass-card rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Focus queue</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">Assigned work</h3>
              </div>
              <Badge variant="outline" className="border-border/60 bg-background/35 font-mono">
                {activeTasks} active
              </Badge>
            </div>

            <div className="space-y-3">
              {settings.reminderTasks.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 bg-background/25 p-4 text-sm text-muted-foreground">
                  No active assigned tasks right now. Once work is routed to you, it will show up here.
                </div>
              )}

              {settings.reminderTasks.map((task) => {
                const dueState = formatDueLabel(task.dueDate)

                return (
                  <div key={task.id} className="rounded-xl border border-border/40 bg-background/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: task.project?.color ?? "var(--primary)" }}
                          />
                          <p className="truncate text-sm font-semibold text-foreground">
                            {task.title}
                          </p>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {task.project?.name ?? "No project"} - {task.status.replace(/_/g, " ").toLowerCase()}
                        </p>
                      </div>
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold", dueState.tone)}>
                        {dueState.label}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="glass-card rounded-2xl p-6">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Recent alerts</p>
                <h3 className="mt-2 text-lg font-semibold text-foreground">Notification snapshot</h3>
              </div>
              <Badge variant="outline" className="border-border/60 bg-background/35 font-mono">
                {settings.unreadNotifications} unread
              </Badge>
            </div>

            <div className="space-y-3">
              {settings.notifications.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 bg-background/25 p-4 text-sm text-muted-foreground">
                  No recent alerts yet. Project, sprint, and task activity will show here.
                </div>
              )}

              {settings.notifications.map((notification) => (
                <div key={notification.id} className="rounded-xl border border-border/40 bg-background/35 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {!notification.read && <span className="h-2 w-2 rounded-full bg-primary" />}
                        <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                      <p className="mt-2 text-[11px] font-mono text-muted-foreground">
                        {formatDateTime(notification.createdAt)}
                      </p>
                    </div>
                    {notification.link && (
                      <Button
                        asChild
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-primary"
                      >
                        <Link href={notification.link}>
                          <span className="sr-only">Open notification link for {notification.title}</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-card rounded-2xl p-6">
            <div className="mb-4">
              <p className="text-xs uppercase tracking-[0.18em] text-primary/80">Presence</p>
              <h3 className="mt-2 text-lg font-semibold text-foreground">How you show up</h3>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: "Workspace role",
                  value: profile.role,
                  icon: Shield,
                },
                {
                  label: "Displayed title",
                  value: profile.title || "Workspace contributor",
                  icon: Briefcase,
                },
                {
                  label: "Timezone",
                  value: profile.timezone || "UTC",
                  icon: Globe2,
                },
                {
                  label: "Identity source",
                  value: "Shared across header, team, standups, and messages",
                  icon: UserRound,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-start gap-3 rounded-xl border border-border/40 bg-background/35 p-4">
                  <div className="rounded-xl bg-primary/10 p-2">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
