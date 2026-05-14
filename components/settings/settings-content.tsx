"use client"

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useTheme } from "@/components/theme-provider"
import {
  AlertTriangle,
  AtSign,
  Bell,
  BellRing,
  Briefcase,
  CalendarClock,
  Camera,
  CheckCircle2,
  Clock3,
  Globe2,
  Image as ImageIcon,
  Inbox,
  ListChecks,
  Loader2,
  Lock,
  Mail,
  Moon,
  Palette,
  Save,
  Send,
  Shield,
  Smartphone,
  Sun,
  TimerReset,
  User,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type SettingsPageData,
  type SettingsProfile,
  updateProfileAction,
} from "@/lib/actions/settings-actions"

const PREFERENCES_STORAGE_KEY = "eckintosh-notification-preferences"

type BrowserPermission = NotificationPermission | "unsupported"
type ReminderLeadTime = "15m" | "1h" | "1d" | "3d"

type NotificationPreferences = {
  email: boolean
  push: boolean
  taskReminders: boolean
  teamUpdates: boolean
  dailyDigest: boolean
  overdueEscalation: boolean
  quietHours: boolean
  reminderLeadTime: ReminderLeadTime
}

const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  email: true,
  push: false,
  taskReminders: true,
  teamUpdates: true,
  dailyDigest: true,
  overdueEscalation: true,
  quietHours: false,
  reminderLeadTime: "1d",
}

const REMINDER_LEAD_TIMES: Array<{ value: ReminderLeadTime; label: string; description: string }> = [
  { value: "15m", label: "15 min", description: "Last-call ping" },
  { value: "1h", label: "1 hour", description: "Focus buffer" },
  { value: "1d", label: "1 day", description: "Default" },
  { value: "3d", label: "3 days", description: "Early warning" },
]

const TIMEZONE_OPTIONS = [
  "UTC",
  "Atlantic/Reykjavik",
  "Africa/Lagos",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
]

type SettingsContentProps = {
  settings: SettingsPageData
}

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

function formatDateTime(value: string | null) {
  if (!value) return "No date set"

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value))
}

function getDueState(value: string | null) {
  if (!value) return { label: "No due date", tone: "text-muted-foreground border-border/50 bg-muted/20" }

  const now = new Date()
  const due = new Date(value)
  const msInDay = 1000 * 60 * 60 * 24
  const diffDays = Math.ceil((due.getTime() - now.getTime()) / msInDay)

  if (diffDays < 0) return { label: `${Math.abs(diffDays)}d overdue`, tone: "text-destructive border-destructive/30 bg-destructive/10" }
  if (diffDays === 0) return { label: "Due today", tone: "text-amber-500 border-amber-400/30 bg-amber-400/10" }
  if (diffDays === 1) return { label: "Due tomorrow", tone: "text-primary border-primary/30 bg-primary/10" }

  return { label: `Due in ${diffDays}d`, tone: "text-primary border-primary/30 bg-primary/10" }
}

function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES

  try {
    const stored = window.localStorage.getItem(PREFERENCES_STORAGE_KEY)
    if (!stored) return DEFAULT_NOTIFICATION_PREFERENCES

    return {
      ...DEFAULT_NOTIFICATION_PREFERENCES,
      ...JSON.parse(stored),
    }
  } catch {
    return DEFAULT_NOTIFICATION_PREFERENCES
  }
}

function getBrowserPermission(): BrowserPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return window.Notification.permission
}

function ProfileMeta({ profile }: { profile: SettingsProfile }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[
        { label: "Role", value: profile.role, icon: Shield },
        { label: "Workspace", value: "Eckintosh", icon: Briefcase },
        { label: "Joined", value: profile.joinedAt ? new Date(profile.joinedAt).toLocaleDateString() : "Active", icon: CalendarClock },
      ].map((item) => (
        <div key={item.label} className="glass rounded-xl p-3 border border-border/40">
          <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground mb-1">
            <item.icon className="w-3.5 h-3.5 text-primary" />
            {item.label}
          </div>
          <p className="text-sm font-semibold text-foreground truncate">{item.value}</p>
        </div>
      ))}
    </div>
  )
}

export function SettingsContent({ settings }: SettingsContentProps) {
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState(settings.profile)
  const [form, setForm] = useState({
    name: settings.profile.name,
    email: settings.profile.email,
    title: settings.profile.title ?? "",
    timezone: settings.profile.timezone ?? "UTC",
    avatar: settings.profile.avatar ?? "",
  })
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES)
  const [preferencesReady, setPreferencesReady] = useState(false)
  const [permission, setPermission] = useState<BrowserPermission>("default")
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null)

  const activeTheme = mounted ? resolvedTheme ?? theme : "dark"
  const isDarkMode = activeTheme === "dark"
  const initials = getInitials(form.name || profile.name, form.email || profile.email)

  useEffect(() => {
    setMounted(true)
    setPreferences(loadNotificationPreferences())
    setPermission(getBrowserPermission())
    setPreferencesReady(true)
  }, [])

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

  useEffect(() => {
    if (!preferencesReady) return
    window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences))
  }, [preferences, preferencesReady])

  function updatePreference<Key extends keyof NotificationPreferences>(
    key: Key,
    value: NotificationPreferences[Key],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }))
    setNotificationMessage("Notification preferences saved for this browser.")
  }

  async function handlePushChange(enabled: boolean) {
    if (!enabled) {
      updatePreference("push", false)
      return
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported")
      setNotificationMessage("This browser does not support desktop push notifications.")
      return
    }

    let nextPermission = window.Notification.permission
    if (nextPermission === "default") {
      nextPermission = await window.Notification.requestPermission()
    }

    setPermission(nextPermission)
    updatePreference("push", nextPermission === "granted")
    setNotificationMessage(
      nextPermission === "granted"
        ? "Push notifications are ready. The dashboard can now send browser reminders."
        : "Browser push is blocked. Enable notifications in your browser settings to use push alerts.",
    )
  }

  async function testReminder() {
    if (!preferences.taskReminders) {
      setNotificationMessage("Turn on task reminders first, then fire the test ping.")
      return
    }

    if (typeof window !== "undefined" && "Notification" in window) {
      let nextPermission = window.Notification.permission
      if (nextPermission === "default") {
        nextPermission = await window.Notification.requestPermission()
      }

      setPermission(nextPermission)
      if (nextPermission === "granted") {
        new window.Notification("Eckintosh task reminder", {
          body: "Reminder flow is live. Your deadlines will not sneak past the perimeter.",
        })
        setNotificationMessage("Test reminder sent.")
        return
      }
    }

    setNotificationMessage("Test reminder saved here. Browser push needs permission before desktop alerts can appear.")
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileMessage(null)

    const formData = new FormData(event.currentTarget)

    startTransition(() => {
      void updateProfileAction(formData)
        .then((result) => {
          if (!result.success || !result.profile) {
            const errorMessage = "error" in result && result.error
              ? result.error
              : "Something went wrong while saving your profile."
            setProfileMessage({ type: "error", text: errorMessage })
            return
          }

          const updatedProfile = result.profile
          setProfile(updatedProfile)
          setForm({
            name: updatedProfile.name,
            email: updatedProfile.email,
            title: updatedProfile.title ?? "",
            timezone: updatedProfile.timezone ?? "UTC",
            avatar: updatedProfile.avatar ?? "",
          })
          setProfileMessage({ type: "success", text: "Profile saved and synced with your session." })
          router.refresh()
        })
        .catch(() => {
          setProfileMessage({ type: "error", text: "Something went wrong while saving your profile." })
        })
    })
  }

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl">
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center border border-primary/30">
            <User className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Profile Information</h3>
            <p className="text-xs text-muted-foreground">Pulled from your active login and stored on your account.</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="relative group w-fit">
              <Avatar className="w-24 h-24 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all shadow-xl shadow-primary/10">
                <AvatarImage src={form.avatar || undefined} alt={form.name} />
                <AvatarFallback className="bg-primary/10 text-primary font-mono text-xl">{initials}</AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.focus()}
                className="absolute inset-0 rounded-full bg-black/55 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                aria-label="Change profile photo"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <p className="text-xl font-semibold text-foreground">{profile.name}</p>
                <p className="text-sm text-muted-foreground">{profile.email}</p>
              </div>
              <ProfileMeta profile={profile} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm text-muted-foreground flex items-center gap-2">
                <User className="w-3.5 h-3.5 text-primary" />
                Full Name
              </Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="glass border-primary/20 focus:border-primary/50 h-11"
                autoComplete="name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-muted-foreground flex items-center gap-2">
                <AtSign className="w-3.5 h-3.5 text-primary" />
                Email
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="glass border-primary/20 focus:border-primary/50 h-11"
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="title" className="text-sm text-muted-foreground flex items-center gap-2">
                <Briefcase className="w-3.5 h-3.5 text-primary" />
                Role Title
              </Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                placeholder="Frontend Engineer"
                className="glass border-primary/20 focus:border-primary/50 h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone" className="text-sm text-muted-foreground flex items-center gap-2">
                <Globe2 className="w-3.5 h-3.5 text-primary" />
                Time Zone
              </Label>
              <select
                id="timezone"
                name="timezone"
                value={form.timezone}
                onChange={(event) => setForm((current) => ({ ...current, timezone: event.target.value }))}
                className="glass border-primary/20 focus:border-primary/50 h-11 w-full rounded-md px-3 text-sm text-foreground outline-none"
              >
                {TIMEZONE_OPTIONS.map((timezone) => (
                  <option key={timezone} value={timezone}>
                    {timezone}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="avatar" className="text-sm text-muted-foreground flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-primary" />
                Profile Photo URL
              </Label>
              <Input
                ref={avatarInputRef}
                id="avatar"
                name="avatar"
                value={form.avatar}
                onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.value }))}
                placeholder="https://example.com/avatar.png"
                className="glass border-primary/20 focus:border-primary/50 h-11"
              />
              <p className="text-xs text-muted-foreground">Use the avatar from login, a local path, or paste a hosted JPG, PNG, GIF, or WebP URL.</p>
            </div>
          </div>

          {profileMessage && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
                profileMessage.type === "success"
                  ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-500"
                  : "border-destructive/30 bg-destructive/10 text-destructive",
              )}
            >
              {profileMessage.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
              {profileMessage.text}
            </div>
          )}

          <Button
            type="submit"
            disabled={isPending}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </form>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center border border-primary/30">
              <Bell className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground">Choose how account updates, team activity, and task reminders reach you.</p>
            </div>
          </div>
          <div className="glass rounded-xl px-3 py-2 text-xs text-muted-foreground border border-border/40">
            <span className="font-mono text-primary">{settings.unreadNotifications}</span> unread in-app alerts
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[
              {
                key: "email" as const,
                label: "Email notifications",
                description: "Account activity, security updates, and delivery summaries.",
                detail: "Best for durable audit trails.",
                icon: Mail,
                checked: preferences.email,
                onChange: (checked: boolean) => updatePreference("email", checked),
              },
              {
                key: "push" as const,
                label: "Push notifications",
                description: permission === "denied" ? "Blocked in browser settings." : "Browser alerts for urgent work.",
                detail: permission === "granted" ? "Permission granted." : permission === "unsupported" ? "Not supported here." : "Permission requested when enabled.",
                icon: Smartphone,
                checked: preferences.push,
                onChange: handlePushChange,
              },
              {
                key: "taskReminders" as const,
                label: "Task reminders",
                description: "Deadline warnings for active tasks assigned to you.",
                detail: `${settings.reminderSummary.activeAssigned} active assigned tasks watched.`,
                icon: TimerReset,
                checked: preferences.taskReminders,
                onChange: (checked: boolean) => updatePreference("taskReminders", checked),
              },
              {
                key: "teamUpdates" as const,
                label: "Team updates",
                description: "Standups, sprint movement, assignments, and collaboration events.",
                detail: "Keeps the workspace pulse visible.",
                icon: Users,
                checked: preferences.teamUpdates,
                onChange: (checked: boolean) => updatePreference("teamUpdates", checked),
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-4 p-4 rounded-xl glass border border-transparent hover:border-primary/20 transition-all"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <item.icon className="w-4 h-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                    <p className="text-xs text-primary/75 mt-1">{item.detail}</p>
                  </div>
                </div>
                <Switch
                  checked={item.checked}
                  onCheckedChange={item.onChange}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            ))}
          </div>

          <div className={cn("rounded-2xl border border-primary/15 glass p-4 transition-opacity", !preferences.taskReminders && "opacity-60")}>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ListChecks className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Task Reminder Details</p>
                  <p className="text-sm text-muted-foreground">Control timing, escalation, digests, and test desktop delivery.</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={testReminder}
                className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                <Send className="w-4 h-4" />
                Test reminder
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-4">
              {[
                { label: "Active", value: settings.reminderSummary.activeAssigned, icon: Clock3, tone: "text-primary" },
                { label: "Due soon", value: settings.reminderSummary.dueSoon, icon: BellRing, tone: "text-amber-500" },
                { label: "Overdue", value: settings.reminderSummary.overdue, icon: AlertTriangle, tone: "text-destructive" },
              ].map((stat) => (
                <div key={stat.label} className="rounded-xl border border-border/40 bg-background/35 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">{stat.label}</p>
                    <stat.icon className={cn("w-4 h-4", stat.tone)} />
                  </div>
                  <p className={cn("mt-2 text-2xl font-bold font-mono", stat.tone)}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">Reminder lead time</p>
                <div className="grid grid-cols-2 gap-2">
                  {REMINDER_LEAD_TIMES.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updatePreference("reminderLeadTime", option.value)}
                      disabled={!preferences.taskReminders}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        preferences.reminderLeadTime === option.value
                          ? "border-primary/50 bg-primary/10 text-foreground shadow-lg shadow-primary/10"
                          : "border-border/40 bg-background/30 text-muted-foreground hover:border-primary/30",
                      )}
                    >
                      <span className="block text-sm font-semibold">{option.label}</span>
                      <span className="text-xs">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {[
                  {
                    key: "dailyDigest" as const,
                    label: "Daily task digest",
                    description: "One clean summary of your due and overdue tasks.",
                    icon: Inbox,
                  },
                  {
                    key: "overdueEscalation" as const,
                    label: "Overdue escalation",
                    description: "Raise the signal when deadlines slip.",
                    icon: AlertTriangle,
                  },
                  {
                    key: "quietHours" as const,
                    label: "Quiet hours",
                    description: "Hold non-urgent reminders overnight.",
                    icon: Moon,
                  },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between gap-4 rounded-xl border border-border/40 bg-background/30 p-3">
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.label}</p>
                        <p className="text-xs text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Switch
                      checked={preferences[item.key]}
                      disabled={!preferences.taskReminders}
                      onCheckedChange={(checked) => updatePreference(item.key, checked)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground mb-2">Watched task deadlines</p>
              <div className="grid gap-2">
                {settings.reminderTasks.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                    No active assigned tasks yet. Once tasks are assigned to you, reminders will appear here.
                  </div>
                )}
                {settings.reminderTasks.map((task) => {
                  const dueState = getDueState(task.dueDate)
                  return (
                    <div key={task.id} className="flex flex-col gap-3 rounded-xl border border-border/40 bg-background/35 p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: task.project?.color ?? "var(--primary)" }}
                          />
                          <p className="font-semibold text-sm text-foreground truncate">{task.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {task.project?.name ?? "No project"} · {task.status.replace("_", " ").toLowerCase()} · {formatDateTime(task.dueDate)}
                        </p>
                      </div>
                      <span className={cn("rounded-full border px-2.5 py-1 text-xs font-semibold whitespace-nowrap", dueState.tone)}>
                        {dueState.label}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            {notificationMessage && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-primary">
                <BellRing className="w-4 h-4" />
                {notificationMessage}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border/40 glass p-4">
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Inbox className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Recent in-app notifications</p>
                  <p className="text-sm text-muted-foreground">Latest workspace alerts for this logged-in user.</p>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              {settings.notifications.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                  No notifications yet. The bell will light up when project, sprint, or task events land here.
                </div>
              )}
              {settings.notifications.map((notification) => (
                <div key={notification.id} className="rounded-xl border border-border/40 bg-background/35 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                    </div>
                    {!notification.read && <span className="h-2 w-2 rounded-full bg-primary shadow-lg shadow-primary/40 mt-1" />}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2 font-mono">{formatDateTime(notification.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 flex items-center justify-center border border-primary/30">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Appearance</h3>
            <p className="text-xs text-muted-foreground">Dark stays as the command-center default. Light mode gets a clean white control-room skin.</p>
          </div>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl glass border border-transparent p-4 sm:flex-row sm:items-center sm:justify-between hover:border-primary/20 transition-all">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {isDarkMode ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            </div>
            <div>
              <p className="font-medium text-foreground">{isDarkMode ? "Dark Mode" : "Light Mode"}</p>
              <p className="text-sm text-muted-foreground">
                {isDarkMode ? "Current cyber-glass UI is active." : "White theme is active with softer cards and brighter surfaces."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-muted-foreground">{isDarkMode ? "DARK" : "LIGHT"}</span>
            <Switch
              checked={isDarkMode}
              onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center border border-destructive/30">
            <Lock className="w-4 h-4 text-destructive" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Danger Zone</h3>
        </div>
        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">Delete Account</p>
              <p className="text-sm text-muted-foreground">Permanently delete your account and all workspace data.</p>
            </div>
            <Button type="button" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50">
              Delete Account
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
