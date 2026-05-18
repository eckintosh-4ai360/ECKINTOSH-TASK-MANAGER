import webpush from "web-push"
import prisma from "@/lib/prisma"

export type PushSubscriptionInput = {
  endpoint: string
  expirationTime: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

export type PushNotificationPayload = {
  title: string
  body: string
  url?: string
  tag?: string
}

let vapidConfigured = false

function getPushConfig() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ""
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? ""
  const subject = process.env.VAPID_SUBJECT ?? "mailto:admin@eckintosh.dev"

  return {
    publicKey,
    privateKey,
    subject,
    isConfigured: Boolean(publicKey && privateKey),
  }
}

function getWebPushClient() {
  const config = getPushConfig()
  if (!config.isConfigured) return null

  if (!vapidConfigured) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
    vapidConfigured = true
  }

  return webpush
}

function toDbExpirationTime(value: number | null) {
  return typeof value === "number" && Number.isFinite(value) ? new Date(value) : null
}

function toWebPushSubscription(subscription: {
  endpoint: string
  expirationTime: Date | null
  p256dh: string
  auth: string
}) {
  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime?.getTime() ?? null,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  }
}

export function hasWebPushConfig() {
  return getPushConfig().isConfigured
}

export function getPublicVapidKey() {
  return getPushConfig().publicKey || null
}

export async function upsertPushSubscription(userId: string, subscription: PushSubscriptionInput) {
  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return { success: false, error: "Incomplete push subscription payload." }
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: {
      userId,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expirationTime: toDbExpirationTime(subscription.expirationTime),
    },
    create: {
      userId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      expirationTime: toDbExpirationTime(subscription.expirationTime),
    },
  })

  return { success: true }
}

export async function deletePushSubscription(userId: string, endpoint: string) {
  if (!endpoint) return { success: true }

  await prisma.pushSubscription.deleteMany({
    where: {
      userId,
      endpoint,
    },
  })

  return { success: true }
}

export async function sendPushNotificationToUserSubscriptions(
  userId: string,
  payload: PushNotificationPayload,
) {
  const client = getWebPushClient()
  if (!client) {
    return {
      success: false,
      sentCount: 0,
      error: "Web push is not configured.",
    }
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: {
      endpoint: true,
      expirationTime: true,
      p256dh: true,
      auth: true,
    },
  })

  if (subscriptions.length === 0) {
    return {
      success: false,
      sentCount: 0,
      error: "No active push subscriptions found for this user.",
    }
  }

  const staleEndpoints: string[] = []
  let sentCount = 0

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await client.sendNotification(
          toWebPushSubscription(subscription),
          JSON.stringify(payload),
        )
        sentCount += 1
      } catch (error: any) {
        const statusCode = error?.statusCode as number | undefined
        if (statusCode === 404 || statusCode === 410) {
          staleEndpoints.push(subscription.endpoint)
        }
      }
    }),
  )

  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: staleEndpoints } },
    })
  }

  return {
    success: sentCount > 0,
    sentCount,
    error: sentCount > 0 ? null : "Push delivery could not reach any active browser subscription.",
  }
}
