"use client"

import { useState } from "react"
import {
  MessageCircle,
  ThumbsUp,
  Eye,
  Clock,
  Search,
  Filter,
  TrendingUp,
  Star,
  MessageSquare,
  ChevronRight,
  Users,
  Pin,
  CheckCircle2,
  Flame,
} from "lucide-react"
import { Input } from "@/components/ui/input"

const forumCategories = [
  { name: "All Topics", count: 1284, active: true },
  { name: "General Discussion", count: 456 },
  { name: "Feature Requests", count: 128 },
  { name: "Bug Reports", count: 67 },
  { name: "Tips & Tricks", count: 234 },
  { name: "Integrations", count: 89 },
  { name: "Show & Tell", count: 310 },
]

const forumThreads = [
  {
    title: "Best practices for managing large sprint backlogs",
    author: "Sarah Chen",
    avatar: "SC",
    avatarColor: "from-violet-500 to-violet-600",
    category: "Tips & Tricks",
    replies: 42,
    views: 1280,
    likes: 89,
    timeAgo: "2 hours ago",
    pinned: true,
    solved: false,
    hot: true,
    preview: "I've been managing a team of 15+ developers and wanted to share some strategies that helped us..."
  },
  {
    title: "How to set up automated task assignment with custom rules",
    author: "James Park",
    avatar: "JP",
    avatarColor: "from-blue-500 to-blue-600",
    category: "Tips & Tricks",
    replies: 28,
    views: 876,
    likes: 56,
    timeAgo: "4 hours ago",
    pinned: false,
    solved: true,
    hot: false,
    preview: "Here's a step-by-step guide on creating automation rules for task assignment..."
  },
  {
    title: "[Feature Request] Dark mode calendar view",
    author: "Maria Gonzalez",
    avatar: "MG",
    avatarColor: "from-emerald-500 to-emerald-600",
    category: "Feature Requests",
    replies: 67,
    views: 2340,
    likes: 145,
    timeAgo: "1 day ago",
    pinned: true,
    solved: false,
    hot: true,
    preview: "It would be amazing to have a dedicated dark mode for the calendar view with custom theming..."
  },
  {
    title: "Integrating Spagad with GitHub Actions for CI/CD",
    author: "Alex Turner",
    avatar: "AT",
    avatarColor: "from-amber-500 to-amber-600",
    category: "Integrations",
    replies: 19,
    views: 654,
    likes: 34,
    timeAgo: "2 days ago",
    pinned: false,
    solved: true,
    hot: false,
    preview: "I recently integrated Spagad into our CI/CD pipeline and the results have been incredible..."
  },
  {
    title: "Sprint velocity dropped after team expansion — any advice?",
    author: "David Kim",
    avatar: "DK",
    avatarColor: "from-rose-500 to-rose-600",
    category: "General Discussion",
    replies: 31,
    views: 890,
    likes: 23,
    timeAgo: "3 days ago",
    pinned: false,
    solved: false,
    hot: false,
    preview: "We expanded from 5 to 12 developers last month and our velocity metrics have dropped..."
  },
  {
    title: "Show & Tell: Custom dashboard I built for our design team",
    author: "Emma Wilson",
    avatar: "EW",
    avatarColor: "from-pink-500 to-pink-600",
    category: "Show & Tell",
    replies: 52,
    views: 1540,
    likes: 98,
    timeAgo: "3 days ago",
    pinned: false,
    solved: false,
    hot: true,
    preview: "Just shipped a custom dashboard layout optimized for design workflows. Here's how..."
  },
]

const communityStats = [
  { label: "Members", value: "24.5k", icon: Users },
  { label: "Topics", value: "1,284", icon: MessageSquare },
  { label: "Solutions", value: "847", icon: CheckCircle2 },
  { label: "Online Now", value: "312", icon: TrendingUp },
]

export function CommunityForumTab() {
  const [activeCategory, setActiveCategory] = useState("All Topics")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredThreads = forumThreads.filter((thread) => {
    const matchesCategory = activeCategory === "All Topics" || thread.category === activeCategory
    const matchesSearch =
      thread.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      thread.preview.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* This tab is illustrative — no forum backend exists yet, so nothing
          below is live or persisted. Contact Support is the real channel. */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
        <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
        Preview — this shows what a community forum could look like. It&apos;s not connected to real discussions yet;
        use the Contact Support tab to actually reach the team.
      </div>

      {/* Community Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {communityStats.map((stat, index) => (
          <div
            key={stat.label}
            className="glass-card rounded-xl p-4 text-center animate-slide-in"
            style={{ animationDelay: `${index * 80}ms` }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30 mx-auto mb-2">
              <stat.icon className="w-5 h-5 text-primary" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filter */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" />
            <Input
              placeholder="Search community discussions..."
              className="pl-11 h-11 glass border-primary/20 focus:border-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="forum-search-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
          </div>
        </div>

        {/* Category Chips */}
        <div className="flex flex-wrap gap-2 mt-4">
          {forumCategories.map((category) => (
            <button
              key={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                activeCategory === category.name
                  ? "bg-primary/20 text-primary border-primary/30 shadow-md shadow-primary/10"
                  : "glass border-transparent hover:border-primary/20 text-muted-foreground hover:text-foreground"
              }`}
              id={`forum-category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {category.name}
              <span className="ml-1.5 opacity-60">{category.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Forum Threads */}
      <div className="space-y-3">
        {filteredThreads.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <MessageCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h4 className="font-semibold text-foreground mb-1">No discussions found</h4>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filter</p>
          </div>
        ) : (
          filteredThreads.map((thread, index) => (
            <div
              key={thread.title}
              className="glass-card rounded-xl p-5 hover:border-primary/25 transition-all duration-300 cursor-pointer group animate-slide-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${thread.avatarColor} flex items-center justify-center text-white text-xs font-bold shrink-0`}>
                  {thread.avatar}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    {thread.pinned && (
                      <Pin className="w-3 h-3 text-amber-400 shrink-0" />
                    )}
                    {thread.hot && (
                      <Flame className="w-3 h-3 text-orange-400 shrink-0" />
                    )}
                    <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                      {thread.title}
                    </h4>
                    {thread.solved && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0">
                        Solved
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{thread.preview}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/80">{thread.author}</span>
                    <span className="text-muted-foreground/30">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {thread.timeAgo}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground text-[10px]">
                      {thread.category}
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-5 shrink-0 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1 hover:text-primary transition-colors" title="Replies">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>{thread.replies}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Views">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{thread.views}</span>
                  </div>
                  <div className="flex items-center gap-1 hover:text-amber-400 transition-colors" title="Likes">
                    <ThumbsUp className="w-3.5 h-3.5" />
                    <span>{thread.likes}</span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Start a Discussion CTA */}
      <div className="glass-card rounded-xl p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/5 border-green-500/20">
        <div className="flex flex-col md:flex-row items-center gap-4 text-center md:text-left">
          <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center border border-green-500/30">
            <MessageSquare className="w-7 h-7 text-green-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-foreground text-lg">Start a Discussion</h3>
            <p className="text-muted-foreground text-sm mt-1">
              Can&apos;t find what you&apos;re looking for? Start a new thread and get help from the community.
            </p>
          </div>
          <button className="px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium text-sm hover:from-green-500/90 hover:to-emerald-500/90 transition-all shadow-lg shadow-green-500/20"
            id="new-discussion-btn"
          >
            New Discussion
          </button>
        </div>
      </div>

      {/* Top Contributors */}
      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-500/5 flex items-center justify-center border border-amber-500/30">
            <Star className="w-4 h-4 text-amber-400" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Top Contributors</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { name: "Sarah Chen", avatar: "SC", color: "from-violet-500 to-violet-600", solutions: 124, posts: 289, badge: "Expert" },
            { name: "Alex Turner", avatar: "AT", color: "from-amber-500 to-amber-600", solutions: 98, posts: 215, badge: "Mentor" },
            { name: "Emma Wilson", avatar: "EW", color: "from-pink-500 to-pink-600", solutions: 76, posts: 178, badge: "Helper" },
          ].map((contributor, index) => (
            <div
              key={contributor.name}
              className="glass rounded-xl p-4 border border-primary/10 hover:border-primary/25 transition-all duration-300 cursor-pointer group animate-slide-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${contributor.color} flex items-center justify-center text-white text-xs font-bold`}>
                  {contributor.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm text-foreground truncate">{contributor.name}</h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-primary/20 text-primary border border-primary/30">
                      {contributor.badge}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contributor.solutions} solutions · {contributor.posts} posts
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
