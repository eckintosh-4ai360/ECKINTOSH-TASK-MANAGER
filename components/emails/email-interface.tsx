"use client"

import { useState, useTransition, useEffect } from "react"
import { sendEmail, markEmailRead, deleteEmail } from "@/lib/actions/email-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Inbox, Send as SendIcon, Trash2, Mail, MailOpen, Pencil, AlertCircle, Loader2, Clock, Reply } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type EmailRow = {
  id: string
  subject: string
  body: string
  read: boolean
  createdAt: Date
  from?: { name: string | null; email: string }
  to?: { name: string | null; email: string }
}

type EmailUser = { id: string; name: string | null; email: string }

interface EmailInterfaceProps {
  inbox: EmailRow[]
  sent: EmailRow[]
  users: EmailUser[]
}

export function EmailInterface({ inbox: initialInbox, sent: initialSent, users }: EmailInterfaceProps) {
  const [tab, setTab] = useState<"inbox" | "sent">(() => {
    if (typeof window !== "undefined") return (sessionStorage.getItem("email:tab") as "inbox" | "sent") ?? "inbox"
    return "inbox"
  })
  const [inbox, setInbox] = useState(initialInbox)
  const [sent, setSent] = useState(initialSent)
  const [selectedEmail, setSelectedEmail] = useState<EmailRow | null>(null)
  const [composeOpen, setComposeOpen] = useState(false)
  const [toId, setToId] = useState("")
  const [replySubject, setReplySubject] = useState("")
  const [replyBody, setReplyBody] = useState("")
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  // Persist tab choice
  useEffect(() => { sessionStorage.setItem("email:tab", tab) }, [tab])

  // Restore selected email by ID after re-render
  useEffect(() => {
    const savedId = sessionStorage.getItem("email:selectedId")
    if (savedId && !selectedEmail) {
      const all = [...inbox, ...sent]
      const found = all.find((e) => e.id === savedId)
      if (found) setSelectedEmail(found)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emails = tab === "inbox" ? inbox : sent

  async function handleOpen(email: EmailRow) {
    setSelectedEmail(email)
    sessionStorage.setItem("email:selectedId", email.id)
    if (tab === "inbox" && !email.read) {
      // Update local state immediately — no server round-trip needed for UI
      setInbox((prev) => prev.map((e) => e.id === email.id ? { ...e, read: true } : e))
      await markEmailRead(email.id)
    }
  }

  function handleReply(email: EmailRow) {
    const sender = email.from
    if (!sender) return
    const senderUser = users.find((u) => u.email === sender.email)
    if (senderUser) setToId(senderUser.id)
    setReplySubject(`Re: ${email.subject}`)
    setReplyBody(`\n\n——— Original Message ———\nFrom: ${sender.name ?? sender.email}\n${email.body}`)
    setError(null)
    setComposeOpen(true)
  }

  function handleDelete(emailId: string) {
    if (!confirm("Delete this email?")) return
    // Optimistic update — remove from local state immediately
    setInbox((prev) => prev.filter((e) => e.id !== emailId))
    setSent((prev) => prev.filter((e) => e.id !== emailId))
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null)
      sessionStorage.removeItem("email:selectedId")
    }
    toast.success("Email deleted")
    startTransition(async () => {
      await deleteEmail(emailId)
    })
  }

  function handleCompose(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    const fd = new FormData(e.currentTarget)
    fd.set("toId", toId)

    startTransition(async () => {
      const result = await sendEmail(fd)
      if (result?.error) {
        setError(result.error)
      } else {
        toast.success("Email sent!")
        setComposeOpen(false)
        setToId("")
        setReplySubject("")
        setReplyBody("")
      }
    })
  }

  const unreadCount = inbox.filter((e) => !e.read).length

  return (
    <div className="flex h-[calc(100vh-160px)] glass-card rounded-2xl overflow-hidden border border-primary/20">
      {/* Left panel */}
      <div className="w-64 flex-shrink-0 border-r border-border/40 flex flex-col">
        {/* Compose button */}
        <div className="p-4 border-b border-border/40">
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20">
                <Pencil className="w-4 h-4 mr-2" /> Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-card border-primary/20 sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Mail className="w-5 h-5 text-primary" /> New Email
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleCompose} className="space-y-4 mt-2">
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">To</Label>
                  <Select value={toId} onValueChange={setToId} required>
                    <SelectTrigger className="glass border-border/50 h-10">
                      <SelectValue placeholder="Select recipient..." />
                    </SelectTrigger>
                    <SelectContent className="glass-card border-primary/20">
                      {users.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name ?? u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Subject</Label>
                  <Input name="subject" defaultValue={replySubject} placeholder="Subject..." required className="glass border-border/50 h-10" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm text-muted-foreground">Message</Label>
                  <Textarea name="body" defaultValue={replyBody} placeholder="Write your message..." required rows={6} className="glass border-border/50 resize-none" />
                </div>
                {error && (
                  <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <Button type="button" variant="outline" className="flex-1 glass" onClick={() => setComposeOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={isPending || !toId} className="flex-1 bg-gradient-to-r from-primary to-primary/80">
                    {isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <><SendIcon className="w-4 h-4 mr-2" />Send</>}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Folder list */}
        <nav className="p-2 space-y-1">
          <button
            onClick={() => { setTab("inbox"); setSelectedEmail(null) }}
            className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors", tab === "inbox" ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}
          >
            <Inbox className="w-4 h-4" />
            Inbox
            {unreadCount > 0 && <span className="ml-auto bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount}</span>}
          </button>
          <button
            onClick={() => { setTab("sent"); setSelectedEmail(null) }}
            className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors", tab === "sent" ? "bg-primary/15 text-primary font-medium" : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground")}
          >
            <SendIcon className="w-4 h-4" />
            Sent
            <span className="ml-auto text-xs font-mono text-muted-foreground">{sent.length}</span>
          </button>
        </nav>
      </div>

      {/* Email list */}
      <div className="w-72 flex-shrink-0 border-r border-border/40 flex flex-col">
        <div className="px-4 py-3 border-b border-border/40">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{tab === "inbox" ? "Inbox" : "Sent"} · {emails.length} emails</p>
        </div>
        <div className="flex-1 overflow-y-auto divide-y divide-border/20">
          {emails.length === 0 && (
            <p className="text-center py-10 text-muted-foreground text-sm italic">No emails here.</p>
          )}
          {emails.map((email) => {
            const isUnread = tab === "inbox" && !email.read
            const contact = tab === "inbox" ? email.from : email.to
            return (
              <button
                key={email.id}
                onClick={() => handleOpen(email)}
                className={cn("w-full text-left p-4 hover:bg-primary/5 transition-colors group", selectedEmail?.id === email.id && "bg-primary/10")}
              >
                <div className="flex items-start gap-2 mb-1">
                  {isUnread ? <MailOpen className="w-3.5 h-3.5 text-primary flex-shrink-0 mt-0.5" /> : <Mail className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />}
                  <p className={cn("text-sm truncate flex-1", isUnread ? "font-semibold text-foreground" : "font-medium text-muted-foreground")}>
                    {contact?.name ?? contact?.email ?? "Unknown"}
                  </p>
                </div>
                <p className={cn("text-xs truncate mb-1", isUnread ? "text-foreground" : "text-muted-foreground")}>{email.subject}</p>
                <p className="text-[10px] text-muted-foreground/60 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" />
                  {new Date(email.createdAt).toLocaleDateString()}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* Email detail */}
      <div className="flex-1 flex flex-col">
        {selectedEmail ? (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold text-foreground mb-2">{selectedEmail.subject}</h2>
                <p className="text-sm text-muted-foreground">
                  {tab === "inbox"
                    ? `From: ${selectedEmail.from?.name ?? selectedEmail.from?.email}`
                    : `To: ${selectedEmail.to?.name ?? selectedEmail.to?.email}`}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1 font-mono">
                  {new Date(selectedEmail.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {tab === "inbox" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReply(selectedEmail)}
                    className="glass border-primary/30 text-primary hover:bg-primary/10 gap-2"
                  >
                    <Reply className="w-3.5 h-3.5" /> Reply
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(selectedEmail.id)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="glass rounded-xl p-5 border border-border/40 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
              {selectedEmail.body}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground gap-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary/60" />
            </div>
            <div className="text-center">
              <p className="font-semibold text-foreground mb-1">Select an email</p>
              <p className="text-sm">Click an email from the list to read it</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
