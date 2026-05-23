"use client"

import * as React from "react"
import { useState, useRef, KeyboardEvent, useTransition } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  UserPlus,
  X,
  Send,
  Copy,
  Check,
  Link2,
  Loader2,
  Mail,
  Shield,
  Users,
  Eye,
} from "lucide-react"
import { toast } from "sonner"
import { sendWorkspaceInvites } from "@/lib/actions/workspace-invite-actions"

interface InviteCollaboratorsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId?: string
  taskTitle?: string
}

const ROLE_OPTIONS = [
  {
    value: "member",
    label: "Member",
    description: "Can create and edit tasks",
    icon: Users,
    color: "text-primary",
  },
  {
    value: "viewer",
    label: "Viewer",
    description: "Can view tasks and comment",
    icon: Eye,
    color: "text-emerald-400",
  },
  {
    value: "admin",
    label: "Admin",
    description: "Full workspace access",
    icon: Shield,
    color: "text-amber-400",
  },
]

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function InviteCollaboratorsModal({
  open,
  onOpenChange,
  taskId,
  taskTitle,
}: InviteCollaboratorsModalProps) {
  const [chips, setChips] = useState<string[]>([])
  const [inputValue, setInputValue] = useState("")
  const [role, setRole] = useState("member")
  const [message, setMessage] = useState("")
  const [isCopied, setIsCopied] = useState(false)
  const [isPending, startTransition] = useTransition()
  const inputRef = useRef<HTMLInputElement>(null)

  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000"
  const inviteLink = `${appUrl}/login`

  const addChip = (email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    if (!isValidEmail(trimmed)) {
      toast.error(`"${trimmed}" is not a valid email address.`)
      return
    }
    if (chips.includes(trimmed)) {
      toast.error("This email has already been added.")
      return
    }
    setChips((prev) => [...prev, trimmed])
    setInputValue("")
  }

  const removeChip = (email: string) => {
    setChips((prev) => prev.filter((c) => c !== email))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault()
      addChip(inputValue)
    } else if (e.key === "Backspace" && !inputValue && chips.length > 0) {
      setChips((prev) => prev.slice(0, -1))
    }
  }

  const handleInputBlur = () => {
    if (inputValue.trim()) addChip(inputValue)
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pasted = e.clipboardData.getData("text")
    const emails = pasted.split(/[\s,;]+/).filter(Boolean)
    emails.forEach(addChip)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink)
      setIsCopied(true)
      toast.success("Invite link copied to clipboard!")
      setTimeout(() => setIsCopied(false), 2500)
    } catch {
      toast.error("Could not copy to clipboard.")
    }
  }

  const handleSend = () => {
    if (chips.length === 0) {
      toast.error("Add at least one email address.")
      inputRef.current?.focus()
      return
    }

    startTransition(async () => {
      const res = await sendWorkspaceInvites({
        emails: chips,
        role,
        message: message.trim() || undefined,
      })

      if (res.success) {
        toast.success(res.message ?? "Invitations sent!")
        setChips([])
        setMessage("")
        setInputValue("")
        onOpenChange(false)
      } else {
        toast.error(res.error ?? "Failed to send invitations.")
      }
    })
  }

  const selectedRole = ROLE_OPTIONS.find((r) => r.value === role)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border border-primary/20 sm:max-w-[560px] p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-primary/10 space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
              <UserPlus className="h-4 w-4 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Invite Collaborators
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {taskTitle
                  ? `Add teammates to collaborate on "${taskTitle}"`
                  : "Add developers, stakeholders, or clients to your workspace"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 py-5 space-y-5">
          {/* Email Chip Input */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="h-3 w-3" />
              Email Addresses
            </Label>
            <div
              onClick={() => inputRef.current?.focus()}
              className="min-h-[52px] glass border border-primary/20 rounded-xl px-3 py-2 flex flex-wrap gap-2 items-center cursor-text focus-within:border-primary/50 transition-colors"
            >
              {chips.map((email) => (
                <div
                  key={email}
                  className="flex items-center gap-1.5 bg-primary/15 border border-primary/25 text-primary text-xs rounded-lg px-2.5 py-1 font-medium animate-fade-in group"
                >
                  <span className="max-w-[180px] truncate">{email}</span>
                  <button
                    type="button"
                    onClick={() => removeChip(email)}
                    className="text-primary/60 hover:text-primary transition-colors shrink-0"
                    aria-label={`Remove ${email}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <input
                ref={inputRef}
                type="email"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleInputBlur}
                onPaste={handlePaste}
                placeholder={
                  chips.length === 0
                    ? "email@example.com, user@domain.com..."
                    : "Add another..."
                }
                className="flex-1 min-w-[160px] bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 outline-none border-none focus:ring-0 py-0.5"
                disabled={isPending}
              />
            </div>
            <p className="text-[10px] text-muted-foreground/60 pl-0.5">
              Press <kbd className="px-1 py-0.5 rounded bg-primary/10 border border-primary/15 font-mono text-[9px]">Enter</kbd> or <kbd className="px-1 py-0.5 rounded bg-primary/10 border border-primary/15 font-mono text-[9px]">,</kbd> after each email. Paste multiple at once.
            </p>
          </div>

          {/* Role Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Role
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {ROLE_OPTIONS.map((option) => {
                const Icon = option.icon
                const isSelected = role === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setRole(option.value)}
                    className={`relative p-3 rounded-xl border text-left transition-all duration-200 ${
                      isSelected
                        ? "border-primary/40 bg-primary/10 shadow-sm shadow-primary/10"
                        : "border-primary/10 bg-primary/5 hover:border-primary/25 hover:bg-primary/8"
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-2 w-2 text-primary-foreground" />
                      </div>
                    )}
                    <Icon className={`h-3.5 w-3.5 mb-2 ${option.color}`} />
                    <p className="text-xs font-semibold text-foreground">{option.label}</p>
                    <p className="text-[9px] text-muted-foreground leading-tight mt-0.5">
                      {option.description}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Personal Message */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Personal Message{" "}
              <span className="normal-case font-normal text-muted-foreground/50">(optional)</span>
            </Label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Hey! I'd love for you to join our workspace and help us with..."
              className="glass border-primary/20 focus:border-primary/40 resize-none min-h-[72px] text-sm placeholder:text-muted-foreground/40"
              maxLength={300}
              disabled={isPending}
            />
            <p className="text-[10px] text-muted-foreground/40 text-right">
              {message.length}/300
            </p>
          </div>

          <Separator className="bg-primary/10" />

          {/* Copy Invite Link */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-primary/10 bg-primary/5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0">
              <Link2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">Share invite link</p>
              <p className="text-[10px] text-muted-foreground truncate">{inviteLink}</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className={`h-8 gap-1.5 text-xs shrink-0 transition-all duration-200 ${
                isCopied
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                  : "border-primary/20 hover:border-primary/40 hover:bg-primary/10"
              }`}
            >
              {isCopied ? (
                <>
                  <Check className="h-3 w-3" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 pb-6 flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            className="flex-1 glass border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSend}
            disabled={isPending || chips.length === 0}
            className="flex-1 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold hover:from-primary/90 hover:to-primary/70 shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all duration-300 gap-2"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send {chips.length > 0 ? `${chips.length} Invite${chips.length !== 1 ? "s" : ""}` : "Invites"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
