"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, CalendarPlus, Clock, Video, MapPin } from "lucide-react"

interface AddEventModalProps {
  children: React.ReactNode
}

export function AddEventModal({ children }: AddEventModalProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    type: "",
    location: "",
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Event created:", formData)
    setOpen(false)
    setFormData({ title: "", description: "", date: "", startTime: "", endTime: "", type: "", location: "" })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-card border-primary/20 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center border border-primary/30">
              <CalendarPlus className="w-5 h-5 text-primary" />
            </div>
            <span>Schedule Event</span>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="event-title" className="text-sm text-muted-foreground">
              Event Title
            </Label>
            <Input
              id="event-title"
              placeholder="Enter event title..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="glass border-border/50 focus:border-primary/50 h-11"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-description" className="text-sm text-muted-foreground">
              Description
            </Label>
            <Textarea
              id="event-description"
              placeholder="Event details..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="glass border-border/50 focus:border-primary/50 min-h-[80px] resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="event-date" className="text-sm text-muted-foreground flex items-center gap-2">
              <CalendarPlus className="w-3.5 h-3.5 text-primary" />
              Date
            </Label>
            <Input
              id="event-date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="glass border-border/50 focus:border-primary/50 h-11"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time" className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-primary" />
                Start Time
              </Label>
              <Input
                id="start-time"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-time" className="text-sm text-muted-foreground">
                End Time
              </Label>
              <Input
                id="end-time"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground flex items-center gap-2">
                <Video className="w-3.5 h-3.5 text-primary" />
                Event Type
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="glass border-border/50 focus:border-primary/50 h-11">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="glass-card border-primary/20">
                  <SelectItem value="meeting">Meeting</SelectItem>
                  <SelectItem value="call">Call</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                  <SelectItem value="workshop">Workshop</SelectItem>
                  <SelectItem value="review">Review</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location" className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                Location
              </Label>
              <Input
                id="location"
                placeholder="Room or link"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="glass border-border/50 focus:border-primary/50 h-11"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1 glass border-border/50 hover:border-primary/30 hover:bg-primary/5"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg shadow-primary/20"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Event
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
