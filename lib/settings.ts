export type SettingsReminderLeadTime = "15m" | "1h" | "1d" | "3d"

export type SettingsNotificationPreferences = {
  email: boolean
  push: boolean
  taskReminders: boolean
  teamUpdates: boolean
  dailyDigest: boolean
  overdueEscalation: boolean
  quietHours: boolean
  reminderLeadTime: SettingsReminderLeadTime
}

export const DEFAULT_NOTIFICATION_PREFERENCES: SettingsNotificationPreferences = {
  email: true,
  push: false,
  taskReminders: true,
  teamUpdates: true,
  dailyDigest: true,
  overdueEscalation: true,
  quietHours: false,
  reminderLeadTime: "1d",
}

export type SettingsProfile = {
  id: string
  email: string
  name: string
  role: "ADMIN" | "USER" | "GUEST"
  avatar: string | null
  title: string | null
  timezone: string | null
  joinedAt: string | null
}

export type SettingsNotification = {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  link: string | null
  createdAt: string
}

export type SettingsReminderTask = {
  id: string
  title: string
  status: string
  priority: string
  dueDate: string | null
  project: {
    name: string
    color: string
  } | null
}

export type SettingsReminderSummary = {
  activeAssigned: number
  dueSoon: number
  overdue: number
}

export type SettingsPageData = {
  profile: SettingsProfile
  preferences: SettingsNotificationPreferences
  notifications: SettingsNotification[]
  unreadNotifications: number
  reminderTasks: SettingsReminderTask[]
  reminderSummary: SettingsReminderSummary
  externalEmailConfigured: boolean
  pushDeliveryConfigured: boolean
  vapidPublicKey: string | null
}
