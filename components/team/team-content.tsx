"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Mail, MessageCircle, MoreHorizontal, CheckCircle2, Clock } from "lucide-react"

const teamMembers = [
  {
    name: "Alexandra Deff",
    role: "Product Designer",
    email: "alexandra@tasko.com",
    status: "active",
    tasks: 12,
    completed: 8,
    avatar: "/avatars/avatar-1.jpg",
    initials: "AD",
  },
  {
    name: "Edwin Adenike",
    role: "Frontend Developer",
    email: "edwin@tasko.com",
    status: "active",
    tasks: 8,
    completed: 5,
    avatar: "/avatars/avatar-2.jpg",
    initials: "EA",
  },
  {
    name: "Isaac Oluwatemilorun",
    role: "Backend Developer",
    email: "isaac@tasko.com",
    status: "away",
    tasks: 15,
    completed: 12,
    avatar: "/avatars/avatar-3.jpg",
    initials: "IO",
  },
  {
    name: "David Oshodi",
    role: "UI/UX Designer",
    email: "david@tasko.com",
    status: "active",
    tasks: 6,
    completed: 4,
    avatar: "/avatars/avatar-4.jpg",
    initials: "DO",
  },
]

export function TeamContent() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {teamMembers.map((member, index) => (
          <div
            key={member.email}
            className="glass-card rounded-xl p-5 hover:border-primary/30 transition-all duration-300 animate-slide-in group"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-start justify-between mb-4">
              <div className="relative">
                <Avatar className="w-14 h-14 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                  <AvatarImage src={member.avatar || "/placeholder.svg"} alt={member.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-mono">{member.initials}</AvatarFallback>
                </Avatar>
                <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card ${member.status === "active" ? "bg-primary animate-pulse" : "bg-muted-foreground"}`}></span>
              </div>
              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">{member.name}</h3>
                <p className="text-sm text-muted-foreground font-mono text-xs">{member.role}</p>
              </div>

              <span className={`text-[10px] px-2 py-0.5 rounded border font-mono uppercase inline-block ${
                member.status === "active" 
                  ? "bg-primary/20 text-primary border-primary/30"
                  : "bg-muted text-muted-foreground border-border/30"
              }`}>
                {member.status === "active" ? "Online" : "Away"}
              </span>

              <div className="pt-3 border-t border-border/50 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                    Completed
                  </span>
                  <span className="font-semibold font-mono text-primary">{member.completed}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                    <Clock className="w-3.5 h-3.5 text-chart-4" />
                    In Progress
                  </span>
                  <span className="font-semibold font-mono">{member.tasks - member.completed}</span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" className="flex-1 glass border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-xs">
                  <Mail className="w-3.5 h-3.5 mr-1" />
                  Email
                </Button>
                <Button variant="outline" size="sm" className="flex-1 glass border-primary/20 hover:border-primary/40 hover:bg-primary/5 text-xs">
                  <MessageCircle className="w-3.5 h-3.5 mr-1" />
                  Chat
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
