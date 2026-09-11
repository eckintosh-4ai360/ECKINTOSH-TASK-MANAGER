import "dotenv/config"
import { createServer } from "http"
import { parse } from "url"
import next from "next"
import WebSocket, { WebSocketServer } from "ws"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"
import { hasPermission } from "@/lib/rbac"
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session"
import { effectiveWorkspaceRole, type WorkspaceRole } from "@/lib/workspace"
import { getDatabaseSslOptions, normalizeDatabaseUrl } from "@/lib/db-ssl"

const { Pool } = pg
const dev = process.env.NODE_ENV !== "production"
// Vercel never runs this file. Docker uses it as the single HTTP + WebSocket
// process, so bind to all interfaces inside the container.
const hostname = process.env.WS_HOST ?? "0.0.0.0"
const port = parseInt(process.env.PORT ?? "3000", 10)

// ─── Prisma (for persisting messages) ─────────────────────────────────────────
const rawUrl = process.env.DATABASE_URL!
const pool = new Pool({
  connectionString: normalizeDatabaseUrl(rawUrl),
  ssl: getDatabaseSslOptions(),
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── Connected clients: userId → Set<WebSocket> (multi-tab support) ───────────
type ExtendedWebSocket = WebSocket & {
  isAlive?: boolean
  messageTimestamps?: number[]
}

const clients = new Map<string, Set<ExtendedWebSocket>>()
;(global as any).onlineUsersSet = clients

function getCookieValue(cookieHeader: string | undefined, name: string) {
  if (!cookieHeader) return null

  for (const part of cookieHeader.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) {
      return decodeURIComponent(rest.join("="))
    }
  }

  return null
}

async function getSocketSession(req: { headers: { cookie?: string } }) {
  const token = getCookieValue(req.headers.cookie, SESSION_COOKIE_NAME)
  if (!token) return null

  const session = await verifySessionToken(token)
  if (!session) return null
  const dbUser = await prisma.user.findUnique({ where: { id: session.id }, select: { id: true, email: true, role: true, sessionVersion: true } })
  if (!dbUser || dbUser.email !== session.email || dbUser.sessionVersion !== session.sessionVersion) return null
  const preferredWorkspaceId = getCookieValue(req.headers.cookie, "spagad_workspace")
  const membership = await prisma.workspaceMember.findFirst({
    where: { userId: session.id, ...(preferredWorkspaceId ? { workspaceId: preferredWorkspaceId } : {}) },
    select: { workspaceId: true, role: true },
    orderBy: { joinedAt: "asc" },
  })
  if (!membership) return null
  return {
    ...session,
    email: dbUser.email,
    workspaceId: membership.workspaceId,
    workspaceRole: membership.role as WorkspaceRole,
    role: effectiveWorkspaceRole(dbUser.role, membership.role as WorkspaceRole),
  }
}

// ─── Rate limiting helper (max 20 messages per 5 seconds per socket) ───────────
const RATE_LIMIT_WINDOW_MS = 5000
const RATE_LIMIT_MAX_MESSAGES = 20

function checkRateLimit(ws: ExtendedWebSocket): boolean {
  const now = Date.now()
  if (!ws.messageTimestamps) ws.messageTimestamps = []
  ws.messageTimestamps = ws.messageTimestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (ws.messageTimestamps.length >= RATE_LIMIT_MAX_MESSAGES) {
    return false
  }
  ws.messageTimestamps.push(now)
  return true
}

// ─── Next.js app ───────────────────────────────────────────────────────────────
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  // ─── WebSocket Server (with 64KB max payload) ───────────────────────────────
  const wss = new WebSocketServer({
    server: httpServer,
    path: "/ws",
    maxPayload: 64 * 1024, // 64 KB max payload to prevent DoS
  })

  // ─── Heartbeat Keep-Alive (detect dead/zombie sockets every 30s) ─────────────
  const pingInterval = setInterval(() => {
    wss.clients.forEach((client) => {
      const extWs = client as ExtendedWebSocket
      if (extWs.isAlive === false) {
        return extWs.terminate()
      }
      extWs.isAlive = false
      extWs.ping()
    })
  }, 30_000)

  wss.on("close", () => {
    clearInterval(pingInterval)
  })

  wss.on("connection", (rawWs, req) => {
    const ws = rawWs as ExtendedWebSocket
    ws.isAlive = true
    ws.on("pong", () => {
      ws.isAlive = true
    })

    void (async () => {
      const url = new URL(req.url!, `http://${hostname}`)
      const userId = url.searchParams.get("userId")
      const session = await getSocketSession(req)

      if (!userId || !session || session.id !== userId || !hasPermission(session.role, "use_messages")) {
        ws.close(4001, "unauthorized")
        return
      }

      const workspaceId = session.workspaceId
      const clientKey = `${workspaceId}:${userId}`

      // Register client in Set to allow multiple tabs/windows
      let userSockets = clients.get(clientKey)
      const isFirstConnection = !userSockets || userSockets.size === 0
      if (!userSockets) {
        userSockets = new Set<ExtendedWebSocket>()
        clients.set(clientKey, userSockets)
      }
      userSockets.add(ws)
      console.log(`[WS] Connected: ${userId} (${clients.size} distinct users online, ${userSockets.size} tabs for this user)`)

      // Broadcast online presence if first tab connected
      if (isFirstConnection) {
        broadcast({ type: "presence", userId, online: true }, workspaceId, userId)
      }

      ws.on("message", async (raw) => {
        try {
          if (!checkRateLimit(ws)) {
            ws.send(JSON.stringify({ type: "error", message: "Rate limit exceeded. Please slow down." }))
            return
          }

          const data = JSON.parse(raw.toString())

          if (data.type === "chat") {
            const { to, content, replyToId, mediaUrl, mediaType, mediaName, mediaSize } = data as {
              to: string
              content?: string
              replyToId?: string
              mediaUrl?: string
              mediaType?: string
              mediaName?: string
              mediaSize?: number
            }

            if (!to || (!content?.trim() && !mediaUrl)) return

            const recipient = await prisma.workspaceMember.findUnique({
              where: { workspaceId_userId: { workspaceId, userId: to } },
              select: { userId: true },
            })
            if (!recipient) return
            if (replyToId) {
              const reply = await prisma.message.findFirst({ where: { id: replyToId, workspaceId }, select: { id: true } })
              if (!reply) return
            }

            // Persist to DB
            const saved = await prisma.message.create({
              data: {
                senderId: userId,
                receiverId: to,
                workspaceId,
                content: content?.trim() ?? null,
                ...(replyToId ? { replyToId } : {}),
                ...(mediaUrl ? { mediaUrl, mediaType, mediaName, mediaSize } : {}),
              },
              include: {
                sender: { select: { name: true, email: true } },
                replyTo: {
                  select: {
                    id: true,
                    content: true,
                    sender: { select: { name: true, email: true } },
                  },
                },
              },
            })

            const payload = JSON.stringify({
              type: "chat",
              id: saved.id,
              from: userId,
              to,
              content: saved.content,
              senderName: saved.sender.name ?? saved.sender.email,
              replyToId: saved.replyToId ?? null,
              replyTo: saved.replyTo
                ? {
                    id: saved.replyTo.id,
                    content: saved.replyTo.content,
                    senderName: saved.replyTo.sender.name ?? saved.replyTo.sender.email,
                  }
                : null,
              mediaUrl: saved.mediaUrl ?? null,
              mediaType: saved.mediaType ?? null,
              mediaName: saved.mediaName ?? null,
              mediaSize: saved.mediaSize ?? null,
              createdAt: saved.createdAt,
            })

            // Deliver to recipient's active tabs
            sendToUser(to, payload, workspaceId)

            // Echo back to all sender's tabs
            sendToUser(userId, payload, workspaceId)
          }

          // ── Delete message ─────────────────────────────────────────────────────
          if (data.type === "delete_message") {
            const { id } = data as { id: string }
            if (!id) return

            // Verify ownership
            const msg = await prisma.message.findFirst({ where: { id, workspaceId }, select: { senderId: true, receiverId: true } })
            if (!msg || msg.senderId !== userId) return

            await prisma.message.delete({ where: { id } })

            // Notify both sides across all tabs
            const deletePayload = JSON.stringify({ type: "delete_message", id })
            sendToUser(userId, deletePayload, workspaceId)
            sendToUser(msg.receiverId, deletePayload, workspaceId)
            console.log(`[WS] Message deleted: ${id}`)
          }

          // ── Edit message ───────────────────────────────────────────────────────
          if (data.type === "edit_message") {
            const { id, content } = data as { id: string; content: string }
            if (!id || !content?.trim()) return

            // Verify ownership
            const msg = await prisma.message.findFirst({ where: { id, workspaceId }, select: { senderId: true, receiverId: true } })
            if (!msg || msg.senderId !== userId) return

            const updated = await prisma.message.update({
              where: { id },
              data: { content: content.trim(), edited: true },
            })

            // Notify both sides across all tabs
            const editPayload = JSON.stringify({ type: "edit_message", id, content: updated.content, edited: true })
            sendToUser(userId, editPayload, workspaceId)
            sendToUser(msg.receiverId, editPayload, workspaceId)
            console.log(`[WS] Message edited: ${id}`)
          }

        } catch (err) {
          console.error("[WS] message error:", err)
        }
      })

      ws.on("close", () => {
        const sockets = clients.get(clientKey)
        if (sockets) {
          sockets.delete(ws)
          if (sockets.size === 0) {
            clients.delete(clientKey)
            console.log(`[WS] User fully disconnected: ${userId} (${clients.size} users online)`)
            broadcast({ type: "presence", userId, online: false }, workspaceId, userId)
          } else {
            console.log(`[WS] Tab closed for user: ${userId} (${sockets.size} tab(s) remaining)`)
          }
        }
      })

      ws.on("error", (err) => {
        console.error(`[WS] Error for ${userId}:`, err.message)
      })
    })()
  })

  function sendToUser(targetUserId: string, message: string, workspaceId: string) {
    const userSockets = clients.get(`${workspaceId}:${targetUserId}`)
    if (!userSockets) return
    for (const socket of userSockets) {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(message)
      }
    }
  }

  function broadcast(payload: object, workspaceId: string, excludeUserId?: string) {
    const msg = JSON.stringify(payload)
    clients.forEach((userSockets, id) => {
      if (id.startsWith(`${workspaceId}:`) && !id.endsWith(`:${excludeUserId ?? ""}`)) {
        for (const socket of userSockets) {
          if (socket.readyState === WebSocket.OPEN) {
            socket.send(msg)
          }
        }
      }
    })
  }

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} [${dev ? "dev" : "prod"}]`)
    console.log(`> WebSocket server on ws://${hostname}:${port}/ws`)
  })
})
