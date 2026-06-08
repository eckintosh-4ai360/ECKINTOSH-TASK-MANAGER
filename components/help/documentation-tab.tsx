"use client"

import { useState } from "react"
import {
  Search,
  BookOpen,
  Rocket,
  Layout,
  Users,
  BarChart3,
  Settings,
  Shield,
  Zap,
  ArrowRight,
  FileText,
  ExternalLink,
} from "lucide-react"
import { Input } from "@/components/ui/input"

const docCategories = [
  {
    icon: Rocket,
    title: "Getting Started",
    description: "Set up your workspace and create your first project",
    articles: 12,
    color: "from-emerald-500/20 to-emerald-500/5",
    iconBg: "bg-emerald-500/15 border-emerald-500/30",
    iconColor: "text-emerald-400",
    badge: "Popular",
  },
  {
    icon: Layout,
    title: "Projects & Tasks",
    description: "Organize work with projects, boards, and task management",
    articles: 24,
    color: "from-blue-500/20 to-blue-500/5",
    iconBg: "bg-blue-500/15 border-blue-500/30",
    iconColor: "text-blue-400",
    badge: null,
  },
  {
    icon: Users,
    title: "Team Collaboration",
    description: "Invite members, assign roles, and collaborate in real-time",
    articles: 18,
    color: "from-violet-500/20 to-violet-500/5",
    iconBg: "bg-violet-500/15 border-violet-500/30",
    iconColor: "text-violet-400",
    badge: null,
  },
  {
    icon: Zap,
    title: "Sprints & Agile",
    description: "Sprint planning, backlog management, and velocity tracking",
    articles: 15,
    color: "from-amber-500/20 to-amber-500/5",
    iconBg: "bg-amber-500/15 border-amber-500/30",
    iconColor: "text-amber-400",
    badge: "New",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    description: "Track progress, generate reports, and export data",
    articles: 10,
    color: "from-cyan-500/20 to-cyan-500/5",
    iconBg: "bg-cyan-500/15 border-cyan-500/30",
    iconColor: "text-cyan-400",
    badge: null,
  },
  {
    icon: Settings,
    title: "Settings & Config",
    description: "Customize notifications, themes, integrations, and more",
    articles: 14,
    color: "from-slate-500/20 to-slate-500/5",
    iconBg: "bg-slate-500/15 border-slate-500/30",
    iconColor: "text-slate-400",
    badge: null,
  },
  {
    icon: Shield,
    title: "Security & Permissions",
    description: "Role-based access, two-factor auth, and audit logs",
    articles: 8,
    color: "from-rose-500/20 to-rose-500/5",
    iconBg: "bg-rose-500/15 border-rose-500/30",
    iconColor: "text-rose-400",
    badge: null,
  },
  {
    icon: BookOpen,
    title: "API Reference",
    description: "REST API endpoints, webhooks, and developer guides",
    articles: 22,
    color: "from-indigo-500/20 to-indigo-500/5",
    iconBg: "bg-indigo-500/15 border-indigo-500/30",
    iconColor: "text-indigo-400",
    badge: null,
  },
]

const quickStartSteps = [
  { step: 1, title: "Create a Workspace", description: "Set up your team workspace with a name and invite link" },
  { step: 2, title: "Add Your Project", description: "Create a project with boards, labels, and milestones" },
  { step: 3, title: "Invite Team Members", description: "Send invitations and assign roles to your team" },
  { step: 4, title: "Start Building", description: "Create tasks, plan sprints, and track progress" },
]

export function DocumentationTab() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredCategories = docCategories.filter(
    (c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Search Bar */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-blue-500/10 to-purple-500/20 rounded-2xl blur-xl opacity-50" />
        <div className="relative glass-card rounded-2xl p-6 border-primary/20">
          <h2 className="text-xl font-bold text-foreground mb-1">Browse Documentation</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Search through our comprehensive guides, tutorials, and API references
          </p>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" />
            <Input
              placeholder="Search documentation... (e.g. 'create project', 'invite team')"
              className="pl-12 h-12 glass border-primary/20 focus:border-primary/50 text-base rounded-xl"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="doc-search-input"
            />
          </div>
        </div>
      </div>

      {/* Quick Start Guide */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center border border-emerald-500/30">
            <Rocket className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Quick Start Guide</h3>
            <p className="text-xs text-muted-foreground">Get up and running in under 5 minutes</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickStartSteps.map((item, index) => (
            <div
              key={item.step}
              className="relative group cursor-pointer animate-slide-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="glass rounded-xl p-4 border border-primary/10 hover:border-primary/30 transition-all duration-300 h-full">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center text-sm font-bold text-primary border border-primary/30">
                    {item.step}
                  </div>
                  {index < quickStartSteps.length - 1 && (
                    <ArrowRight className="w-4 h-4 text-muted-foreground/40 absolute -right-3 top-1/2 -translate-y-1/2 hidden lg:block" />
                  )}
                </div>
                <h4 className="font-semibold text-sm text-foreground mb-1">{item.title}</h4>
                <p className="text-xs text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Documentation Categories Grid */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg text-foreground">Browse by Category</h3>
          <span className="text-xs text-muted-foreground">({filteredCategories.length} categories)</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCategories.map((category, index) => (
            <div
              key={category.title}
              className={`glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 cursor-pointer animate-slide-in group bg-gradient-to-br ${category.color}`}
              style={{ animationDelay: `${index * 80}ms` }}
              id={`doc-category-${category.title.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-xl ${category.iconBg} flex items-center justify-center border`}>
                  <category.icon className={`w-6 h-6 ${category.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-semibold text-foreground">{category.title}</h4>
                    {category.badge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${
                        category.badge === "New" 
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
                          : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                      }`}>
                        {category.badge}
                      </span>
                    )}
                    <ExternalLink className="w-3.5 h-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
                  </div>
                  <p className="text-sm text-muted-foreground">{category.description}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <BookOpen className="w-3 h-3 text-muted-foreground/60" />
                    <span className="text-xs text-muted-foreground/80">{category.articles} articles</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
