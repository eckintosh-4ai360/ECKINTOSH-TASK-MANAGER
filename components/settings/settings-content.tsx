"use client"

import { type FormEvent, useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
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
  ExternalLink,
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
  Trash2,
  User,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  type SettingsNotification,
  type SettingsNotificationPreferences,
  type SettingsPageData,
  type SettingsProfile,
  type SettingsReminderLeadTime,
  DEFAULT_NOTIFICATION_PREFERENCES,
} from "@/lib/settings"
import {
  createTestReminderAction,
  deleteOwnAccountAction,
  deletePushSubscriptionAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
  saveNotificationPreferencesAction,
  savePushSubscriptionAction,
  updateProfileAction,
} from "@/lib/actions/settings-actions"

type BrowserPermission = NotificationPermission | "unsupported"

const REMINDER_LEAD_TIMES: Array<{
  value: SettingsReminderLeadTime
  label: string
  description: string
}> = [
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

function getBrowserPermission(): BrowserPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported"
  return window.Notification.permission
}

function mergePreferences(input: Partial<SettingsNotificationPreferences>): SettingsNotificationPreferences {
  return {
    ...DEFAULT_NOTIFICATION_PREFERENCES,
    ...input,
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index)
  }

  return outputArray
}

function supportsPushMessaging() {
  return typeof window !== "undefined"
    && "serviceWorker" in navigator
    && "PushManager" in window
}

async function getPushRegistration() {
  if (!supportsPushMessaging()) return null

  return navigator.serviceWorker.register("/notifications-sw.js")
}

function showLocalTestNotification() {
  if (typeof window === "undefined" || !("Notification" in window) || window.Notification.permission !== "granted") {
    return false
  }

  new window.Notification("Spagad task reminder", {
    body: "Reminder flow is live. Your deadlines will not sneak past the perimeter.",
  })
  return true
}

function ProfileMeta({ profile }: { profile: SettingsProfile }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[
        { label: "Role", value: profile.role, icon: Shield },
        { label: "Workspace", value: "Spagad", icon: Briefcase },
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
  const preferencesRef = useRef(settings.preferences)
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [profile, setProfile] = useState(settings.profile)
  const [notifications, setNotifications] = useState(settings.notifications)
  const [unreadNotifications, setUnreadNotifications] = useState(settings.unreadNotifications)
  const [form, setForm] = useState({
    name: settings.profile.name,
    email: settings.profile.email,
    title: settings.profile.title ?? "",
    timezone: settings.profile.timezone ?? "UTC",
    avatar: settings.profile.avatar ?? "",
  })
  const [profileMessage, setProfileMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [preferences, setPreferences] = useState<SettingsNotificationPreferences>(mergePreferences(settings.preferences))
  const [permission, setPermission] = useState<BrowserPermission>("default")
  const [notificationMessage, setNotificationMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isProfilePending, startProfileTransition] = useTransition()
  const [isPreferencesPending, startPreferencesTransition] = useTransition()
  const [isNotificationPending, startNotificationTransition] = useTransition()
  const [isDeletePending, startDeleteTransition] = useTransition()

  const activeTheme = mounted ? resolvedTheme ?? theme : "dark"
  const isDarkMode = activeTheme === "dark"
  const initials = getInitials(form.name || profile.name, form.email || profile.email)

  useEffect(() => {
    setMounted(true)
    setPermission(getBrowserPermission())
  }, [])

  useEffect(() => {
    setProfile(settings.profile)
    setNotifications(settings.notifications)
    setUnreadNotifications(settings.unreadNotifications)
    const mergedPreferences = mergePreferences(settings.preferences)
    setPreferences(mergedPreferences)
    preferencesRef.current = mergedPreferences
    setForm({
      name: settings.profile.name,
      email: settings.profile.email,
      title: settings.profile.title ?? "",
      timezone: settings.profile.timezone ?? "UTC",
      avatar: settings.profile.avatar ?? "",
    })
  }, [settings])

  useEffect(() => {
    preferencesRef.current = preferences
  }, [preferences])

  function persistPreferences(
    nextInput: SettingsNotificationPreferences | ((current: SettingsNotificationPreferences) => SettingsNotificationPreferences),
    successText: string,
  ) {
    const previousPreferences = preferencesRef.current
    const nextPreferences = mergePreferences(
      typeof nextInput === "function" ? nextInput(previousPreferences) : nextInput,
    )

    setPreferences(nextPreferences)
    preferencesRef.current = nextPreferences

    startPreferencesTransition(() => {
      void saveNotificationPreferencesAction(nextPreferences)
        .then((result) => {
          if (!result.success || !result.preferences) {
            setPreferences(previousPreferences)
            preferencesRef.current = previousPreferences
            setNotificationMessage({
              type: "error",
              text: "Could not save notification preferences.",
            })
            return
          }

          const normalized = mergePreferences(result.preferences)
          setPreferences(normalized)
          preferencesRef.current = normalized
          setNotificationMessage({ type: "success", text: successText })
        })
        .catch(() => {
          setPreferences(previousPreferences)
          preferencesRef.current = previousPreferences
          setNotificationMessage({
            type: "error",
            text: "Could not save notification preferences.",
          })
        })
    })
  }

  function updatePreference<Key extends keyof SettingsNotificationPreferences>(
    key: Key,
    value: SettingsNotificationPreferences[Key],
    successText = "Notification preferences saved to your account.",
  ) {
    persistPreferences((current) => ({ ...current, [key]: value }), successText)
  }

  async function syncPushSubscription() {
    if (!supportsPushMessaging() || !settings.vapidPublicKey) {
      return { subscribed: false }
    }

    const registration = await getPushRegistration()
    if (!registration) {
      return { subscribed: false }
    }

    let subscription = await registration.pushManager.getSubscription()
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(settings.vapidPublicKey),
      })
    }

    const payload = subscription.toJSON()
    if (!payload.endpoint || !payload.keys?.p256dh || !payload.keys?.auth) {
      return { subscribed: false }
    }

    const result = await savePushSubscriptionAction({
      endpoint: payload.endpoint,
      expirationTime: payload.expirationTime ?? null,
      keys: {
        p256dh: payload.keys.p256dh,
        auth: payload.keys.auth,
      },
    })

    return {
      subscribed: result.success,
      endpoint: payload.endpoint,
    }
  }

  async function removePushSubscriptionFromBrowser() {
    if (!supportsPushMessaging()) return

    const registration = await navigator.serviceWorker.getRegistration("/notifications-sw.js")
    if (!registration) return

    const subscription = await registration.pushManager.getSubscription()
    const endpoint = subscription?.endpoint
    await subscription?.unsubscribe()

    if (endpoint) {
      await deletePushSubscriptionAction(endpoint)
    }
  }

  async function handlePushChange(enabled: boolean) {
    if (!enabled) {
      await removePushSubscriptionFromBrowser()
      setPermission(getBrowserPermission())
      persistPreferences(
        (current) => ({ ...current, push: false }),
        "Push notifications turned off for this account.",
      )
      return
    }

    if (typeof window === "undefined" || !("Notification" in window)) {
      setPermission("unsupported")
      setNotificationMessage({
        type: "error",
        text: "This browser does not support desktop notifications.",
      })
      return
    }

    let nextPermission = window.Notification.permission
    if (nextPermission === "default") {
      nextPermission = await window.Notification.requestPermission()
    }

    setPermission(nextPermission)

    if (nextPermission !== "granted") {
      persistPreferences(
        (current) => ({ ...current, push: false }),
        "Browser push is blocked. Enable notifications in your browser settings to use alerts.",
      )
      return
    }

    let pushStatusText = "Browser notifications are ready for this account."
    try {
      const pushResult = await syncPushSubscription()
      if (pushResult.subscribed && settings.pushDeliveryConfigured) {
        pushStatusText = "Push notifications are live. Test reminders can now reach this browser."
      } else if (pushResult.subscribed) {
        pushStatusText = "Permission is granted, but VAPID keys are still missing on the server for background push delivery."
      } else if (!settings.vapidPublicKey) {
        pushStatusText = "Permission is granted. Add VAPID keys to enable true background web push delivery."
      } else {
        pushStatusText = "Permission is granted, but this browser could not finish web push subscription."
      }
    } catch {
      pushStatusText = "Permission is granted, but this browser could not finish web push subscription."
    }

    persistPreferences(
      (current) => ({ ...current, push: true }),
      pushStatusText,
    )
  }

  async function testReminder() {
    if (!preferencesRef.current.taskReminders) {
      setNotificationMessage({
        type: "error",
        text: "Turn on task reminders first, then fire the test ping.",
      })
      return
    }

    startNotificationTransition(() => {
      void createTestReminderAction()
        .then((result) => {
          if (!result.success || !result.notification) {
            setNotificationMessage({
              type: "error",
              text: "error" in result && result.error
                ? result.error
                : "Could not create a test reminder.",
            })
            return
          }

          setNotifications((current) => [result.notification, ...current].slice(0, 6))
          setUnreadNotifications(result.unreadNotifications ?? unreadNotifications)

          const localNotificationDisplayed = showLocalTestNotification()
          const pushDelivered = result.pushResult?.success && (result.pushResult.sentCount ?? 0) > 0
          const emailDelivered = result.emailResult?.success
          const emailStatus = preferencesRef.current.email
            ? emailDelivered
              ? " Real inbox email sent too."
              : result.emailResult?.skipped
                ? " Add Resend or SMTP env vars to send real inbox emails."
                : result.emailResult?.error
                  ? ` Email delivery failed: ${result.emailResult.error}`
                  : ""
            : ""

          const text = pushDelivered
            ? `Test reminder sent. ${result.pushResult.sentCount} browser subscription${result.pushResult.sentCount === 1 ? "" : "s"} received it.${emailStatus}`
            : localNotificationDisplayed
              ? `Test reminder created and shown in this browser. Add VAPID keys if you want true background push delivery.${emailStatus}`
              : result.pushResult?.error
                ? `Test reminder created. ${result.pushResult.error}${emailStatus}`
                : `Test reminder created in-app.${emailStatus}`

          setNotificationMessage({ type: "success", text })
        })
        .catch(() => {
          setNotificationMessage({
            type: "error",
            text: "Could not create a test reminder.",
          })
        })
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileMessage(null)

    const formData = new FormData(event.currentTarget)

    startProfileTransition(() => {
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

  function updateNotificationState(notificationId: string, read: boolean) {
    setNotifications((current) =>
      current.map((notification) =>
        notification.id === notificationId
          ? { ...notification, read }
          : notification,
      ),
    )
  }

  function toggleNotificationRead(notificationId: string, read: boolean) {
    startNotificationTransition(() => {
      void markNotificationReadAction(notificationId, read)
        .then((result) => {
          if (!result.success) {
            setNotificationMessage({
              type: "error",
              text: "Could not update the notification state.",
            })
            return
          }

          updateNotificationState(notificationId, read)
          setUnreadNotifications(result.unreadNotifications)
        })
        .catch(() => {
          setNotificationMessage({
            type: "error",
            text: "Could not update the notification state.",
          })
        })
    })
  }

  function handleNotificationOpen(notification: SettingsNotification) {
    if (!notification.read) {
      toggleNotificationRead(notification.id, true)
    }

    if (notification.link) {
      router.push(notification.link)
    }
  }

  function markAllNotificationsRead() {
    startNotificationTransition(() => {
      void markAllNotificationsReadAction()
        .then((result) => {
          if (!result.success) {
            setNotificationMessage({
              type: "error",
              text: "Could not mark notifications as read.",
            })
            return
          }

          setNotifications((current) => current.map((notification) => ({ ...notification, read: true })))
          setUnreadNotifications(result.unreadNotifications)
          setNotificationMessage({
            type: "success",
            text: "All recent notifications marked as read.",
          })
        })
        .catch(() => {
          setNotificationMessage({
            type: "error",
            text: "Could not mark notifications as read.",
          })
        })
    })
  }

  function handleDeleteAccount() {
    startDeleteTransition(() => {
      void deleteOwnAccountAction()
        .then((result) => {
          if (!result.success || !result.redirectTo) {
            setProfileMessage({
              type: "error",
              text: "Could not delete your account right now.",
            })
            return
          }

          setDeleteDialogOpen(false)
          window.location.assign(result.redirectTo)
        })
        .catch(() => {
          setProfileMessage({
            type: "error",
            text: "Could not delete your account right now.",
          })
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
            disabled={isProfilePending}
            className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
          >
            {isProfilePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
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
            <span className="font-mono text-primary">{unreadNotifications}</span> unread in-app alerts
          </div>
        </div>

        <div className="grid gap-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {[
              {
                key: "email" as const,
                label: "Email notifications",
                description: "Account activity, security updates, and delivery summaries.",
                detail: preferences.email
                  ? settings.externalEmailConfigured
                    ? "Real inbox delivery is active through Resend or SMTP."
                    : "Saved. Add Resend or SMTP env vars to deliver real inbox email."
                  : "Muted for in-app email copies and real inbox delivery.",
                icon: Mail,
                checked: preferences.email,
                onChange: (checked: boolean) => updatePreference("email", checked),
              },
              {
                key: "push" as const,
                label: "Push notifications",
                description: permission === "denied" ? "Blocked in browser settings." : "Browser alerts for urgent work.",
                detail:
                  permission === "granted"
                    ? settings.pushDeliveryConfigured
                      ? "Permission granted and web push delivery is configured."
                      : "Permission granted. Add VAPID keys for true background web push."
                    : permission === "unsupported"
                      ? "This browser does not support web notifications."
                      : "Permission will be requested when enabled.",
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
                detail: "These preferences now gate future in-app alert writes.",
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
                  disabled={isPreferencesPending}
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
                disabled={isNotificationPending}
                className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5"
              >
                {isNotificationPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
                      disabled={!preferences.taskReminders || isPreferencesPending}
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
                      disabled={!preferences.taskReminders || isPreferencesPending}
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
                          {task.project?.name ?? "No project"} · {task.status.replace(/_/g, " ").toLowerCase()} · {formatDateTime(task.dueDate)}
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
              <div
                className={cn(
                  "mt-4 flex items-center gap-2 rounded-xl border px-4 py-3 text-sm",
                  notificationMessage.type === "success"
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-destructive/30 bg-destructive/10 text-destructive",
                )}
              >
                {notificationMessage.type === "success" ? <BellRing className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                {notificationMessage.text}
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
              {unreadNotifications > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={markAllNotificationsRead}
                  disabled={isNotificationPending}
                  className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                >
                  Mark all read
                </Button>
              )}
            </div>
            <div className="grid gap-2">
              {notifications.length === 0 && (
                <div className="rounded-xl border border-dashed border-border/60 p-4 text-sm text-muted-foreground">
                  No notifications yet. The bell will light up when project, sprint, or task events land here.
                </div>
              )}
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "rounded-xl border border-border/40 bg-background/35 p-3 transition-all",
                    notification.link && "hover:border-primary/30 hover:bg-primary/5",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => handleNotificationOpen(notification)}
                      className="flex-1 text-left"
                    >
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                        </div>
                        {notification.link && <ExternalLink className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />}
                      </div>
                    </button>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.read && <span className="h-2 w-2 rounded-full bg-primary shadow-lg shadow-primary/40" />}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleNotificationRead(notification.id, !notification.read)}
                        disabled={isNotificationPending}
                        className="h-7 px-2 text-xs"
                      >
                        {notification.read ? "Mark unread" : "Mark read"}
                      </Button>
                    </div>
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
            <Button
              type="button"
              variant="outline"
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Delete Account
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="glass-card border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes your user record and the workspace data tied to it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                handleDeleteAccount()
              }}
              disabled={isDeletePending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeletePending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Delete account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
