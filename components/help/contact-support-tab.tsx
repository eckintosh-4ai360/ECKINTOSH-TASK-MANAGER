"use client"

import { useState } from "react"
import {
  Mail,
  Phone,
  MessageSquare,
  Clock,
  Send,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  Bug,
  Lightbulb,
  Globe,
  Shield,
  Zap,
  ChevronRight,
} from "lucide-react"
import { Input } from "@/components/ui/input"

const supportChannels = [
  {
    icon: Mail,
    title: "Email Support",
    description: "Get a detailed response within 24 hours",
    detail: "support@spagad.io",
    color: "from-blue-500/20 to-blue-500/5",
    iconColor: "text-blue-400",
    borderColor: "border-blue-500/30",
    available: true,
  },
  {
    icon: MessageSquare,
    title: "Live Chat",
    description: "Real-time support during business hours",
    detail: "Mon–Fri, 9AM–6PM EST",
    color: "from-emerald-500/20 to-emerald-500/5",
    iconColor: "text-emerald-400",
    borderColor: "border-emerald-500/30",
    available: true,
  },
  {
    icon: Phone,
    title: "Phone Support",
    description: "Premium plan members only",
    detail: "+1 (555) 0123-4567",
    color: "from-violet-500/20 to-violet-500/5",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/30",
    available: false,
  },
]

const ticketCategories = [
  { icon: Bug, label: "Bug Report", value: "bug", color: "text-red-400" },
  { icon: Lightbulb, label: "Feature Request", value: "feature", color: "text-amber-400" },
  { icon: HelpCircle, label: "General Question", value: "question", color: "text-blue-400" },
  { icon: Shield, label: "Security Issue", value: "security", color: "text-rose-400" },
  { icon: Globe, label: "Account & Billing", value: "billing", color: "text-emerald-400" },
  { icon: Zap, label: "Performance Issue", value: "performance", color: "text-orange-400" },
]

const recentTickets = [
  {
    id: "TKT-4521",
    subject: "Unable to export analytics report",
    status: "Open",
    statusColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    priority: "Medium",
    created: "2 hours ago",
  },
  {
    id: "TKT-4518",
    subject: "Sprint board drag-and-drop not working on Safari",
    status: "In Progress",
    statusColor: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    priority: "High",
    created: "1 day ago",
  },
  {
    id: "TKT-4512",
    subject: "Two-factor authentication setup question",
    status: "Resolved",
    statusColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    priority: "Low",
    created: "3 days ago",
  },
]

export function ContactSupportTab() {
  const [selectedCategory, setSelectedCategory] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [priority, setPriority] = useState("medium")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = () => {
    if (subject && message && selectedCategory) {
      setSubmitted(true)
      setTimeout(() => setSubmitted(false), 3000)
      setSubject("")
      setMessage("")
      setSelectedCategory("")
    }
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Support Channels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {supportChannels.map((channel, index) => (
          <div
            key={channel.title}
            className={`glass-card rounded-xl p-5 bg-gradient-to-br ${channel.color} hover:border-primary/30 transition-all duration-300 cursor-pointer group animate-slide-in relative overflow-hidden`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {!channel.available && (
              <div className="absolute top-3 right-3">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground border border-muted-foreground/20">
                  Premium
                </span>
              </div>
            )}
            <div className={`w-12 h-12 rounded-xl bg-background/50 ${channel.borderColor} flex items-center justify-center border mb-4`}>
              <channel.icon className={`w-6 h-6 ${channel.iconColor}`} />
            </div>
            <h3 className="font-semibold text-foreground mb-1">{channel.title}</h3>
            <p className="text-sm text-muted-foreground mb-3">{channel.description}</p>
            <div className="flex items-center gap-2">
              {channel.available ? (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
              )}
              <span className="text-xs font-medium text-foreground/80">{channel.detail}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Submit a Ticket Form */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Submit a Support Ticket</h3>
            <p className="text-xs text-muted-foreground">Our team typically responds within 4–8 hours</p>
          </div>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30 mb-4 animate-glow-pulse">
              <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            </div>
            <h4 className="font-semibold text-lg text-foreground mb-1">Ticket Submitted!</h4>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              We&apos;ve received your request and will get back to you within 4–8 hours. Check your email for updates.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Category Selection */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Category</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {ticketCategories.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                      selectedCategory === cat.value
                        ? "bg-primary/15 border-primary/30 text-primary shadow-md shadow-primary/10"
                        : "glass border-transparent hover:border-primary/20 text-muted-foreground hover:text-foreground"
                    }`}
                    id={`ticket-category-${cat.value}`}
                  >
                    <cat.icon className={`w-4 h-4 ${selectedCategory === cat.value ? "text-primary" : cat.color}`} />
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="text-sm font-medium text-foreground mb-3 block">Priority</label>
              <div className="flex gap-2">
                {[
                  { label: "Low", value: "low", color: "text-emerald-400" },
                  { label: "Medium", value: "medium", color: "text-amber-400" },
                  { label: "High", value: "high", color: "text-orange-400" },
                  { label: "Critical", value: "critical", color: "text-red-400" },
                ].map((p) => (
                  <button
                    key={p.value}
                    onClick={() => setPriority(p.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border ${
                      priority === p.value
                        ? "bg-primary/15 border-primary/30 text-primary"
                        : "glass border-transparent hover:border-primary/20 text-muted-foreground"
                    }`}
                    id={`ticket-priority-${p.value}`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block" htmlFor="ticket-subject">Subject</label>
              <Input
                id="ticket-subject"
                placeholder="Brief description of your issue..."
                className="h-11 glass border-primary/20 focus:border-primary/50"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </div>

            {/* Message */}
            <div>
              <label className="text-sm font-medium text-foreground mb-2 block" htmlFor="ticket-message">Message</label>
              <textarea
                id="ticket-message"
                placeholder="Please provide as much detail as possible. Include steps to reproduce the issue, expected behavior, and any error messages..."
                className="w-full h-36 glass border border-primary/20 focus:border-primary/50 rounded-xl p-4 text-sm text-foreground bg-transparent resize-none outline-none transition-colors placeholder:text-muted-foreground"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>

            {/* Attachments hint */}
            <div className="flex items-center gap-2 p-3 rounded-lg glass border border-amber-500/20 bg-amber-500/5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <p className="text-xs text-muted-foreground">
                For bug reports, consider including screenshots or screen recordings to help us diagnose the issue faster.
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!subject || !message || !selectedCategory}
              className="w-full px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-semibold text-sm hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg shadow-primary/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              id="submit-ticket-btn"
            >
              <Send className="w-4 h-4" />
              Submit Ticket
            </button>
          </div>
        )}
      </div>

      {/* Recent Tickets */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center border border-violet-500/30">
            <Clock className="w-4 h-4 text-violet-400" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Your Recent Tickets</h3>
        </div>
        <div className="space-y-2">
          {recentTickets.map((ticket, index) => (
            <div
              key={ticket.id}
              className="flex items-center gap-4 p-4 rounded-lg glass border border-transparent hover:border-primary/20 transition-all duration-300 cursor-pointer group animate-slide-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="shrink-0">
                <span className="text-xs font-mono text-primary font-bold">{ticket.id}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {ticket.subject}
                </h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {ticket.created}
                  </span>
                </div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${ticket.statusColor} shrink-0`}>
                {ticket.status}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
