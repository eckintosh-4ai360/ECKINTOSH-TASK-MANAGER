"use client"

import { useState } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { InviteCollaboratorsModal } from "@/components/modals/invite-collaborators-modal"

export function InviteButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="h-10 gap-2 text-sm glass border-primary/25 hover:border-primary/50 hover:bg-primary/10 text-foreground transition-all duration-200"
      >
        <UserPlus className="h-4 w-4 text-primary" />
        Invite
      </Button>

      <InviteCollaboratorsModal open={open} onOpenChange={setOpen} />
    </>
  )
}
