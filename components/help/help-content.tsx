"use client"

import { Input } from "@/components/ui/input"
import { Search, BookOpen, Video, MessageCircle, Mail, HelpCircle, ArrowUpRight, ChevronRight } from "lucide-react"

const helpCategories = [
  {
    icon: BookOpen,
    title: "Documentation",
    description: "Browse our comprehensive guides and tutorials",
    color: "from-blue-500/20 to-blue-500/5 border-blue-500/30",
    iconColor: "text-blue-400",
  },
  { 
    icon: Video, 
    title: "Video Tutorials", 
    description: "Watch step-by-step video guides", 
    color: "from-purple-500/20 to-purple-500/5 border-purple-500/30",
    iconColor: "text-purple-400",
  },
  {
    icon: MessageCircle,
    title: "Community Forum",
    description: "Connect with other users and get answers",
    color: "from-green-500/20 to-green-500/5 border-green-500/30",
    iconColor: "text-green-400",
  },
  { 
    icon: Mail, 
    title: "Contact Support", 
    description: "Get help from our support team", 
    color: "from-amber-500/20 to-amber-500/5 border-amber-500/30",
    iconColor: "text-amber-400",
  },
]

const faqs = [
  {
    question: "How do I create a new project?",
    answer: "Click the '+ New Project' button on the dashboard or use the keyboard shortcut Ctrl+N to open the project creation modal.",
  },
  {
    question: "Can I invite team members?",
    answer: "Yes, navigate to the Team page and click '+ Add Member' to send invitation emails to new team members.",
  },
  {
    question: "How do I track time on tasks?",
    answer: "Use the Time Tracker widget on the dashboard. Click the play button to start tracking and stop when you're done.",
  },
  {
    question: "Can I export my data?",
    answer: "Yes, go to Analytics and click 'Export Report' to download your data in PDF, Excel, or JSON format.",
  },
  {
    question: "How do I change my notification settings?",
    answer: "Visit Settings > Notifications to customize which alerts you receive via email or push notifications.",
  },
]

export function HelpContent() {
  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <div className="relative">
        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" />
        <Input 
          placeholder="Search for help..." 
          className="pl-11 h-12 glass border-primary/20 focus:border-primary/50 text-base" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {helpCategories.map((category, index) => (
          <div
            key={category.title}
            className={`glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer animate-slide-in group bg-gradient-to-br ${category.color}`}
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-background/50 flex items-center justify-center border border-border/30">
                <category.icon className={`w-6 h-6 ${category.iconColor}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-foreground">{category.title}</h3>
                  <ArrowUpRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <HelpCircle className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Frequently Asked Questions</h3>
        </div>
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={faq.question}
              className="p-4 rounded-lg glass border border-transparent hover:border-primary/20 transition-all duration-300 cursor-pointer animate-slide-in group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{faq.question}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{faq.answer}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 mt-0.5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center border border-primary/30">
            <MessageCircle className="w-7 h-7 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg">Still need help?</h3>
            <p className="text-muted-foreground text-sm mt-1">Our support team is available 24/7 to assist you with any questions.</p>
          </div>
          <button className="px-5 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg font-medium text-sm hover:from-primary/90 hover:to-primary/70 transition-all shadow-lg shadow-primary/20">
            Contact Support
          </button>
        </div>
      </div>
    </div>
  )
}
