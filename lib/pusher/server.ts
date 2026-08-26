import Pusher from "pusher"

let cachedPusherServer: Pusher | null = null

export function getPusherServer(): Pusher | null {
  if (cachedPusherServer) return cachedPusherServer

  const appId = process.env.PUSHER_APP_ID
  const key = process.env.PUSHER_KEY ?? process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER ?? process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? "mt1"

  if (!appId || !key || !secret) {
    return null
  }

  cachedPusherServer = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  })

  return cachedPusherServer
}

export const WORKSPACE_PRESENCE_CHANNEL = "presence-workspace"
