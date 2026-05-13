import { Sidebar } from "@/components/dashboard/sidebar"
import { Header } from "@/components/dashboard/header"
import { CalendarContent } from "@/components/calendar/calendar-content"
import { Button } from "@/components/ui/button"
import { AddEventModal } from "@/components/modals/add-event-modal"

export default function CalendarPage() {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 lg:p-6 lg:ml-64">
        <Header
          title="Schedule Matrix"
          description="Schedule and track your events and meetings."
          actions={
            <AddEventModal>
              <Button className="w-full sm:w-auto h-10 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 border border-primary/50">
                + Schedule Event
              </Button>
            </AddEventModal>
          }
        />

        <div className="mt-6">
          <CalendarContent />
        </div>
      </main>
    </div>
  )
}
