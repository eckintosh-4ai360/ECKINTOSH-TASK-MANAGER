"use client"

import { useMemo, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { CalendarClock, ChevronLeft, ChevronRight, Clock, MapPin, Video } from "lucide-react"
import type { CalendarEventItem } from "@/lib/actions/calendar-actions"

const weekDays = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(value)
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit" }).format(new Date(value))
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { weekday: "short", month: "short", day: "numeric" }).format(new Date(value))
}

function formatDuration(start: string, end: string) {
  const minutes = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000))
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`
}

function getMonthDays(monthDate: Date) {
  const year = monthDate.getFullYear()
  const month = monthDate.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const firstDay = new Date(year, month, 1).getDay()

  return [
    ...Array.from({ length: firstDay }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => new Date(year, month, index + 1)),
  ]
}

function EventCard({ event, compact = false }: { event: CalendarEventItem; compact?: boolean }) {
  const color = event.color ?? "#00d4ff"

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all duration-300 hover:shadow-md hover:scale-[1.01]",
        compact ? "bg-background/45" : "bg-background/35",
      )}
      style={{
        borderColor: `${color}55`,
        backgroundImage: `linear-gradient(90deg, ${color}24, transparent)`,
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="mt-1 h-2.5 w-2.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: color, boxShadow: `0 0 10px ${color}66` }}
        />
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-start gap-2">
            <h4 className="font-medium text-sm text-foreground truncate">{event.title}</h4>
            <Badge variant="secondary" className="ml-auto text-[9px] capitalize glass border-border/30 font-mono">
              {event.type}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground font-mono">
            {compact ? formatDate(event.startTime) : formatTime(event.startTime)} - {formatTime(event.endTime)}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="text-[10px] glass border-border/30 font-mono">
              {formatDuration(event.startTime, event.endTime)}
            </Badge>
            {event.location && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <MapPin className="w-3 h-3" />
                {event.location}
              </span>
            )}
            {["meeting", "call", "review"].includes(event.type) && (
              <span className="flex items-center gap-1 text-[10px] text-primary">
                <Video className="w-3 h-3" />
                VIDEO
              </span>
            )}
          </div>
          {event.description && !compact && (
            <p className="text-xs text-muted-foreground line-clamp-2">{event.description}</p>
          )}
        </div>
      </div>
    </div>
  )
}

export function CalendarContent({ events }: { events: CalendarEventItem[] }) {
  const today = new Date()
  const [monthDate, setMonthDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)

  const monthDays = useMemo(() => getMonthDays(monthDate), [monthDate])
  const selectedEvents = events.filter((event) => sameDay(new Date(event.startTime), selectedDate))
  const upcomingEvents = events
    .filter((event) => new Date(event.startTime) >= new Date(today.getFullYear(), today.getMonth(), today.getDate()))
    .slice(0, 6)

  function moveMonth(offset: number) {
    setMonthDate((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => moveMonth(-1)}
            className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="font-semibold min-w-[160px] text-center text-foreground font-mono">{formatMonth(monthDate)}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => moveMonth(1)}
            className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => {
            const nextToday = new Date()
            setSelectedDate(nextToday)
            setMonthDate(new Date(nextToday.getFullYear(), nextToday.getMonth(), 1))
          }}
          className="glass border-primary/20 hover:border-primary/40 hover:bg-primary/5"
        >
          Today
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card rounded-xl p-6">
          <div className="grid grid-cols-7 gap-2 mb-4">
            {weekDays.map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-primary/60 py-2 font-mono tracking-wider">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {monthDays.map((day, index) => {
              if (!day) return <div key={`empty-${index}`} className="aspect-square" />

              const dayEvents = events.filter((event) => sameDay(new Date(event.startTime), day))
              const selected = sameDay(day, selectedDate)
              const isCurrentDay = sameDay(day, today)

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSelectedDate(day)}
                  className={cn(
                    "aspect-square rounded-lg flex flex-col items-center justify-center gap-1 text-sm font-medium font-mono transition-all duration-300 border",
                    selected
                      ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/30 border-primary/50"
                      : "glass hover:bg-primary/10 hover:border-primary/30 text-foreground border-transparent",
                    !selected && isCurrentDay && "border-primary/40",
                  )}
                >
                  <span>{day.getDate()}</span>
                  {dayEvents.length > 0 && (
                    <span className={cn("h-1.5 min-w-1.5 rounded-full", selected ? "bg-primary-foreground" : "bg-primary")} />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <div className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">Selected Schedule</h3>
              <p className="text-xs text-muted-foreground">{formatDate(selectedDate.toISOString())}</p>
            </div>
          </div>
          <div className="space-y-3">
            {selectedEvents.length === 0 && (
              <div className="rounded-xl border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
                No events scheduled for this date.
              </div>
            )}
            {selectedEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
            <CalendarClock className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-foreground">Scheduled Upcoming Events</h3>
            <p className="text-xs text-muted-foreground">The next meetings and calendar blocks from the database.</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {upcomingEvents.length === 0 && (
            <div className="md:col-span-2 xl:col-span-3 rounded-xl border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
              No upcoming events yet.
            </div>
          )}
          {upcomingEvents.map((event) => (
            <EventCard key={event.id} event={event} compact />
          ))}
        </div>
      </div>
    </div>
  )
}
