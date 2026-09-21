"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Send, Search, MessageSquare, Reply, X,
  CheckCheck, MoreVertical, Phone, Video, Trash2, Pencil, Check
} from "lucide-react"
import {
  getConversation,
  getChatUsers,
  markMessagesRead,
  getUnreadCounts,
  sendMessageAction,
  deleteMessageAction,
  editMessageAction,
  heartbeatPresence,
} from "@/lib/actions/message-actions"
import { getPusherClient, getWorkspacePresenceChannel } from "@/lib/pusher/client"
import { MediaBubble } from "@/components/messages/media-bubble"
import { MediaPicker } from "@/components/messages/media-picker"
import { cn } from "@/lib/utils"

type ChatUser = { id: string; name: string | null; email: string; role: string }

type ReplyPreview = { id: string; content: string; senderName: string } | null

type Message = {
  id: string
  from: string
  to: string
  content?: string | null
  senderName: string
  createdAt: string
  edited?: boolean
  replyToId?: string | null
  replyTo?: ReplyPreview
  mediaUrl?: string | null
  mediaType?: string | null
  mediaName?: string | null
  mediaSize?: number | null
}

type NativeRealtimeEvent =
  | { type: "presence_sync"; userIds: string[] }
  | { type: "presence"; userId: string; online: boolean }
  | ({ type: "chat" } & Message)
  | { type: "delete_message"; id: string }
  | { type: "edit_message"; id: string; content: string; edited: boolean }

const POLL_INTERVAL_MS = 5000

type ConversationRow = Awaited<ReturnType<typeof getConversation>>[number]

function toMessage(row: ConversationRow): Message {
  return {
    id: row.id,
    from: row.senderId,
    to: row.receiverId,
    content: row.content,
    senderName: row.sender.name ?? row.sender.email,
    createdAt: row.createdAt.toISOString(),
    replyToId: row.replyToId,
    replyTo: row.replyTo
      ? {
          id: row.replyTo.id,
          content: row.replyTo.content ?? `[${row.replyTo.mediaType ?? "media"}]`,
          senderName: row.replyTo.sender.name ?? row.replyTo.sender.email,
        }
      : null,
    mediaUrl: row.mediaUrl,
    mediaType: row.mediaType,
    mediaName: row.mediaName,
    mediaSize: row.mediaSize,
    edited: row.edited,
  }
}

// Replacing the array on every poll would restart the smooth scroll-to-bottom
// even when nothing changed, so ticks that bring no news must be dropped.
function sameMessages(a: Message[], b: Message[]) {
  if (a.length !== b.length) return false
  return a.every((message, index) => {
    const other = b[index]
    return message.id === other.id && message.content === other.content && message.edited === other.edited
  })
}

interface ChatInterfaceProps {
  currentUserId: string
  currentUserName: string
  workspaceId: string
}

export function ChatInterface({ currentUserId, currentUserName, workspaceId }: ChatInterfaceProps) {
  const [users, setUsers] = useState<ChatUser[]>([])
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [search, setSearch] = useState("")
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
  const [unread, setUnread] = useState<Record<string, number>>({})
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [hoveredMsg, setHoveredMsg] = useState<string | null>(null)
  const [mediaUploading, setMediaUploading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editInput, setEditInput] = useState("")
  const [wsStatus, setWsStatus] = useState<"connected" | "reconnecting" | "offline">("connected")
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const restoredRef = useRef(false)
  const nativeSocketRef = useRef<WebSocket | null>(null)
  const useNativeWebSocket = process.env.NEXT_PUBLIC_REALTIME_TRANSPORT === "websocket"
  // Whether a push transport is actually delivering right now — not whether one
  // looks configured. Env vars lie: a NEXT_PUBLIC_PUSHER_KEY with no server
  // secret, or transport="websocket" on a host that runs no WebSocket server,
  // both read as "configured" while nothing is delivered. Only a live socket
  // flips this, so the HTTP fallback covers every way the push path can fail.
  const [pushConnected, setPushConnected] = useState(false)
  const [pollError, setPollError] = useState<string | null>(null)
  // Track when each user was last seen online
  const lastSeenRef = useRef<Record<string, Date>>({})

  useEffect(() => {
    getChatUsers().then((u) => {
      setUsers(u)
    })
    getUnreadCounts().then(setUnread)
  }, [])

  const selectedUserRef = useRef(selectedUser)
  useEffect(() => { selectedUserRef.current = selectedUser }, [selectedUser])

  const applyChatMessage = useCallback((data: Message) => {
    const activePartnerId = selectedUserRef.current?.id
    if (
      (data.from === activePartnerId && data.to === currentUserId) ||
      (data.from === currentUserId && data.to === activePartnerId)
    ) {
      setMessages((prev) => {
        if (prev.some((m) => m.id === data.id)) return prev
        return [...prev, data]
      })
    }

    if (data.from !== activePartnerId && data.from !== currentUserId && data.to === currentUserId) {
      setUnread((prev) => ({ ...prev, [data.from]: (prev[data.from] ?? 0) + 1 }))
    }
  }, [currentUserId])

  const applyRealtimeEvent = useCallback((data: NativeRealtimeEvent) => {
    // Sent once per connection so a freshly joined tab knows who is already online.
    if (data.type === "presence_sync") {
      setOnlineUsers(new Set(data.userIds))
      return
    }
    if (data.type === "presence") {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        if (data.online) next.add(data.userId)
        else {
          next.delete(data.userId)
          lastSeenRef.current[data.userId] = new Date()
        }
        return next
      })
      return
    }
    if (data.type === "chat") {
      applyChatMessage(data)
      return
    }
    if (data.type === "delete_message") {
      setMessages((prev) => prev.filter((message) => message.id !== data.id))
      return
    }
    setMessages((prev) => prev.map((message) => (message.id === data.id ? { ...message, content: data.content, edited: true } : message)))
  }, [applyChatMessage])

  // ── Stable Pusher Realtime Subscription ──────────────────────────────────
  useEffect(() => {
    const pusher = getPusherClient()
    if (!pusher) {
      if (process.env.NEXT_PUBLIC_REALTIME_TRANSPORT !== "websocket") {
        // No push transport at all. The polling fallback below owns wsStatus from
        // here; forcing "offline" would just flash a wrong badge over a working chat.
        return
      }

      let socket: WebSocket | null = null
      let reconnectTimer: ReturnType<typeof setTimeout> | null = null
      let reconnectDelay = 1000
      let intentionalClose = false

      const connect = () => {
        if (intentionalClose) return
        setWsStatus("reconnecting")
        socket = new WebSocket(`${window.location.protocol === "https:" ? "wss" : "ws"}://${window.location.host}/ws?userId=${currentUserId}`)
        socket.onopen = () => {
          nativeSocketRef.current = socket
          reconnectDelay = 1000
          setPushConnected(true)
          setWsStatus("connected")
        }
        socket.onmessage = (event) => {
          try {
            applyRealtimeEvent(JSON.parse(event.data) as NativeRealtimeEvent)
          } catch (error) {
            console.error("[Chat] Failed to parse native realtime event:", error)
          }
        }
        socket.onclose = () => {
          setPushConnected(false)
          if (intentionalClose) return
          setWsStatus("offline")
          reconnectTimer = setTimeout(() => {
            reconnectDelay = Math.min(reconnectDelay * 2, 30_000)
            connect()
          }, reconnectDelay)
        }
        socket.onerror = () => socket?.close()
      }

      connect()
      return () => {
        intentionalClose = true
        if (reconnectTimer) clearTimeout(reconnectTimer)
        socket?.close()
        nativeSocketRef.current = null
      }
    }

    setWsStatus("reconnecting")

    const handleStateChange = (states: { current: string }) => {
      setPushConnected(states.current === "connected")
      if (states.current === "connected") setWsStatus("connected")
      else if (states.current === "connecting") setWsStatus("reconnecting")
      else setWsStatus("offline")
    }

    pusher.connection.bind("state_change", handleStateChange)
    if (pusher.connection.state === "connected") {
      setPushConnected(true)
      setWsStatus("connected")
    }

    const presenceChannel = getWorkspacePresenceChannel(workspaceId)
    const channel = pusher.subscribe(presenceChannel) as any

    channel.bind("pusher:subscription_succeeded", (members: { each: (fn: (m: { id: string }) => void) => void }) => {
      const activeIds = new Set<string>()
      members.each((m) => activeIds.add(m.id))
      setOnlineUsers(activeIds)
      setWsStatus("connected")
    })

    channel.bind("pusher:member_added", (member: { id: string }) => {
      setOnlineUsers((prev) => new Set([...prev, member.id]))
    })

    channel.bind("pusher:member_removed", (member: { id: string }) => {
      setOnlineUsers((prev) => {
        const next = new Set(prev)
        next.delete(member.id)
        lastSeenRef.current[member.id] = new Date()
        return next
      })
    })

    channel.bind("chat", applyChatMessage)

    const handleDelete = (data: { id: string }) => setMessages((prev) => prev.filter((m) => m.id !== data.id))
    channel.bind("delete_message", handleDelete)

    const handleEdit = (data: { id: string; content: string; edited: boolean }) => setMessages((prev) => prev.map((m) => (m.id === data.id ? { ...m, content: data.content, edited: true } : m)))
    channel.bind("edit_message", handleEdit)

    return () => {
      pusher.connection.unbind("state_change", handleStateChange)
      channel.unbind("chat", applyChatMessage)
      channel.unbind("delete_message", handleDelete)
      channel.unbind("edit_message", handleEdit)
      channel.unbind_all()
      pusher.unsubscribe(presenceChannel)
    }
  }, [applyChatMessage, applyRealtimeEvent, currentUserId, workspaceId])

  // ── HTTP fallback when nothing can push ───────────────────────────────
  // Runs whenever no push transport is actually delivering — none configured,
  // one misconfigured, or a live one that dropped. In that state
  // sendMessageAction still persists the message but nothing ever hands it over:
  // the recipient sees nothing and everyone reads as offline. Re-reading the
  // whole thread rather than a delta means edits and deletions reconcile too.
  useEffect(() => {
    if (pushConnected) return

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    const tick = async () => {
      try {
        const partner = selectedUserRef.current
        const [online, counts, history] = await Promise.all([
          heartbeatPresence(),
          getUnreadCounts(),
          partner ? getConversation(partner.id) : Promise.resolve(null),
        ])
        if (cancelled) return

        setOnlineUsers(new Set(online))
        setPollError(null)
        setWsStatus("connected")

        if (history && partner) {
          const next = history.map(toMessage)
          const incoming = next.some((message) => message.to === currentUserId && message.from === partner.id)
          setMessages((prev) => (sameMessages(prev, next) ? prev : next))
          // The open thread is being read right now, so its badge must not grow.
          if (incoming && counts[partner.id]) void markMessagesRead(partner.id)
          delete counts[partner.id]
        }

        setUnread(counts)
      } catch (error) {
        // Swallowing this is how a broken fallback looks identical to "nobody is
        // online": everyone reads as offline and no message ever lands.
        console.error("[Chat] Polling fallback failed:", error)
        if (!cancelled) {
          setPollError(error instanceof Error ? error.message : String(error))
          setWsStatus("offline")
        }
      } finally {
        if (!cancelled) timer = setTimeout(tick, POLL_INTERVAL_MS)
      }
    }

    void tick()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [pushConnected, currentUserId])

  const sendNativeEvent = (event: Record<string, unknown>) => {
    if (!useNativeWebSocket || nativeSocketRef.current?.readyState !== WebSocket.OPEN) {
      throw new Error("The realtime connection is not ready. Please wait a moment and try again.")
    }
    nativeSocketRef.current.send(JSON.stringify(event))
  }

  const selectUser = useCallback(async (user: ChatUser) => {
    setSelectedUser(user)
    setReplyingTo(null)
    setEditingId(null)

    // Restore draft for this contact
    const savedDraft = sessionStorage.getItem(`chat-draft:${user.id}`) ?? ""
    setInput(savedDraft)

    // Persist last open conversation
    sessionStorage.setItem("chat:lastUserId", user.id)

    const history = await getConversation(user.id)
    setMessages(history.map(toMessage))
    await markMessagesRead(user.id)
    setUnread((prev) => { const next = { ...prev }; delete next[user.id]; return next })
  }, [])

  // Restore last open conversation when user list loads
  useEffect(() => {
    if (restoredRef.current || users.length === 0) return
    restoredRef.current = true
    const lastId = sessionStorage.getItem("chat:lastUserId")
    if (lastId) {
      const user = users.find((u) => u.id === lastId)
      if (user) selectUser(user)
    }
  }, [users, selectUser])

  // Upload media file then send via server action
  const sendMedia = async (file: File) => {
    if (!selectedUser) return
    setMediaUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Upload failed") }
      const { url, mediaType, mediaName, mediaSize } = await res.json()

      if (useNativeWebSocket) {
        sendNativeEvent({
          type: "chat",
          to: selectedUser.id,
          mediaUrl: url,
          mediaType,
          mediaName,
          mediaSize,
          replyToId: replyingTo ? replyingTo.id : undefined,
        })
      } else {
        const payload = await sendMessageAction({
          to: selectedUser.id,
          mediaUrl: url,
          mediaType,
          mediaName,
          mediaSize,
          replyToId: replyingTo ? replyingTo.id : undefined,
        })
        setMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]))
      }
      setReplyingTo(null)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setMediaUploading(false)
    }
  }

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const sendMessage = async () => {
    const content = input.trim()
    if (!content || !selectedUser) return
    setInput("")
    sessionStorage.removeItem(`chat-draft:${selectedUser.id}`) // clear saved draft
    const replyId = replyingTo ? replyingTo.id : undefined
    setReplyingTo(null)

    try {
      if (useNativeWebSocket) {
        sendNativeEvent({ type: "chat", to: selectedUser.id, content, replyToId: replyId })
      } else {
        const payload = await sendMessageAction({
          to: selectedUser.id,
          content,
          replyToId: replyId,
        })
        setMessages((prev) => (prev.some((m) => m.id === payload.id) ? prev : [...prev, payload]))
      }
    } catch (err: any) {
      console.error("[Chat] Send failed:", err)
      alert(err.message ?? "Failed to send message")
    }
  }

  // Persist draft as user types
  const handleInputChange = (val: string) => {
    setInput(val)
    if (selectedUser) {
      if (val) sessionStorage.setItem(`chat-draft:${selectedUser.id}`, val)
      else sessionStorage.removeItem(`chat-draft:${selectedUser.id}`)
    }
  }

  const sendDelete = async (msgId: string) => {
    if (!confirm("Delete this message for everyone?")) return
    try {
      if (useNativeWebSocket) {
        sendNativeEvent({ type: "delete_message", id: msgId })
      } else {
        await deleteMessageAction(msgId)
        setMessages((prev) => prev.filter((m) => m.id !== msgId))
      }
    } catch (err: any) {
      alert(err.message ?? "Failed to delete message")
    }
  }

  const startEdit = (msg: Message) => {
    setEditingId(msg.id)
    setEditInput(msg.content ?? "")
    setHoveredMsg(null)
  }

  const submitEdit = async (msgId: string) => {
    const content = editInput.trim()
    if (!content) { setEditingId(null); return }
    try {
      if (useNativeWebSocket) {
        sendNativeEvent({ type: "edit_message", id: msgId, content })
      } else {
        await editMessageAction(msgId, content)
        setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content, edited: true } : m))
      }
    } catch (err: any) {
      alert(err.message ?? "Failed to edit message")
    } finally {
      setEditingId(null)
    }
  }

  const scrollToMessage = (id: string) => {
    const el = msgRefs.current[id]
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" })
      el.classList.add("highlight-flash")
      setTimeout(() => el.classList.remove("highlight-flash"), 1200)
    }
  }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })

  const formatDate = (iso: string) => {
    const d = new Date(iso)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return "Today"
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday"
    return d.toLocaleDateString([], { month: "long", day: "numeric" })
  }

  // Group messages by date
  const grouped: { date: string; msgs: Message[] }[] = []
  for (const msg of messages) {
    const date = formatDate(msg.createdAt)
    const last = grouped[grouped.length - 1]
    if (!last || last.date !== date) grouped.push({ date, msgs: [msg] })
    else last.msgs.push(msg)
  }

  // Helper: human-readable last-seen string
  const getLastSeen = (userId: string): string => {
    const ts = lastSeenRef.current[userId]
    if (!ts) return ""
    const diff = Math.floor((Date.now() - ts.getTime()) / 1000)
    if (diff < 60) return "last seen just now"
    if (diff < 3600) return `last seen ${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `last seen ${Math.floor(diff / 3600)}h ago`
    return `last seen ${Math.floor(diff / 86400)}d ago`
  }

  // Always show ALL users — online float to top, then alphabetical
  const filteredUsers = users
    .filter((u) => (u.name ?? u.email).toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aOnline = onlineUsers.has(a.id) ? 0 : 1
      const bOnline = onlineUsers.has(b.id) ? 0 : 1
      if (aOnline !== bOnline) return aOnline - bOnline
      return (a.name ?? a.email).localeCompare(b.name ?? b.email)
    })

  return (
    <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl shadow-black/5 dark:shadow-black/30">

      {/* ── LEFT PANEL: contacts ───────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-border/60 bg-card/85">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-xs font-bold text-primary-foreground uppercase">
              {currentUserName[0]}
            </div>
            <span className="text-sm font-semibold text-foreground">Chats</span>
          </div>
          <MessageSquare className="w-5 h-5 text-muted-foreground" />
        </div>

        {/* Search */}
        <div className="px-3 py-2">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search or start a chat" className="pl-9 h-9 text-sm border border-border/40 bg-background/70 focus-visible:ring-0 rounded-full" />
          </div>
        </div>

        {/* User list */}
        <div className="flex-1 overflow-y-auto">
          {filteredUsers.map((user) => {
            const isOnline = onlineUsers.has(user.id)
            const isSelected = selectedUser?.id === user.id
            const unreadCount = unread[user.id] ?? 0

            return (
              <button key={user.id} onClick={() => selectUser(user)}
                className={cn("w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-border/50 hover:bg-muted/60",
                  isSelected && "bg-primary/10"
                )}>
                {/* Avatar with online dot */}
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-sm font-bold text-primary uppercase">
                    {(user.name ?? user.email)[0]}
                  </div>
                  {isOnline
                    ? <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full border-2 border-background" />
                    : <span className="absolute bottom-0 right-0 w-3 h-3 bg-muted-foreground/30 rounded-full border-2 border-background" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <p className="text-sm font-semibold text-foreground truncate">{user.name ?? user.email}</p>
                  </div>
                  <p className="text-xs truncate mt-0.5" style={{ color: isOnline ? "rgb(52 211 153)" : "" }}>
                    {isOnline
                      ? "online"
                      : getLastSeen(user.id) || user.role.toLowerCase()
                    }
                  </p>
                </div>

                {unreadCount > 0 && (
                  <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full px-1">
                    {unreadCount}
                  </span>
                )}
              </button>
            )
          })}
          {filteredUsers.length === 0 && (
            <p className="text-center py-10 text-muted-foreground text-sm">No contacts</p>
          )}
        </div>
      </div>

      {/* ── RIGHT PANEL: chat ──────────────────────────────────────────────── */}
      {selectedUser ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Chat header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-border/60 bg-card/90 flex-shrink-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-sm font-bold text-primary uppercase">
                {(selectedUser.name ?? selectedUser.email)[0]}
              </div>
              {onlineUsers.has(selectedUser.id) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-background" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground text-sm">{selectedUser.name ?? selectedUser.email}</p>
              <p className="text-xs text-muted-foreground">{onlineUsers.has(selectedUser.id) ? "online" : "offline"}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Video className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><Phone className="w-4 h-4" /></Button>
              <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground"><MoreVertical className="w-4 h-4" /></Button>
            </div>
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto py-4 px-4 space-y-1 bg-background">
            {grouped.map(({ date, msgs }) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="bg-muted text-muted-foreground text-[11px] px-3 py-1 rounded-full font-medium">
                    {date}
                  </span>
                </div>

                {msgs.map((msg, i) => {
                  const isMine = msg.from === currentUserId
                  const prevMsg = i > 0 ? msgs[i - 1] : null
                  const showAvatar = !isMine && (prevMsg?.from !== msg.from)

                  return (
                    <div
                      key={msg.id}
                      ref={(el) => { msgRefs.current[msg.id] = el }}
                      className={cn("flex items-end gap-2 group mb-0.5 transition-all duration-300", isMine ? "flex-row-reverse" : "")}
                      onMouseEnter={() => setHoveredMsg(msg.id)}
                      onMouseLeave={() => setHoveredMsg(null)}
                    >
                      {/* Avatar for others */}
                      {!isMine && (
                        <div className="w-6 h-6 flex-shrink-0 mb-1">
                          {showAvatar && (
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex items-center justify-center text-[10px] font-bold text-primary uppercase">
                              {msg.senderName[0]}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Context menu on hover (own messages only) */}
                      {hoveredMsg === msg.id && isMine && (
                        <div className="flex-shrink-0 flex items-center gap-1">
                          {!msg.mediaUrl && (
                            <button onClick={() => startEdit(msg)}
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-blue-500/20 text-muted-foreground hover:text-blue-500 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => sendDelete(msg.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-red-500/20 text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Reply button on hover (all messages) */}
                      {hoveredMsg === msg.id && !isMine && (
                        <button
                          onClick={() => { setReplyingTo(msg); inputRef.current?.focus() }}
                          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <Reply className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Bubble */}
                      <div className={cn("max-w-[65%] min-w-[80px]", isMine ? "items-end" : "items-start", "flex flex-col")}>
                        {/* Reply quote */}
                        {msg.replyTo && (
                          <button
                            onClick={() => scrollToMessage(msg.replyTo!.id)}
                            className={cn(
                              "w-full mb-1 text-left rounded-lg overflow-hidden border-l-4 px-3 py-1.5 cursor-pointer hover:brightness-110 transition-all",
                              isMine ? "bg-primary/10 border-primary/60" : "bg-muted border-emerald-500/60"
                            )}
                          >
                            <p className="text-[11px] font-semibold text-primary truncate">{msg.replyTo.senderName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{msg.replyTo.content}</p>
                          </button>
                        )}

                        {/* Main bubble */}
                        <div className={cn(
                          "rounded-2xl text-sm leading-relaxed break-words relative overflow-hidden",
                          msg.mediaUrl ? "p-1" : "px-3 py-2",
                          isMine
                            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground rounded-tr-sm shadow-lg shadow-primary/20"
                            : "bg-card text-card-foreground border border-border/60 rounded-tl-sm shadow-sm"
                        )}
                        >
                          {msg.mediaUrl && msg.mediaType && (
                            <MediaBubble
                              mediaUrl={msg.mediaUrl}
                              mediaType={msg.mediaType}
                              mediaName={msg.mediaName ?? null}
                              mediaSize={msg.mediaSize ?? null}
                              isMine={isMine}
                            />
                          )}
                          {/* Inline edit or content */}
                          {editingId === msg.id ? (
                            <div className="flex items-center gap-2 px-2 py-1">
                              <input
                                autoFocus
                                value={editInput}
                                onChange={(e) => setEditInput(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") submitEdit(msg.id)
                                  if (e.key === "Escape") setEditingId(null)
                                }}
                                className="flex-1 bg-transparent outline-none text-sm min-w-0 border-b border-primary/50 pb-0.5"
                              />
                              <button onClick={() => submitEdit(msg.id)} className="text-emerald-400 hover:text-emerald-300">
                                <Check className="w-4 h-4" />
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            msg.content && (
                              <p className={msg.mediaUrl ? "px-2 pb-1 pt-1 text-sm" : ""}>
                                {msg.content}
                                {msg.edited && <span className="text-[9px] opacity-50 ml-1 font-mono">(edited)</span>}
                              </p>
                            )
                          )}
                        </div>

                        {/* Timestamp + status */}
                        <div className={cn("flex items-center gap-1 mt-0.5", isMine ? "flex-row-reverse" : "")}>
                          <span className="text-[10px] text-muted-foreground/60 font-mono">{formatTime(msg.createdAt)}</span>
                          {isMine && <CheckCheck className="w-3 h-3 text-primary/60" />}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}

            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl border border-border/60 bg-card flex items-center justify-center">
                  <MessageSquare className="w-8 h-8 text-primary/40" />
                </div>
                <p className="text-sm">Say hi to <span className="text-foreground font-medium">{selectedUser.name ?? selectedUser.email}</span> 👋</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply preview bar */}
          {replyingTo && (
            <div className="flex items-center gap-3 px-4 py-2 border-t border-border/60 bg-card flex-shrink-0">
              <div className="flex-1 border-l-4 border-primary pl-3">
                <p className="text-xs font-semibold text-primary">{replyingTo.from === currentUserId ? "You" : replyingTo.senderName}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {replyingTo.mediaType ? `[${replyingTo.mediaType}] ${replyingTo.mediaName ?? ""}` : replyingTo.content}
                </p>
              </div>
              <button onClick={() => setReplyingTo(null)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Input bar */}
          <div className="flex items-center gap-2 px-4 py-3 border-t border-border/60 bg-card flex-shrink-0">
            {wsStatus !== "connected" && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-20 z-10">
                <span title={pollError ?? undefined} className={cn(
                  "text-[11px] font-medium px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-lg",
                  wsStatus === "reconnecting"
                    ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                    : "bg-red-500/10 border-red-500/30 text-red-400"
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {wsStatus === "reconnecting" ? "Reconnecting…" : "Offline"}
                </span>
              </div>
            )}
            <MediaPicker onSend={sendMedia} isSending={mediaUploading} />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={wsStatus === "connected" ? "Type a message…" : "Waiting for connection…"}
              className="flex-1 border border-border/50 bg-background/80 rounded-full h-10 px-4 focus-visible:ring-0 text-sm"
            />
            <Button
              onClick={sendMessage}
              disabled={!input.trim()}
              size="icon"
              className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 shadow-lg shadow-primary/20 flex-shrink-0 transition-all disabled:opacity-40 disabled:scale-90 hover:scale-110"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
                // No chat selected
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4 bg-background">
          <div className="w-24 h-24 rounded-3xl border border-border/60 bg-card flex items-center justify-center">
            <MessageSquare className="w-12 h-12 text-primary/30" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground mb-1">Spagad Chats</p>
            <p className="text-sm text-muted-foreground">Select a contact to start a real-time conversation</p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes flash {
          0%, 100% { background: transparent }
          50% { background: color-mix(in oklab, var(--primary) 18%, transparent) }
        }
        .highlight-flash { animation: flash 0.6s ease 2 }
      `}</style>
    </div>
  )
}
