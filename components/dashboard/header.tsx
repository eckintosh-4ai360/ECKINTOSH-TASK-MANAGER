"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, Bell, Moon, Sun, LogOut, User, Settings, ShieldCheck, ChevronDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MobileNav } from "./mobile-nav"
import { useSearch } from "./search-context"
import { useTheme } from "@/components/theme-provider"
import { cn } from "@/lib/utils"
import type { ReactNode } from "react"

interface HeaderProps {
  title: string
  description: string
  actions?: ReactNode
  user?: {
    id: string
    name: string
    email: string
    role: string
  }
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  USER: "text-primary bg-primary/10 border-primary/30",
  GUEST: "text-muted-foreground bg-muted border-border",
}

export function Header({ title, description, actions, user }: HeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const { query, setQuery, isSearching } = useSearch()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const activeTheme = mounted ? resolvedTheme ?? theme : "dark"
  const isDarkMode = activeTheme === "dark"

  // ⌘F / Ctrl+F keyboard shortcut to focus the search bar
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === "Escape" && isSearching) {
        setQuery("")
        searchInputRef.current?.blur()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isSearching, setQuery])

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const initials = user?.name
    ? user.name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : user?.email?.[0]?.toUpperCase() ?? "U"

  const displayName = user?.name ?? user?.email ?? "User"
  const role = user?.role ?? "USER"
  const roleStyle = ROLE_COLORS[role] ?? ROLE_COLORS.USER

  return (
    <header className="space-y-4 md:space-y-5 animate-slide-in-up">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Mobile nav + Search */}
        <div className="flex items-center gap-3 flex-1">
          <MobileNav />
          <div className="relative flex-1 max-w-md">
            <Search className={cn(
              "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors duration-200",
              isSearching ? "text-primary" : "text-primary/60"
            )} />
            <Input
              ref={searchInputRef}
              placeholder="Search projects, sprints, team…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className={cn(
                "pl-10 h-10 text-sm glass transition-all duration-300 placeholder:text-muted-foreground/50",
                isSearching
                  ? "pr-9 border-primary/50 shadow-lg shadow-primary/20 bg-primary/5"
                  : "pr-3 md:pr-16 border-primary/20 focus:border-primary/50 focus:shadow-lg focus:shadow-primary/20"
              )}
            />
            {isSearching ? (
              <button
                onClick={() => { setQuery(""); searchInputRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary/20 hover:bg-primary/30 flex items-center justify-center transition-all duration-200"
              >
                <X className="w-3 h-3 text-primary" />
              </button>
            ) : (
              <kbd className="hidden md:inline-block absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 text-[10px] font-mono font-semibold text-primary/60 bg-primary/10 rounded border border-primary/20">
                ⌘F
              </kbd>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Notification bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative glass border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 h-9 w-9"
          >
            <Bell className="w-4 h-4 text-foreground" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full animate-pulse shadow-lg shadow-primary/50" />
          </Button>

          {/* Dark/light toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(isDarkMode ? "light" : "dark")}
            className="glass border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 h-9 w-9"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Moon className="w-4 h-4 text-foreground" /> : <Sun className="w-4 h-4 text-foreground" />}
          </Button>

          {/* ── Profile dropdown ─────────────────────────────────────── */}
          <div className="pl-3 md:pl-4 border-l border-primary/20" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5 transition-all duration-200",
                "hover:bg-primary/10 border border-transparent hover:border-primary/20",
                dropdownOpen && "bg-primary/10 border-primary/20"
              )}
            >
              {/* Avatar */}
              <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-sm font-bold text-primary-foreground shadow-lg shadow-primary/30 ring-2 ring-primary/20 flex-shrink-0">
                {initials}
                {/* Online dot */}
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-background" />
              </div>

              <div className="text-left hidden sm:block">
                <p className="text-xs font-semibold text-foreground leading-none mb-1">{displayName}</p>
                <span className={cn("text-[9px] font-bold font-mono px-1.5 py-0.5 rounded-full border", roleStyle)}>
                  {role}
                </span>
              </div>

              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 hidden sm:block", dropdownOpen && "rotate-180")} />
            </button>

            {/* Dropdown panel */}
            {dropdownOpen && (
              <div className="absolute right-4 mt-2 w-64 z-50 rounded-2xl border border-primary/20 shadow-2xl shadow-black/40 overflow-hidden"
                style={{ background: "color-mix(in oklab, var(--card) 96%, transparent)" }}
              >
                {/* User info block */}
                <div className="px-4 py-4 border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/40 flex items-center justify-center text-base font-bold text-primary-foreground shadow-lg shadow-primary/30 flex-shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{displayName}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                      <span className={cn("text-[9px] font-bold font-mono mt-1 inline-block px-1.5 py-0.5 rounded-full border", roleStyle)}>
                        {role}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Menu items */}
                <div className="py-2">
                  {[
                    { icon: User, label: "My Profile", href: "/profile", desc: "View and edit profile" },
                    { icon: Settings, label: "Settings", href: "/settings", desc: "App preferences" },
                    ...(role === "ADMIN" ? [{ icon: ShieldCheck, label: "Admin Panel", href: "/admin/users", desc: "Manage users" }] : []),
                  ].map(({ icon: Icon, label, href, desc }) => (
                    <button
                      key={label}
                      onClick={() => { setDropdownOpen(false); router.push(href) }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-[11px] text-muted-foreground">{desc}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Divider + Logout */}
                <div className="border-t border-white/5 py-2">
                  <a
                    href="/logout"
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-500/10 transition-colors text-left group"
                    onClick={() => setDropdownOpen(false)}
                  >
                    <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-red-500/20 transition-colors">
                      <LogOut className="w-4 h-4 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-red-400">Sign Out</p>
                      <p className="text-[11px] text-muted-foreground">End your session</p>
                    </div>
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Page title + description */}
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
