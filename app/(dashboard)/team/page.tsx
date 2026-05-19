import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { TeamContent, TeamMember } from "@/components/team/team-content"
import { Button } from "@/components/ui/button"
import { AddMemberModal } from "@/components/modals/add-member-modal"
import { requireSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"
import prisma from "@/lib/prisma"

export default async function TeamPage() {
  const session = await requireSession()
  const canManageTeam = hasPermission(session.role, "manage_team")

  const users = await prisma.user.findMany({
    include: {
      tasks: true,
    },
    orderBy: {
      name: 'asc'
    }
  })

  const teamMembers: TeamMember[] = users.map((user) => {
    const totalTasks = user.tasks.length
    const completedTasks = user.tasks.filter((t) => t.status === "DONE").length
    const name = user.name || "Unknown User"
    
    // Calculate initials
    const nameParts = name.split(" ")
    const initials = nameParts.length > 1 
      ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
      : name.substring(0, 2).toUpperCase()

    return {
      name,
      role: user.title || user.role || "Member",
      email: user.email,
      status: "active", // You could add actual presence status if available
      tasks: totalTasks,
      completed: completedTasks,
      avatar: user.avatar,
      initials,
    }
  })

  return (
    <>
      <Header
        title="Team Network"
        description="Manage your team members and their roles."
        actions={canManageTeam ? (
          <AddMemberModal>
            <Button className="w-full sm:w-auto h-10 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 border border-primary/50">
              + Add Member
            </Button>
          </AddMemberModal>
        ) : undefined}
      />

      <div className="mt-6">
        <TeamContent teamMembers={teamMembers} />
      </div>
    </>
  )
}
