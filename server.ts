import "dotenv/config"
import { createServer } from "http"
import { parse } from "url"
import next from "next"
import { WebSocketServer, WebSocket } from "ws"
import { PrismaClient } from "@prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import pg from "pg"

const { Pool } = pg
const dev = process.env.NODE_ENV !== "production"
const hostname = "localhost"
const port = parseInt(process.env.PORT ?? "3000", 10)

// ─── Prisma (for persisting messages) ─────────────────────────────────────────
const rawUrl = process.env.DATABASE_URL!
const cleanUrl = rawUrl
  .replace(/[?&]sslmode=[^&]*/g, "")
  .replace(/[?&]channel_binding=[^&]*/g, "")
  .replace(/\?&/, "?")
const pool = new Pool({ connectionString: cleanUrl, ssl: { rejectUnauthorized: false } })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ─── Connected clients: userId → WebSocket ─────────────────────────────────────
const clients = new Map<string, WebSocket>()

// ─── Next.js app ───────────────────────────────────────────────────────────────
const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true)
    handle(req, res, parsedUrl)
  })

  // ─── WebSocket Server ──────────────────────────────────────────────────────
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" })

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url!, `http://${hostname}`)
    const userId = url.searchParams.get("userId")

    if (!userId) {
      ws.close(4001, "userId required")
      return
    }

    // Register client
    clients.set(userId, ws)
    console.log(`[WS] Connected: ${userId} (${clients.size} online)`)

    // Broadcast online presence
    broadcast({ type: "presence", userId, online: true }, userId)

    ws.on("message", async (raw) => {
      try {
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

          // Persist to DB
          const saved = await prisma.message.create({
            data: {
              senderId: userId,
              receiverId: to,
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

          // Deliver to recipient if online
          const recipientWs = clients.get(to)
          if (recipientWs?.readyState === WebSocket.OPEN) {
            recipientWs.send(payload)
          }

          // Echo back to sender
          ws.send(payload)
        }

        // ── Delete message ─────────────────────────────────────────────────────
        if (data.type === "delete_message") {
          const { id } = data as { id: string }
          if (!id) return

          // Verify ownership
          const msg = await prisma.message.findUnique({ where: { id }, select: { senderId: true, receiverId: true } })
          if (!msg || msg.senderId !== userId) return

          await prisma.message.delete({ where: { id } })

          // Notify both sides
          const deletePayload = JSON.stringify({ type: "delete_message", id })
          ws.send(deletePayload)
          const otherWs = clients.get(msg.receiverId)
          if (otherWs?.readyState === WebSocket.OPEN) otherWs.send(deletePayload)
          console.log(`[WS] Message deleted: ${id}`)
        }

        // ── Edit message ───────────────────────────────────────────────────────
        if (data.type === "edit_message") {
          const { id, content } = data as { id: string; content: string }
          if (!id || !content?.trim()) return

          // Verify ownership
          const msg = await prisma.message.findUnique({ where: { id }, select: { senderId: true, receiverId: true } })
          if (!msg || msg.senderId !== userId) return

          const updated = await prisma.message.update({
            where: { id },
            data: { content: content.trim(), edited: true },
          })

          // Notify both sides
          const editPayload = JSON.stringify({ type: "edit_message", id, content: updated.content, edited: true })
          ws.send(editPayload)
          const otherWs = clients.get(msg.receiverId)
          if (otherWs?.readyState === WebSocket.OPEN) otherWs.send(editPayload)
          console.log(`[WS] Message edited: ${id}`)
        }

      } catch (err) {
        console.error("[WS] message error:", err)
      }
    })

    ws.on("close", () => {
      clients.delete(userId)
      console.log(`[WS] Disconnected: ${userId} (${clients.size} online)`)
      broadcast({ type: "presence", userId, online: false }, userId)
    })

    ws.on("error", (err) => {
      console.error(`[WS] Error for ${userId}:`, err.message)
    })
  })

  function broadcast(payload: object, excludeUserId?: string) {
    const msg = JSON.stringify(payload)
    clients.forEach((client, id) => {
      if (id !== excludeUserId && client.readyState === WebSocket.OPEN) {
        client.send(msg)
      }
    })
  }

  httpServer.listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port} [${dev ? "dev" : "prod"}]`)
    console.log(`> WebSocket server on ws://${hostname}:${port}/ws`)
  })
})
