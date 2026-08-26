"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import {
  Search,
  BookOpen,
  Video,
  MessageCircle,
  Mail,
  HelpCircle,
  ChevronRight,
  ArrowRight,
  Headphones,
  Sparkles,
  ExternalLink,
  Lightbulb,
  Clock,
} from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { DocumentationTab } from "./documentation-tab"
import { CommunityForumTab } from "./community-forum-tab"
import { ContactSupportTab } from "./contact-support-tab"
import type { SupportTicketView } from "@/lib/actions/support-actions"
import { VideoTutorialsTab } from "./video-tutorials-tab"

const faqs = [
  {
    question: "How do I create a new project?",
    answer:
      "Click the '+ New Project' button on the dashboard or use the keyboard shortcut Ctrl+N to open the project creation modal. Fill in the project name, description, and select a template to get started.",
  },
  {
    question: "Can I invite team members?",
    answer:
      "Yes, navigate to the Team page and click '+ Add Member' to send invitation emails to new team members. You can assign roles like Admin, Manager, or Member during the invitation process.",
  },
  {
    question: "How do I track time on tasks?",
    answer:
      "Use the Time Tracker widget on the dashboard. Click the play button to start tracking and stop when you're done. Time entries are automatically linked to the active task.",
  },
  {
    question: "Can I export my data?",
    answer:
      "Yes, go to Analytics and click 'Export Report' to download your data in PDF, Excel, or JSON format. You can also schedule automated reports to be sent to your email.",
  },
  {
    question: "How do I change my notification settings?",
    answer:
      "Visit Settings > Notifications to customize which alerts you receive via email or push notifications. You can set per-project and per-channel notification preferences.",
  },
  {
    question: "What keyboard shortcuts are available?",
    answer:
      "Press Ctrl+/ (or Cmd+/ on Mac) to view all keyboard shortcuts. Common ones include Ctrl+K for search, Ctrl+N for new task, and Ctrl+Shift+P for command palette.",
  },
  {
    question: "How do I set up sprint boards?",
    answer:
      "Go to Sprints in the sidebar, click 'Create Sprint', set the duration (1-4 weeks), and drag tasks from the backlog into the sprint. You can customize columns and add WIP limits.",
  },
  {
    question: "Is there a mobile app available?",
    answer:
      "Spagad is fully responsive and works great in mobile browsers. Native iOS and Android apps are currently in development and will be available soon in the app stores.",
  },
]

const quickLinks = [
  { icon: Sparkles, label: "What's New", description: "Latest features and updates", href: "#" },
  { icon: Lightbulb, label: "Tips & Tricks", description: "Power user productivity tips", href: "#" },
  { icon: Clock, label: "System Status", description: "Check platform uptime", href: "#" },
]

export function HelpContent({ initialTickets = [] }: { initialTickets?: SupportTicketView[] }) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null)
  const [globalSearch, setGlobalSearch] = useState("")

  const filteredFaqs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(globalSearch.toLowerCase()) ||
      faq.answer.toLowerCase().includes(globalSearch.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-fade-in max-w-5xl">
      {/* Hero Search Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/15 via-violet-500/10 to-blue-500/15 rounded-2xl blur-2xl opacity-60" />
        <div className="relative glass-card rounded-2xl p-8 border-primary/20 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/30 mx-auto mb-4 animate-glow-pulse">
            <Headphones className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            How can we help you?
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6">
            Search our knowledge base, browse tutorials, or get in touch with our support team
          </p>
          <div className="relative max-w-xl mx-auto">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" />
            <Input
              placeholder="Search for help articles, tutorials, FAQs..."
              className="pl-12 h-13 glass border-primary/20 focus:border-primary/50 text-base rounded-xl shadow-lg shadow-primary/5"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              id="help-global-search"
            />
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-5">
            {quickLinks.map((link) => (
              <button
                key={link.label}
                className="flex items-center gap-2 px-4 py-2 rounded-lg glass border border-primary/15 hover:border-primary/30 text-sm text-muted-foreground hover:text-foreground transition-all duration-200 group"
              >
                <link.icon className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                <span className="font-medium">{link.label}</span>
                <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="documentation" className="w-full">
        <TabsList className="w-full h-auto p-1.5 glass-card rounded-xl border border-primary/15 flex flex-wrap gap-1">
          <TabsTrigger
            value="documentation"
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary/20 data-[state=active]:to-primary/10 data-[state=active]:text-primary data-[state=active]:border-primary/30 data-[state=active]:shadow-md data-[state=active]:shadow-primary/10 transition-all duration-200"
            id="tab-documentation"
          >
            <BookOpen className="w-4 h-4" />
            Documentation
          </TabsTrigger>
          <TabsTrigger
            value="community"
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500/20 data-[state=active]:to-green-500/10 data-[state=active]:text-green-400 data-[state=active]:border-green-500/30 data-[state=active]:shadow-md data-[state=active]:shadow-green-500/10 transition-all duration-200"
            id="tab-community"
          >
            <MessageCircle className="w-4 h-4" />
            Community Forum
          </TabsTrigger>
          <TabsTrigger
            value="support"
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500/20 data-[state=active]:to-amber-500/10 data-[state=active]:text-amber-400 data-[state=active]:border-amber-500/30 data-[state=active]:shadow-md data-[state=active]:shadow-amber-500/10 transition-all duration-200"
            id="tab-support"
          >
            <Mail className="w-4 h-4" />
            Contact Support
          </TabsTrigger>
          <TabsTrigger
            value="videos"
            className="flex-1 min-w-[140px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500/20 data-[state=active]:to-purple-500/10 data-[state=active]:text-purple-400 data-[state=active]:border-purple-500/30 data-[state=active]:shadow-md data-[state=active]:shadow-purple-500/10 transition-all duration-200"
            id="tab-videos"
          >
            <Video className="w-4 h-4" />
            Video Tutorials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="documentation" className="mt-6">
          <DocumentationTab />
        </TabsContent>

        <TabsContent value="community" className="mt-6">
          <CommunityForumTab />
        </TabsContent>

        <TabsContent value="support" className="mt-6">
          <ContactSupportTab initialTickets={initialTickets} />
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          <VideoTutorialsTab />
        </TabsContent>
      </Tabs>

      {/* FAQ Section */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <HelpCircle className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Frequently Asked Questions</h3>
            <p className="text-xs text-muted-foreground">{filteredFaqs.length} questions</p>
          </div>
        </div>
        <div className="space-y-2">
          {filteredFaqs.length === 0 ? (
            <div className="text-center py-8">
              <HelpCircle className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No FAQs match your search</p>
            </div>
          ) : (
            filteredFaqs.map((faq, index) => (
              <div
                key={faq.question}
                className="rounded-xl overflow-hidden animate-slide-in"
                style={{ animationDelay: `${index * 40}ms` }}
              >
                <button
                  onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}
                  className={`w-full p-4 text-left glass border transition-all duration-300 rounded-xl group ${
                    expandedFaq === index
                      ? "border-primary/30 bg-primary/5"
                      : "border-transparent hover:border-primary/15"
                  }`}
                  id={`faq-${index}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all duration-300 ${
                        expandedFaq === index
                          ? "bg-primary/20 border-primary/30"
                          : "bg-muted/30 border-transparent group-hover:bg-primary/10 group-hover:border-primary/20"
                      }`}>
                        <span className="text-xs font-bold text-primary">Q</span>
                      </div>
                      <h4 className={`font-medium text-sm transition-colors ${
                        expandedFaq === index ? "text-primary" : "text-foreground group-hover:text-primary"
                      }`}>
                        {faq.question}
                      </h4>
                    </div>
                    <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
                      expandedFaq === index ? "rotate-90 text-primary" : ""
                    }`} />
                  </div>
                  {expandedFaq === index && (
                    <div className="mt-3 ml-10 animate-fade-in">
                      <p className="text-sm text-muted-foreground leading-relaxed">{faq.answer}</p>
                    </div>
                  )}
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Still Need Help CTA */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-violet-500/15 to-blue-500/20 rounded-2xl blur-xl opacity-40" />
        <div className="relative glass-card rounded-2xl p-8 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/25">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30 animate-glow-pulse">
              <MessageCircle className="w-10 h-10 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl text-foreground">Still need help?</h3>
              <p className="text-muted-foreground text-sm mt-1 max-w-md">
                Our support team is available 24/7 to assist you with any questions. 
                Average response time is under 2 hours.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-3 justify-center md:justify-start">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs text-muted-foreground">24/7 Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">&lt; 2hr response</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">98% satisfaction</span>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <button className="px-6 py-3 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-xl font-semibold text-sm hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg shadow-primary/25 flex items-center gap-2 group"
                id="still-need-help-chat"
              >
                <MessageCircle className="w-4 h-4" />
                Start Live Chat
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
              <button className="px-6 py-3 glass border border-primary/25 hover:border-primary/40 text-foreground rounded-xl font-medium text-sm transition-all flex items-center gap-2"
                id="still-need-help-email"
              >
                <Mail className="w-4 h-4 text-primary" />
                Email Us
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
