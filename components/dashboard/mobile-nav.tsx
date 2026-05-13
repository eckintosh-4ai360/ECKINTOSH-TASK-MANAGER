"use client"

import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Sidebar } from "./sidebar"

export function MobileNav() {
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
      <SheetContent side="left" className="p-0 w-64 glass-card border-r border-primary/20">
        <Sidebar />
      </SheetContent>
    </Sheet>
  )
}
