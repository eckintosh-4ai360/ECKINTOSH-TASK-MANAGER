"use client"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus } from "lucide-react"
import { AddMemberModal } from "@/components/modals/add-member-modal"

const members = [
  {
    name: "Alexandra Deff",
    task: "Github Project Repository",
    status: "Online",
    statusColor: "bg-primary/20 text-primary border-primary/30",
    avatar: "AD",
    avatarImage: "/avatars/avatar-1.jpg",
    isOnline: true,
  },
  {
    name: "Edwin Adenike",
    task: "User Authentication System",
    status: "Active",
    statusColor: "bg-chart-4/20 text-chart-4 border-chart-4/30",
    avatar: "EA",
    avatarImage: "/avatars/avatar-2.jpg",
    isOnline: true,
  },
  {
    name: "Isaac Oluwatemilorun",
    task: "Search & Filter Module",
    status: "Away",
    statusColor: "bg-muted text-muted-foreground border-border/30",
    avatar: "IO",
    avatarImage: "/avatars/avatar-3.jpg",
    isOnline: false,
  },
  {
    name: "David Oshodi",
    task: "Responsive Layout",
    status: "Active",
    statusColor: "bg-chart-4/20 text-chart-4 border-chart-4/30",
    avatar: "DO",
    avatarImage: "/avatars/avatar-4.jpg",
    isOnline: true,
  },
]

export function TeamCollaboration() {
  return (
    <div
      className="glass-card rounded-xl p-6 transition-all duration-500 hover:border-primary/30 animate-slide-in-up"
      style={{ animationDelay: "600ms" }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-primary">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Team Status</h2>
        </div>
        <AddMemberModal>
          <Button 
            variant="outline" 
            size="sm" 
            className="glass border-primary/30 hover:border-primary/50 hover:bg-primary/10 text-foreground"
          >
            <Plus className="w-4 h-4 mr-1" />
            Invite
          </Button>
        </AddMemberModal>
      </div>
      
      <div className="space-y-2">
        {members.map((member, index) => (
          <div
            key={member.name}
            className="flex items-center gap-3 p-3 rounded-lg glass hover:bg-primary/5 hover:border-primary/20 border border-transparent transition-all duration-300 cursor-pointer group"
            style={{ animationDelay: `${650 + index * 100}ms` }}
          >
            <div className="relative">
              <Avatar className="w-10 h-10 ring-2 ring-border/50 transition-all duration-300 group-hover:ring-primary/40">
                <AvatarImage src={member.avatarImage || "/placeholder.svg"} alt={member.name} />
                <AvatarFallback className="bg-secondary text-foreground font-mono text-xs">{member.avatar}</AvatarFallback>
              </Avatar>
              <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${member.isOnline ? "bg-primary animate-pulse" : "bg-muted-foreground"}`}></span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground text-sm">{member.name}</p>
              <p className="text-xs text-muted-foreground truncate font-mono">{member.task}</p>
            </div>
            <span
              className={`${member.statusColor} text-[10px] px-2.5 py-1 rounded-full font-medium border uppercase tracking-wider`}
            >
              {member.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
