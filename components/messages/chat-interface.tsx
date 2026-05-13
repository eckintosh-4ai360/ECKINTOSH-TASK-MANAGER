"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Send, Search, MessageSquare, Reply, X,
  CheckCheck, MoreVertical, Phone, Video, Trash2, Pencil, Check
} from "lucide-react"
import { getConversation, getChatUsers, markMessagesRead, getUnreadCounts } from "@/lib/actions/message-actions"
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

interface ChatInterfaceProps {
  currentUserId: string
  currentUserName: string
}

export function ChatInterface({ currentUserId, currentUserName }: ChatInterfaceProps) {
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
  const [wsStatus, setWsStatus] = useState<"connected" | "reconnecting" | "offline">("reconnecting")
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelay = useRef(1000)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const msgRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const restoredRef = useRef(false)
  // Track when each user was last seen online
  const lastSeenRef = useRef<Record<string, Date>>({})

  useEffect(() => {
    getChatUsers().then((u) => {
      setUsers(u)
    })
    getUnreadCounts().then(setUnread)
  }, [])

  // ── Stable WebSocket with auto-reconnect ─────────────────────────────────
  const connectWs = useCallback(() => {
    // Don't reconnect if already open
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const wsUrl = `ws://${window.location.host}/ws?userId=${currentUserId}`
    const ws = new WebSocket(wsUrl)
    wsRef.current = ws

    ws.onopen = () => {
      setWsStatus("connected")
      reconnectDelay.current = 1000 // reset backoff on success
      if (reconnectTimer.current) { clearTimeout(reconnectTimer.current); reconnectTimer.current = null }
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type === "chat") {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev
            return [...prev, data]
          })
          if (data.from !== selectedUserRef.current?.id && data.from !== currentUserId) {
            setUnread((prev) => ({ ...prev, [data.from]: (prev[data.from] ?? 0) + 1 }))
          }
        }
        if (data.type === "delete_message") {
          setMessages((prev) => prev.filter((m) => m.id !== data.id))
        }
        if (data.type === "edit_message") {
          setMessages((prev) => prev.map((m) => m.id === data.id ? { ...m, content: data.content, edited: true } : m))
        }
        if (data.type === "presence") {
          setOnlineUsers((prev) => {
            const next = new Set(prev)
            if (data.online) {
              next.add(data.userId)
            } else {
              next.delete(data.userId)
              // Record last seen timestamp so we can show "last seen X ago"
              lastSeenRef.current[data.userId] = new Date()
            }
            return next
          })
        }
      } catch {}
    }

    ws.onclose = () => {
      setWsStatus("reconnecting")
      // Exponential backoff: 1s → 2s → 4s → … max 30s
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000)
        connectWs()
      }, reconnectDelay.current)
    }

    ws.onerror = () => {
      setWsStatus("offline")
      ws.close() // triggers onclose → reconnect
    }
  }, [currentUserId])

  useEffect(() => {
    connectWs()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      // Mark as intentionally closed so onclose won't reconnect
      wsRef.current?.close()
    }
  }, [connectWs])

  const selectedUserRef = useRef(selectedUser)
  useEffect(() => { selectedUserRef.current = selectedUser }, [selectedUser])

  const selectUser = useCallback(async (user: ChatUser) => {
    setSelectedUser(user)
    // ← DO NOT clear messages immediately: keep old messages visible while loading
    setReplyingTo(null)
    setEditingId(null)

    // Restore draft for this contact
    const savedDraft = sessionStorage.getItem(`chat-draft:${user.id}`) ?? ""
    setInput(savedDraft)

    // Persist last open conversation
    sessionStorage.setItem("chat:lastUserId", user.id)

    const history = await getConversation(user.id)
    setMessages(
      history.map((m) => ({
        id: m.id,
        from: m.senderId,
        to: m.receiverId,
        content: m.content,
        senderName: m.sender.name ?? m.sender.email,
        createdAt: m.createdAt.toISOString(),
        replyToId: m.replyToId,
        replyTo: m.replyTo
          ? { id: m.replyTo.id, content: m.replyTo.content ?? `[${m.replyTo.mediaType ?? 'media'}]`, senderName: m.replyTo.sender.name ?? m.replyTo.sender.email }
          : null,
        mediaUrl: m.mediaUrl,
        mediaType: m.mediaType,
        mediaName: m.mediaName,
        mediaSize: m.mediaSize,
        edited: m.edited,
      }))
    )
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

  // Upload media file then send via WS
  const sendMedia = async (file: File) => {
    if (!selectedUser || wsRef.current?.readyState !== WebSocket.OPEN) return
    setMediaUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch("/api/upload", { method: "POST", body: fd })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? "Upload failed") }
      const { url, mediaType, mediaName, mediaSize } = await res.json()
      wsRef.current.send(JSON.stringify({
        type: "chat",
        to: selectedUser.id,
        mediaUrl: url,
        mediaType,
        mediaName,
        mediaSize,
        ...(replyingTo ? { replyToId: replyingTo.id } : {}),
      }))
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

  const sendMessage = () => {
    const content = input.trim()
    if (!content || !selectedUser || wsRef.current?.readyState !== WebSocket.OPEN) return
    wsRef.current.send(JSON.stringify({
      type: "chat",
      to: selectedUser.id,
      content,
      ...(replyingTo ? { replyToId: replyingTo.id } : {}),
    }))
    setInput("")
    sessionStorage.removeItem(`chat-draft:${selectedUser.id}`) // clear saved draft
    setReplyingTo(null)
  }

  // Persist draft as user types
  const handleInputChange = (val: string) => {
    setInput(val)
    if (selectedUser) {
      if (val) sessionStorage.setItem(`chat-draft:${selectedUser.id}`, val)
      else sessionStorage.removeItem(`chat-draft:${selectedUser.id}`)
    }
  }

  const sendDelete = (msgId: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    if (!confirm("Delete this message for everyone?")) return
    wsRef.current.send(JSON.stringify({ type: "delete_message", id: msgId }))
  }

  const startEdit = (msg: Message) => {
    setEditingId(msg.id)
    setEditInput(msg.content ?? "")
    setHoveredMsg(null)
  }

  const submitEdit = (msgId: string) => {
    const content = editInput.trim()
    if (!content || wsRef.current?.readyState !== WebSocket.OPEN) { setEditingId(null); return }
    wsRef.current.send(JSON.stringify({ type: "edit_message", id: msgId, content }))
    setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, content, edited: true } : m))
    setEditingId(null)
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
    <div className="flex h-[calc(100vh-120px)] overflow-hidden rounded-2xl border border-white/10 shadow-2xl" style={{ background: "hsl(var(--background))" }}>

      {/* ── LEFT PANEL: contacts ───────────────────────────────────────────── */}
      <div className="w-80 flex-shrink-0 flex flex-col border-r border-white/5" style={{ background: "hsl(222 20% 8%)" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/5">
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
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search or start a chat" className="pl-9 h-9 text-sm border-none bg-white/5 focus-visible:ring-0 rounded-full" />
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
                className={cn("w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors border-b border-white/5 hover:bg-white/5",
                  isSelected && "bg-primary/15"
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
          <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 flex-shrink-0" style={{ background: "hsl(222 20% 9%)" }}>
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
          <div
            className="flex-1 overflow-y-auto py-4 px-4 space-y-1"
            style={{
              background: "hsl(222 18% 7%)",
              backgroundImage: "radial-gradient(circle at 25% 25%, hsl(var(--primary) / 0.03) 0%, transparent 50%), radial-gradient(circle at 75% 75%, hsl(var(--primary) / 0.03) 0%, transparent 50%)",
            }}
          >
            {grouped.map(({ date, msgs }) => (
              <div key={date}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="bg-white/10 text-muted-foreground text-[11px] px-3 py-1 rounded-full font-medium">
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
                              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-blue-500/20 text-muted-foreground hover:text-blue-400 transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button onClick={() => sendDelete(msg.id)}
                            className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Reply button on hover (all messages) */}
                      {hoveredMsg === msg.id && !isMine && (
                        <button
                          onClick={() => { setReplyingTo(msg); inputRef.current?.focus() }}
                          className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 text-muted-foreground hover:text-foreground transition-colors"
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
                              isMine ? "bg-white/10 border-primary/60" : "bg-white/5 border-emerald-400/60"
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
                            : "text-foreground rounded-tl-sm shadow-sm",
                          !isMine && "bg-white/8"
                        )}
                          style={!isMine ? { background: "hsl(222 18% 14%)" } : undefined}
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
                <div className="w-16 h-16 rounded-2xl border border-white/10 flex items-center justify-center" style={{ background: "hsl(222 18% 12%)" }}>
                  <MessageSquare className="w-8 h-8 text-primary/40" />
                </div>
                <p className="text-sm">Say hi to <span className="text-foreground font-medium">{selectedUser.name ?? selectedUser.email}</span> 👋</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Reply preview bar */}
          {replyingTo && (
            <div className="flex items-center gap-3 px-4 py-2 border-t border-white/5 flex-shrink-0" style={{ background: "hsl(222 18% 10%)" }}>
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
          <div className="flex items-center gap-2 px-4 py-3 border-t border-white/5 flex-shrink-0" style={{ background: "hsl(222 18% 9%)" }}>
            {wsStatus !== "connected" && (
              <div className="absolute left-1/2 -translate-x-1/2 bottom-20 z-10">
                <span className={cn(
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
              className="flex-1 border-none bg-white/8 rounded-full h-10 px-4 focus-visible:ring-0 text-sm"
              style={{ background: "hsl(222 18% 14%)" }}
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
        /* No chat selected */
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4" style={{ background: "hsl(222 18% 7%)" }}>
          <div className="w-24 h-24 rounded-3xl border border-white/10 flex items-center justify-center" style={{ background: "hsl(222 18% 11%)" }}>
            <MessageSquare className="w-12 h-12 text-primary/30" />
          </div>
          <div className="text-center">
            <p className="text-lg font-semibold text-foreground mb-1">Eckintosh Chats</p>
            <p className="text-sm text-muted-foreground">Select a contact to start a real-time conversation</p>
          </div>
        </div>
      )}

      <style jsx>{`
        .bg-white\/8 { background: hsl(222 18% 14%) }
        @keyframes flash {
          0%, 100% { background: transparent }
          50% { background: hsl(var(--primary) / 0.2) }
        }
        .highlight-flash { animation: flash 0.6s ease 2 }
      `}</style>
    </div>
  )
}
