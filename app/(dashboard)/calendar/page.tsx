import { HeaderWithUser as Header } from "@/components/dashboard/header-with-user"
import { CalendarContent } from "@/components/calendar/calendar-content"
import { Button } from "@/components/ui/button"
import { AddEventModal } from "@/components/modals/add-event-modal"
import { getCalendarEvents } from "@/lib/actions/calendar-actions"
import { requireSession } from "@/lib/auth"
import { hasPermission } from "@/lib/rbac"

export default async function CalendarPage() {
  const session = await requireSession()
  const canManageCalendar = hasPermission(session.role, "manage_calendar")
  const events = await getCalendarEvents()

  return (
    <>
      <Header
        title="Schedule Matrix"
        description="Schedule and track your events and meetings."
        actions={canManageCalendar ? (
          <AddEventModal>
            <Button className="w-full sm:w-auto h-10 text-sm bg-gradient-to-r from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 transition-all duration-300 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:scale-105 border border-primary/50">
              + Schedule Event
            </Button>
          </AddEventModal>
        ) : undefined}
      />

      <div className="mt-6">
        <CalendarContent events={events} canManageCalendar={canManageCalendar} />
      </div>
    </>
  )
}
