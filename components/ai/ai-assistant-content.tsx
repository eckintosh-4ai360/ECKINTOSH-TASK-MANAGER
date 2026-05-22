"use client"

import { useState, useRef, useEffect, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Bot,
  Send,
  Mic,
  Loader2,
  CheckSquare,
  Calendar,
  NotebookPen,
  LayoutDashboard,
  Zap,
  BarChart3,
  Check,
  X,
  Sparkles,
  RefreshCw,
  User,
} from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type MessageRole = "user" | "assistant"

type PendingAction = {
  toolName: string
  toolArgs: Record<string, unknown>
  message: string
}

type Message = {
  id: string
  role: MessageRole
  content: string
  pendingAction?: PendingAction
  actionResult?: { success: boolean; message: string }
}

// ─── Quick Action Chips ───────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  { icon: CheckSquare, label: "Create a task for tomorrow", color: "text-blue-400" },
  { icon: Calendar, label: "Add meeting reminder on calendar", color: "text-orange-400" },
  { icon: NotebookPen, label: "Summarize my notes", color: "text-purple-400" },
  { icon: LayoutDashboard, label: "Create a Kanban board", color: "text-blue-400" },
  { icon: Zap, label: "Plan my week", color: "text-pink-400" },
  { icon: BarChart3, label: "Generate a habit tracker template", color: "text-teal-400" },
]

// ─── Tool Display Names ────────────────────────────────────────────────────────

const TOOL_LABELS: Record<string, string> = {
  create_project: "Project",
  create_task: "Task",
  create_calendar_event: "Calendar",
  create_sprint: "Sprint",
  create_note: "Note",
}

// ─── Action Card Component ─────────────────────────────────────────────────────

function ActionCard({
  action,
  onConfirm,
  onCancel,
  isLoading,
}: {
  action: PendingAction
  onConfirm: () => void
  onCancel: () => void
  isLoading: boolean
}) {
  const label = TOOL_LABELS[action.toolName] ?? action.toolName
  const args = action.toolArgs as Record<string, string>

  return (
    <div className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm p-4 max-w-lg shadow-lg">
      <p className="text-sm text-foreground/80 mb-3 leading-relaxed">{action.message}</p>
      <div className="rounded-lg border border-border/40 bg-background/60 p-3 mb-3">
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{
              background: "rgba(239,68,68,0.12)",
              borderColor: "rgba(239,68,68,0.3)",
              color: "#ef4444",
            }}
          >
            {label}
          </span>
          <span className="text-sm font-semibold text-foreground">
            {args.name ?? args.title ?? args.label ?? "New item"}
          </span>
        </div>
        {(args.description ?? args.goal) && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            {args.description ?? args.goal}
          </p>
        )}
        {args.date && (
          <p className="text-xs text-muted-foreground mt-1">
            📅 {args.date}
            {args.startTime ? ` at ${args.startTime}` : ""}
          </p>
        )}
        {args.dueDate && (
          <p className="text-xs text-muted-foreground mt-1">📅 Due: {args.dueDate}</p>
        )}
        {args.priority && (
          <p className="text-xs text-muted-foreground mt-1 capitalize">
            ⚡ Priority: {args.priority}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={onConfirm}
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 rounded-lg"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Check className="w-3.5 h-3.5" />
          )}
          Confirm
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
          className="border-border/60 gap-1.5 rounded-lg hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive"
        >
          <X className="w-3.5 h-3.5" />
          Cancel
        </Button>
      </div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function AIAssistantContent({
  stats,
}: {
  stats: { projects: number; notes: number; calendarEvents: number }
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ─── Send Message ─────────────────────────────────────────────────────────

  async function sendMessage(text: string) {
    if (!text.trim() || isLoading) return

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: "user",
      content: text.trim(),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput("")
    setIsLoading(true)

    try {
      const history = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }))

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.type === "action_pending") {
        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.message,
          pendingAction: {
            toolName: data.toolName,
            toolArgs: data.toolArgs,
            message: data.message,
          },
        }
        setMessages((prev) => [...prev, aiMsg])
      } else {
        const aiMsg: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data.content ?? "I'm here to help.",
        }
        setMessages((prev) => [...prev, aiMsg])
      }
    } catch (err) {
      const errMsg: Message = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: `⚠️ Something went wrong: ${err instanceof Error ? err.message : "Unknown error"}. Make sure your GROQ_API_KEY is set in .env`,
      }
      setMessages((prev) => [...prev, errMsg])
    } finally {
      setIsLoading(false)
    }
  }

  // ─── Confirm Action ────────────────────────────────────────────────────────

  async function confirmAction(messageId: string, action: PendingAction) {
    setConfirmingId(messageId)

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executeAction: action }),
      })

      const data = await res.json()

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                actionResult: {
                  success: data.success,
                  message: data.success
                    ? `✅ Done! ${TOOL_LABELS[action.toolName] ?? "Item"} created successfully.`
                    : `❌ Failed: ${data.error ?? "Unknown error"}`,
                },
                pendingAction: undefined,
              }
            : m
        )
      )

      if (data.success) {
        const followUp: Message = {
          id: crypto.randomUUID(),
          role: "assistant",
          content: `${TOOL_LABELS[action.toolName] ?? "Item"} created! You can find it in your workspace. Anything else I can help you with?`,
        }
        setMessages((prev) => [...prev, followUp])
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                actionResult: { success: false, message: "❌ Failed to execute action." },
                pendingAction: undefined,
              }
            : m
        )
      )
    } finally {
      setConfirmingId(null)
    }
  }

  function cancelAction(messageId: string) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              actionResult: { success: false, message: "Action cancelled." },
              pendingAction: undefined,
            }
          : m
      )
    )
  }

  // ─── Key Handler ──────────────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] max-h-[900px]">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="mb-4 flex-shrink-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold text-primary/70 uppercase tracking-widest">AI Assistant</span>
        </div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">
          Chat, plan, and act across your workspace.
        </h1>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col glass-card rounded-2xl border border-primary/10">
        {/* ── Messages Area ───────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6">
          {isEmpty ? (
            /* Welcome Screen */
            <div className="flex flex-col items-center justify-center h-full text-center gap-6 pb-4">
              {/* Icon */}
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center shadow-xl shadow-primary/30 animate-pulse">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-background animate-ping" />
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-background" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-foreground mb-1">AI Assistant</h2>
                <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
                  Ask questions, plan your day, and prepare actions for your tasks, calendar,
                  notes, whiteboards, and generated apps.
                </p>
              </div>

              {/* Quick Action Chips */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-2xl">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => sendMessage(action.label)}
                    className="flex items-center gap-3 px-4 py-3.5 rounded-xl border border-border/50 bg-background/50 hover:bg-primary/5 hover:border-primary/30 transition-all duration-200 text-left group"
                  >
                    <action.icon className={cn("w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110", action.color)} />
                    <span className="text-sm text-foreground/80 font-medium leading-tight">{action.label}</span>
                  </button>
                ))}
              </div>

              {/* Stats Row */}
              <div className="flex items-center gap-6 text-xs text-muted-foreground/70 border-t border-border/30 pt-4 w-full max-w-2xl justify-center">
                <span>
                  <span className="font-semibold text-foreground">{stats.projects}</span> boards
                </span>
                <span>
                  <span className="font-semibold text-foreground">{stats.notes}</span> notes
                </span>
                <span>
                  <span className="font-semibold text-foreground">{stats.calendarEvents}</span> calendar items
                </span>
              </div>
            </div>
          ) : (
            /* Conversation */
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn("flex gap-3", message.role === "user" ? "justify-end" : "justify-start")}
                >
                  {message.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Bot className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}

                  <div className={cn("flex flex-col gap-2 max-w-[75%]", message.role === "user" ? "items-end" : "items-start")}>
                    {message.role === "user" ? (
                      <div className="px-4 py-2.5 rounded-2xl rounded-tr-sm bg-primary text-primary-foreground text-sm leading-relaxed shadow-md shadow-primary/20">
                        {message.content}
                      </div>
                    ) : (
                      <div className="px-4 py-2.5 rounded-2xl rounded-tl-sm bg-card/80 border border-border/40 text-sm text-foreground leading-relaxed backdrop-blur-sm max-w-lg">
                        {message.content}
                      </div>
                    )}

                    {/* Action Card */}
                    {message.pendingAction && (
                      <ActionCard
                        action={message.pendingAction}
                        onConfirm={() => confirmAction(message.id, message.pendingAction!)}
                        onCancel={() => cancelAction(message.id)}
                        isLoading={confirmingId === message.id}
                      />
                    )}

                    {/* Action Result */}
                    {message.actionResult && (
                      <div
                        className={cn(
                          "text-xs px-3 py-1.5 rounded-lg",
                          message.actionResult.success
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-muted/40 text-muted-foreground border border-border/40"
                        )}
                      >
                        {message.actionResult.message}
                      </div>
                    )}
                  </div>

                  {message.role === "user" && (
                    <div className="w-7 h-7 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/80 to-primary/40 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl rounded-tl-sm bg-card/80 border border-border/40 backdrop-blur-sm">
                    <div className="flex gap-1.5 items-center">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* ── Footer Input ────────────────────────────────────────────────── */}
        <div className="flex-shrink-0 border-t border-border/30 p-4">
          <div className="rounded-xl border border-border/50 bg-background/60 backdrop-blur-sm p-3 focus-within:border-primary/40 transition-colors">
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Eckintosh AI to plan, summarize, or prepare an action..."
              rows={2}
              className="resize-none border-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-sm placeholder:text-muted-foreground/50"
            />
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-primary/50" />
                <span className="text-[11px] text-muted-foreground/60">
                  Actions require confirmation before saving.
                </span>
              </div>
              <div className="flex items-center gap-2">
                {messages.length > 0 && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setMessages([])}
                    title="Clear conversation"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 h-8 border-border/50 hover:border-primary/30 text-xs rounded-lg"
                  title="Voice input (coming soon)"
                >
                  <Mic className="w-3.5 h-3.5" />
                  Talk
                </Button>
                <Button
                  size="icon"
                  className="h-8 w-8 bg-primary hover:bg-primary/90 rounded-lg shadow-md shadow-primary/30"
                  onClick={() => sendMessage(input)}
                  disabled={isLoading || !input.trim()}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground/40 text-center mt-2">
            Enter sends. Shift+Enter adds a new line.
          </p>
        </div>
      </div>
    </div>
  )
}
