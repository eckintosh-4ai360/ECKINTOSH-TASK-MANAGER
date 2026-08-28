"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"
import type { AppRole } from "@/lib/rbac"

export function MobileNav({ role }: { role: AppRole }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden glass border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 h-9 w-9"
        >
          <Menu className="w-5 h-5 text-foreground" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>
      {/* Opaque, and gap-0 so the sheet's default gap can't push the sidebar
          down now that it is the only child. */}
      <SheetContent
        side="left"
        className="p-0 gap-0 w-64 max-w-[85vw] bg-sidebar border-r border-primary/20"
      >
        {/* Radix requires an accessible title on every dialog; the drawer is
            branded visually by the sidebar's own logo, so hide this one. */}
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <Sidebar role={role} />
      </SheetContent>
    </Sheet>
  )
}
