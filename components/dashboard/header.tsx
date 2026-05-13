"use client"

import { Search, Mail, Bell, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MobileNav } from "./mobile-nav"
import type { ReactNode } from "react"

interface HeaderProps {
  title: string
  description: string
  actions?: ReactNode
}

export function Header({ title, description, actions }: HeaderProps) {
  return (
    <header className="space-y-4 md:space-y-5 animate-slide-in-up">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <MobileNav />

          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary/60" />
            <Input
              placeholder="Search systems..."
              className="pl-10 pr-3 md:pr-16 h-10 text-sm glass border-primary/20 transition-all duration-300 focus:border-primary/50 focus:shadow-lg focus:shadow-primary/20 placeholder:text-muted-foreground/50"
            />
            <kbd className="hidden md:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary/60 bg-primary/10 rounded border border-primary/20">
              ⌘F
            </kbd>
          </div>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="relative glass border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 h-9 w-9"
          >
            <Bell className="w-4 h-4 text-foreground" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="relative glass border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 h-9 w-9"
          >
            <Moon className="w-4 h-4 text-foreground" />
          </Button>

          <div className="flex items-center gap-3 pl-3 md:pl-4 border-l border-primary/20">
            <Avatar className="w-9 h-9 ring-2 ring-primary/30 transition-all duration-300 hover:ring-primary/60 shadow-lg shadow-primary/20">
              <AvatarImage src="/profile.jpg" alt="Jessin Sam" />
              <AvatarFallback className="text-xs bg-primary/20 text-primary font-mono">JS</AvatarFallback>
            </Avatar>
            <div className="text-xs hidden sm:block">
              <p className="font-semibold text-foreground">Jessin Sam</p>
              <p className="text-primary/60 text-[10px] font-mono">ADMIN</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-1 tracking-tight">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {actions && <div className="flex flex-col sm:flex-row gap-2">{actions}</div>}
      </div>
    </header>
  )
}
