import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { TeamContent } from "@/components/team/team-content"
import { Button } from "@/components/ui/button"
import { AddMemberModal } from "@/components/modals/add-member-modal"

export default function TeamPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Team Network"
          description="Manage your team members and their roles."
          actions={
            <AddMemberModal>
              <Button className="w-full sm:w-auto h-10 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 border border-primary/50">
                + Add Member
              </Button>
            </AddMemberModal>
          }
        />

        <div className="mt-6">
          <TeamContent />
        </div>
      </main>
    </div>
  )
}
