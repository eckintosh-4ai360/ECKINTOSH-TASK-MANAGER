"use client"

import { useState } from "react"
import {
  Video,
  Play,
  Clock,
  Search,
  Star,
  Filter,
  BookOpen,
  Rocket,
  Layout,
  Users,
  BarChart3,
  Zap,
  Settings,
  Eye,
  ChevronRight,
  TrendingUp,
} from "lucide-react"
import { Input } from "@/components/ui/input"

const videoCategories = [
  { name: "All Videos", count: 48, active: true },
  { name: "Getting Started", count: 8 },
  { name: "Task Management", count: 12 },
  { name: "Sprint Planning", count: 6 },
  { name: "Team Features", count: 8 },
  { name: "Analytics", count: 7 },
  { name: "Advanced", count: 7 },
]

const featuredSeries = [
  {
    title: "Spagad Masterclass",
    description: "Complete beginner-to-expert series",
    episodes: 12,
    totalDuration: "2h 45min",
    icon: Rocket,
    color: "from-violet-500/25 to-indigo-500/10",
    iconColor: "text-violet-400",
    borderColor: "border-violet-500/30",
    progress: 35,
  },
  {
    title: "Agile with Spagad",
    description: "Master sprint planning and agile workflows",
    episodes: 8,
    totalDuration: "1h 30min",
    icon: Zap,
    color: "from-amber-500/25 to-orange-500/10",
    iconColor: "text-amber-400",
    borderColor: "border-amber-500/30",
    progress: 0,
  },
  {
    title: "Analytics Deep Dive",
    description: "Unlock the power of data-driven decisions",
    episodes: 6,
    totalDuration: "1h 15min",
    icon: BarChart3,
    color: "from-cyan-500/25 to-blue-500/10",
    iconColor: "text-cyan-400",
    borderColor: "border-cyan-500/30",
    progress: 60,
  },
]

const videoTutorials = [
  {
    title: "Creating Your First Project",
    description: "Learn how to set up a project from scratch with boards, labels, and milestones",
    category: "Getting Started",
    duration: "5:42",
    views: "15.2k",
    rating: 4.9,
    thumbnail: "🎬",
    color: "from-emerald-500/15 to-emerald-500/5",
    new: false,
  },
  {
    title: "Sprint Board Setup & Configuration",
    description: "Configure sprint boards with custom columns, WIP limits, and automation rules",
    category: "Sprint Planning",
    duration: "8:15",
    views: "12.1k",
    rating: 4.8,
    thumbnail: "📋",
    color: "from-blue-500/15 to-blue-500/5",
    new: true,
  },
  {
    title: "Team Invitation & Role Management",
    description: "Invite team members, set permissions, and manage organizational roles",
    category: "Team Features",
    duration: "6:30",
    views: "9.8k",
    rating: 4.7,
    thumbnail: "👥",
    color: "from-violet-500/15 to-violet-500/5",
    new: false,
  },
  {
    title: "Advanced Task Filtering & Views",
    description: "Create saved filters, custom views, and dynamic task boards",
    category: "Task Management",
    duration: "7:20",
    views: "8.4k",
    rating: 4.9,
    thumbnail: "🔍",
    color: "from-amber-500/15 to-amber-500/5",
    new: false,
  },
  {
    title: "Building Custom Analytics Dashboards",
    description: "Design personalized dashboards with charts, metrics, and real-time data",
    category: "Analytics",
    duration: "10:45",
    views: "7.6k",
    rating: 4.8,
    thumbnail: "📊",
    color: "from-cyan-500/15 to-cyan-500/5",
    new: true,
  },
  {
    title: "Keyboard Shortcuts & Productivity Tips",
    description: "Boost your workflow speed with essential shortcuts and power user tricks",
    category: "Advanced",
    duration: "4:55",
    views: "11.3k",
    rating: 4.9,
    thumbnail: "⌨️",
    color: "from-rose-500/15 to-rose-500/5",
    new: false,
  },
  {
    title: "Drag & Drop Task Management",
    description: "Master the drag-and-drop interface for quick task organization",
    category: "Task Management",
    duration: "3:40",
    views: "14.7k",
    rating: 4.7,
    thumbnail: "🖱️",
    color: "from-indigo-500/15 to-indigo-500/5",
    new: false,
  },
  {
    title: "Code Ops & Git Integration",
    description: "Connect your repositories and track commits, PRs, and deployments",
    category: "Advanced",
    duration: "9:10",
    views: "6.2k",
    rating: 4.8,
    thumbnail: "🔗",
    color: "from-green-500/15 to-green-500/5",
    new: true,
  },
  {
    title: "Calendar & Scheduling",
    description: "Manage deadlines, events, and team availability with the calendar view",
    category: "Team Features",
    duration: "5:25",
    views: "5.9k",
    rating: 4.6,
    thumbnail: "📅",
    color: "from-pink-500/15 to-pink-500/5",
    new: false,
  },
]

const relatedTopics = [
  { icon: BookOpen, label: "Documentation", description: "Read the full docs" },
  { icon: Layout, label: "Workflow Templates", description: "Pre-built templates" },
  { icon: Users, label: "Community", description: "Join discussions" },
  { icon: Settings, label: "Settings Guide", description: "Config reference" },
]

export function VideoTutorialsTab() {
  const [activeCategory, setActiveCategory] = useState("All Videos")
  const [searchQuery, setSearchQuery] = useState("")

  const filteredVideos = videoTutorials.filter((video) => {
    const matchesCategory = activeCategory === "All Videos" || video.category === activeCategory
    const matchesSearch =
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="space-y-8 animate-fade-in">
      {/* This tab is illustrative — there's no real video library or player
          behind it yet. */}
      <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5 text-xs text-muted-foreground">
        <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
        Preview — this shows what a tutorial library could look like. No videos are hosted here yet.
      </div>

      {/* Hero Section */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 via-primary/10 to-blue-500/20 rounded-2xl blur-xl opacity-50" />
        <div className="relative glass-card rounded-2xl p-6 border-primary/20">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/30 to-blue-500/20 flex items-center justify-center border border-purple-500/30">
              <Video className="w-10 h-10 text-purple-400" />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold text-foreground mb-1">Video Tutorials</h2>
              <p className="text-sm text-muted-foreground max-w-lg">
                Learn Spagad with step-by-step video guides. From beginner basics to advanced workflows — 
                watch at your own pace.
              </p>
              <div className="flex items-center gap-4 mt-3 justify-center md:justify-start">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Video className="w-3 h-3" /> 48 videos
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3" /> 6+ hours
                </span>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" /> Updated weekly
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Series */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Star className="w-5 h-5 text-amber-400" />
          <h3 className="font-semibold text-lg text-foreground">Featured Series</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredSeries.map((series, index) => (
            <div
              key={series.title}
              className={`glass-card rounded-xl p-5 bg-gradient-to-br ${series.color} hover:border-primary/30 transition-all duration-300 cursor-pointer group animate-slide-in`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-12 h-12 rounded-xl bg-background/50 ${series.borderColor} flex items-center justify-center border mb-4`}>
                <series.icon className={`w-6 h-6 ${series.iconColor}`} />
              </div>
              <h4 className="font-semibold text-foreground mb-1">{series.title}</h4>
              <p className="text-sm text-muted-foreground mb-3">{series.description}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                <span className="flex items-center gap-1">
                  <Video className="w-3 h-3" /> {series.episodes} episodes
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {series.totalDuration}
                </span>
              </div>
              {series.progress > 0 ? (
                <div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                    <span>{series.progress}% complete</span>
                    <span>Continue watching</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-muted/50">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-500"
                      style={{ width: `${series.progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-primary text-xs font-medium group-hover:gap-3 transition-all">
                  <Play className="w-3.5 h-3.5" />
                  Start watching
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="glass-card rounded-xl p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-primary/60" />
            <Input
              placeholder="Search video tutorials..."
              className="pl-11 h-11 glass border-primary/20 focus:border-primary/50"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              id="video-search-input"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Filter:</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          {videoCategories.map((category) => (
            <button
              key={category.name}
              onClick={() => setActiveCategory(category.name)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                activeCategory === category.name
                  ? "bg-primary/20 text-primary border-primary/30 shadow-md shadow-primary/10"
                  : "glass border-transparent hover:border-primary/20 text-muted-foreground hover:text-foreground"
              }`}
              id={`video-category-${category.name.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {category.name}
              <span className="ml-1.5 opacity-60">{category.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredVideos.length === 0 ? (
          <div className="col-span-full glass-card rounded-xl p-12 text-center">
            <Video className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
            <h4 className="font-semibold text-foreground mb-1">No videos found</h4>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filter</p>
          </div>
        ) : (
          filteredVideos.map((video, index) => (
            <div
              key={video.title}
              className={`glass-card rounded-xl overflow-hidden hover:border-primary/30 transition-all duration-300 cursor-pointer group animate-slide-in`}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* Thumbnail */}
              <div className={`relative h-36 bg-gradient-to-br ${video.color} flex items-center justify-center`}>
                <span className="text-4xl">{video.thumbnail}</span>
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/30 backdrop-blur-sm">
                  <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center shadow-lg shadow-primary/30">
                    <Play className="w-5 h-5 text-primary-foreground ml-0.5" />
                  </div>
                </div>
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-xs font-mono">
                  {video.duration}
                </div>
                {video.new && (
                  <div className="absolute top-2 left-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-emerald-500 text-white">
                      NEW
                    </span>
                  </div>
                )}
              </div>
              {/* Content */}
              <div className="p-4">
                <h4 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors mb-1 line-clamp-1">
                  {video.title}
                </h4>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                  {video.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {video.views}
                    </span>
                    <span className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400" /> {video.rating}
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted/50 text-muted-foreground">
                    {video.category}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Related Topics */}
      <div className="glass-card rounded-xl p-6">
        <h3 className="font-semibold text-lg text-foreground mb-4">Related Resources</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {relatedTopics.map((topic, index) => (
            <div
              key={topic.label}
              className="glass rounded-xl p-4 border border-primary/10 hover:border-primary/25 transition-all duration-300 cursor-pointer group text-center animate-slide-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30 mx-auto mb-2">
                <topic.icon className="w-5 h-5 text-primary" />
              </div>
              <h4 className="font-semibold text-sm text-foreground mb-0.5">{topic.label}</h4>
              <p className="text-xs text-muted-foreground">{topic.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
