"use client"

import * as React from "react"
import { Pencil, PersonStanding, TriangleAlert } from "lucide-react"

import { eventsOnDate, type IcsEvent } from "@/lib/ics/parseIcs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "cn"

type EventForm = {
  name: string
  location: string
  startDate: string
  startTime: string
  endTime: string
}

function formatTime(time: string) {
  const [hours, minutes] = time.split(":").map(Number)
  const suffix = hours >= 12 ? "PM" : "AM"
  const hour = hours % 12 || 12
  return `${hour}:${String(minutes).padStart(2, "0")} ${suffix}`
}

function eventForm(event: IcsEvent): EventForm {
  return {
    name: event.name,
    location: event.location,
    startDate: event.startDate,
    startTime: event.startTime,
    endTime: event.endTime,
  }
}

function eventMeta(event: IcsEvent) {
  if (event.location) return event.location
  if (event.days.length > 0) return event.days.join(", ")
  return "One-time event"
}

function localDate() {
  const now = new Date()
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-")
}

/** Displays the active calendar and lets users edit each event manually. */
export function ScheduleList({
  scheduleId,
  calendarName,
  className,
}: {
  scheduleId?: string
  calendarName: string
  className?: string
}) {
  const [events, setEvents] = React.useState<IcsEvent[]>([])
  const [loadedScheduleId, setLoadedScheduleId] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [editing, setEditing] = React.useState<IcsEvent | null>(null)
  const [form, setForm] = React.useState<EventForm | null>(null)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    if (!scheduleId) {
      return
    }

    const controller = new AbortController()
    const date = localDate()
    void fetch(`/api/schedules/${encodeURIComponent(scheduleId)}/events?date=${date}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Failed to load schedule.")
        setEvents(result.events ?? [])
        setLoadedScheduleId(scheduleId)
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof DOMException && requestError.name === "AbortError") return
        setError(requestError instanceof Error ? requestError.message : "Failed to load schedule.")
        setLoadedScheduleId(scheduleId)
      })

    return () => controller.abort()
  }, [scheduleId])

  const loading = Boolean(scheduleId) && loadedScheduleId !== scheduleId
  const visibleEvents = scheduleId && !loading ? events : []
  const visibleError = loadedScheduleId === scheduleId ? error : null

  const openEditor = (event: IcsEvent) => {
    setEditing(event)
    setForm(eventForm(event))
    setError(null)
  }

  const saveEvent = async () => {
    if (!scheduleId || !editing || !form) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/schedules/${encodeURIComponent(scheduleId)}/events/${encodeURIComponent(editing.id)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to save event.")
      setEvents((current) => {
        const updated = current.map((event) => (event.id === editing.id ? result.event : event))
        return eventsOnDate(updated, localDate())
      })
      setEditing(null)
      setForm(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save event.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card p-2 sm:p-3",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-2 px-2 py-2">
        <h2 className="text-lg font-bold tracking-tight">Schedule &ndash; {calendarName}</h2>
        <span className="text-xs font-medium text-muted-foreground">
          {visibleEvents.length} {visibleEvents.length === 1 ? "event" : "events"}
        </span>
      </header>

      {visibleError && <p className="px-2 py-2 text-sm text-destructive">{visibleError}</p>}
      {loading && <p className="px-2 py-6 text-center text-sm text-muted-foreground">Loading schedule...</p>}
      {!loading && !scheduleId && (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">Upload a calendar to get started.</p>
      )}
      {!loading && scheduleId && visibleEvents.length === 0 && (
        <p className="px-2 py-6 text-center text-sm text-muted-foreground">No events in this calendar.</p>
      )}

      <ul className="flex flex-col">
        {visibleEvents.map((event) => (
          <li
            key={event.id}
            className="flex items-center gap-3 border-b border-border/60 px-2 py-3 last:border-b-0"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
              {event.location ? <PersonStanding className="size-5" /> : <TriangleAlert className="size-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-semibold">{event.name}</p>
              <p className="truncate text-sm text-muted-foreground">{eventMeta(event)}</p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex flex-col items-end text-right">
                <span className="text-sm font-semibold tabular-nums">{formatTime(event.startTime)}</span>
                <span className="text-xs font-medium text-muted-foreground">
                  {formatTime(event.endTime)}
                </span>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Edit ${event.name}`}
                onClick={() => openEditor(event)}
              >
                <Pencil className="size-4" />
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setEditing(null)
            setForm(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Edit event</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="flex flex-col gap-4">
              {(["name", "location", "startDate", "startTime", "endTime"] as const).map((field) => (
                <div key={field} className="flex flex-col gap-2">
                  <Label htmlFor={`event-${field}`}>
                    {field === "startDate"
                      ? "Date"
                      : field === "startTime"
                        ? "Starts"
                        : field === "endTime"
                          ? "Ends"
                          : field === "location"
                            ? "Location"
                            : "Name"}
                  </Label>
                  <Input
                    id={`event-${field}`}
                    type={field === "startDate" ? "date" : field.includes("Time") ? "time" : "text"}
                    value={form[field]}
                    onChange={(event) => setForm({ ...form, [field]: event.target.value })}
                    className="h-11 rounded-xl"
                  />
                </div>
              ))}
              <Button type="button" onClick={() => void saveEvent()} disabled={saving} className="h-11 rounded-xl">
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
