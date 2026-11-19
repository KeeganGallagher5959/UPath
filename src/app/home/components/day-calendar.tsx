"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { format } from "date-fns"
import {
  Bus,
  CalendarDays,
  Flag,
  List,
  Pencil,
  PersonStanding,
  Trash2,
  TriangleAlert,
} from "lucide-react"
import { cn } from "cn"

import {
  EventCalendar,
  useEventCalendarDay,
  useEventCalendarNavigation,
  type EventCalendarRenderEventProps,
} from "@/components/reui/event-calendar/event-calendar"
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content"
import {
  EventCalendarDatePicker,
  EventCalendarNavNext,
  EventCalendarNavPrev,
  EventCalendarTitle,
} from "@/components/reui/event-calendar/event-calendar-nav"
import type {
  CalendarEvent,
  EventCalendarOccurrence,
} from "@/components/reui/event-calendar/event-calendar-types"
import { deduplicateEvents, type IcsEvent, type Weekday } from "@/lib/ics/parseIcs"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type ClassData = { eventId: string; location: string; building: string }
type Mode = "list" | "calendar"

const INITIAL_DATE = new Date("1970-01-01T12:00:00")

const BYDAY: Record<Weekday, string> = {
  Sunday: "SU",
  Monday: "MO",
  Tuesday: "TU",
  Wednesday: "WE",
  Thursday: "TH",
  Friday: "FR",
  Saturday: "SA",
}

const WALK_FROM_ILC: Record<string, number> = {
  ILC: 0,
  "Morrill Science Center": 3,
  "Worcester Dining Commons": 6,
  LGRT: 8,
  Isenberg: 9,
}

const EVENT_COLORS = [
  "var(--color-violet-500)",
  "var(--color-sky-500)",
  "var(--color-amber-500)",
  "var(--color-rose-500)",
  "var(--color-emerald-500)",
]

function makeDate(date: string, time: string) {
  const value = new Date(`${date}T${time}:00`)
  return Number.isNaN(value.getTime()) ? null : value
}

function buildEvents(events: IcsEvent[]): CalendarEvent<ClassData>[] {
  return deduplicateEvents(events).flatMap((event, index) => {
    const start = makeDate(event.startDate, event.startTime)
    if (!start) return []

    const end = makeDate(event.startDate, event.endTime)
    const safeEnd = end && end > start
      ? end
      : new Date(start.getTime() + Math.max(event.durationMinutes, 1) * 60_000)

    const recurrence =
      event.recurrence?.raw ||
      (event.days.length > 0
        ? `RRULE:FREQ=WEEKLY;BYDAY=${event.days.map((day) => BYDAY[day]).join(",")}`
        : undefined)
    const recurrenceRule =
      recurrence && !/^RRULE:/i.test(recurrence)
        ? `RRULE:${recurrence}`
        : recurrence

    return [{
      id: event.id,
      title: event.name,
      start,
      end: safeEnd,
      color: EVENT_COLORS[index % EVENT_COLORS.length],
      readOnly: true,
      recurrence: recurrenceRule,
      data: {
        eventId: event.id,
        location: event.location,
        building: event.location,
      },
    }]
  })
}

type EventForm = {
  name: string
  location: string
  startDate: string
  startTime: string
  endTime: string
}

function localDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-")
}

function localTime(date: Date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function renderChip({ occurrence, segment }: EventCalendarRenderEventProps<ClassData>) {
  const location = occurrence.event.data?.location
  const minutes = (segment.endMin ?? 0) - (segment.startMin ?? 0)

  return (
    <span className="flex h-full min-w-0 flex-col gap-0.5">
      <span className="truncate font-semibold">{occurrence.event.title}</span>
      {location && minutes >= 45 && (
        <span className="truncate text-[11px] font-medium text-(--ec-event-color)">
          {location}
        </span>
      )}
    </span>
  )
}

type Leg = { kind: "walk" | "bus" | "tight" | "same" | "last"; label: string }

const LEG_STYLES: Record<Leg["kind"], { icon: React.ElementType; avatar: string; meta: string }> = {
  walk: { icon: PersonStanding, avatar: "bg-muted text-muted-foreground", meta: "text-muted-foreground" },
  same: { icon: PersonStanding, avatar: "bg-muted text-muted-foreground", meta: "text-muted-foreground" },
  bus: { icon: Bus, avatar: "bg-blue-500/10 text-blue-600 dark:text-blue-400", meta: "text-blue-600 dark:text-blue-400" },
  tight: { icon: TriangleAlert, avatar: "bg-destructive/10 text-destructive", meta: "text-destructive" },
  last: { icon: Flag, avatar: "bg-muted text-muted-foreground", meta: "text-muted-foreground" },
}

function legTo(
  from: EventCalendarOccurrence<ClassData>,
  to: EventCalendarOccurrence<ClassData> | undefined
): Leg {
  if (!to) return { kind: "last", label: "Last stop" }
  const a = from.event.data?.building ?? ""
  const b = to.event.data?.building ?? ""
  if (a === b) return { kind: "same", label: "Same building" }

  const walk = Math.max(3, Math.abs((WALK_FROM_ILC[a] ?? 5) - (WALK_FROM_ILC[b] ?? 5)) + 3)
  const gap = Math.round((to.start.getTime() - from.end.getTime()) / 60_000)
  if (gap < walk + 2) return { kind: "tight", label: `Tight connection · ${walk} min` }
  if (walk >= 10) return { kind: "bus", label: `Bus 30 · ${walk - 4} min` }
  return { kind: "walk", label: `${walk} min walk` }
}

function DayList({
  onEdit,
}: {
  onEdit: (occurrence: EventCalendarOccurrence<ClassData>) => void
}) {
  const { date } = useEventCalendarNavigation()
  const { segments } = useEventCalendarDay<ClassData>(date)
  const stopsByKey = new Map<string, EventCalendarOccurrence<ClassData>>()
  for (const segment of segments.timed) {
    const stop = segment.occurrence
    if (!stopsByKey.has(stop.key)) {
      stopsByKey.set(stop.key, stop)
    }
  }
  const stops = [...stopsByKey.values()].sort(
    (a, b) => a.start.getTime() - b.start.getTime(),
  )

  if (stops.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 border-t border-border px-4 py-12 text-center">
        <p className="text-base font-semibold">No classes</p>
        <p className="text-sm text-muted-foreground">Nothing scheduled for this day.</p>
      </div>
    )
  }

  return (
    <ul className="flex flex-col border-t border-border px-2 sm:px-3">
      {stops.map((stop, i) => {
        const leg = legTo(stop, stops[i + 1])
        const { icon: Icon, avatar, meta } = LEG_STYLES[leg.kind]

        return (
          <li
            key={stop.key}
            className="flex items-center gap-3 border-b border-border/60 px-2 py-3 last:border-b-0"
          >
            <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-full", avatar)}>
              <Icon className="size-5" />
            </span>

            <div className="min-w-0 flex-1">
              <p className="flex items-center gap-2 truncate text-base font-semibold">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: stop.event.color }}
                  aria-hidden
                />
                <span className="truncate">{stop.event.title}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {stop.event.data?.location || "Location not set"}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end text-right">
              <span className="text-sm font-semibold tabular-nums">
                {format(stop.start, "h:mm a")}
              </span>
              <span className={cn("text-xs font-medium", meta)}>{leg.label}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Edit ${stop.event.title}`}
              onClick={() => onEdit(stop)}
            >
              <Pencil className="size-4" />
            </Button>
          </li>
        )
      })}
    </ul>
  )
}

function StopCount() {
  const { date } = useEventCalendarNavigation()
  const { segments } = useEventCalendarDay(date)
  const count = new Set(segments.timed.map((segment) => segment.occurrence.key)).size
  return (
    <span className="text-xs font-medium text-muted-foreground">
      {count} {count === 1 ? "stop" : "stops"}
    </span>
  )
}

function InitializeToday() {
  const { goTo } = useEventCalendarNavigation()

  useEffect(() => {
    goTo(new Date())
  }, [goTo])

  return null
}

const MODES: { value: Mode; label: string; icon: React.ElementType }[] = [
  { value: "list", label: "List", icon: List },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
]

export function DayCalendar({
  scheduleId,
  calendarName,
  className,
}: {
  scheduleId?: string
  calendarName: string
  className?: string
}) {
  const [events, setEvents] = useState<CalendarEvent<ClassData>[]>([])
  const [mode, setMode] = useState<Mode>("list")
  const [editing, setEditing] = useState<EventCalendarOccurrence<ClassData> | null>(null)
  const [form, setForm] = useState<EventForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadEvents = async () => {
    if (!scheduleId) return
    const response = await fetch(`/api/schedules/${encodeURIComponent(scheduleId)}/events`)
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || "Failed to load schedule.")
    setEvents(buildEvents(result.events ?? []))
  }

  useEffect(() => {
    if (!scheduleId) {
      return
    }

    const controller = new AbortController()
    void fetch(`/api/schedules/${encodeURIComponent(scheduleId)}/events`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const result = await response.json()
        if (!response.ok) throw new Error(result.error || "Failed to load schedule.")
        setEvents(buildEvents(result.events ?? []))
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        setEvents([])
      })

    return () => controller.abort()
  }, [scheduleId])

  const openEditor = (occurrence: EventCalendarOccurrence<ClassData>) => {
    setEditing(occurrence)
    setForm({
      name: occurrence.event.title,
      location: occurrence.event.data?.location ?? "",
      startDate: localDate(occurrence.start),
      startTime: localTime(occurrence.start),
      endTime: localTime(occurrence.end),
    })
    setError(null)
  }

  const saveEvent = async () => {
    if (!scheduleId || !editing || !form) return
    const eventId = editing.event.data?.eventId
    if (!eventId) return

    setSaving(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/schedules/${encodeURIComponent(scheduleId)}/events/${encodeURIComponent(eventId)}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: form.name,
            location: form.location.trim() ? form.location.trim() : null,
            startDate: form.startDate,
            startTime: form.startTime,
            endTime: form.endTime,
          }),
        },
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to save event.")
      await loadEvents()
      setEditing(null)
      setForm(null)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Failed to save event.")
    } finally {
      setSaving(false)
    }
  }

  const deleteEvent = async () => {
    if (!scheduleId || !editing) return
    const eventId = editing.event.data?.eventId
    if (!eventId) return

    setSaving(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/schedules/${encodeURIComponent(scheduleId)}/events/${encodeURIComponent(eventId)}`,
        { method: "DELETE" },
      )
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to delete event.")
      await loadEvents()
      setEditing(null)
      setForm(null)
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to delete event.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        className
      )}
    >
      <EventCalendar
        events={events}
        defaultDate={INITIAL_DATE}
        defaultView="day"
        views={["day"]}
        dayStartHour={8}
        dayEndHour={18}
        interactions={{ drag: false, resize: false, selectSlot: false }}
        renderEvent={renderChip}
        className={cn("w-full", mode === "calendar" && "h-[32rem]")}
      >
        <InitializeToday />
        <header className="flex items-center justify-between gap-2 px-4 pt-3">
          <div className="flex min-w-0 items-baseline gap-2">
            <h2 className="truncate text-lg font-bold tracking-tight">{calendarName}</h2>
            <StopCount />
          </div>

          <div
            role="radiogroup"
            aria-label="Schedule view"
            className="flex shrink-0 items-center gap-0.5 rounded-full bg-muted p-0.5"
          >
            {MODES.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={mode === value}
                onClick={() => setMode(value)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  mode === value
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
        </header>

        <div className="flex flex-wrap items-center gap-1 px-2 py-2">
          <div className="flex items-center">
            <EventCalendarNavPrev />
            <EventCalendarNavNext />
          </div>
          <EventCalendarTitle className="ms-2" />
          <div className="grow" />
          <EventCalendarDatePicker />
        </div>

        {mode === "calendar" ? <EventCalendarContent /> : <DayList onEdit={openEditor} />}
      </EventCalendar>

      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setEditing(null)
            setForm(null)
            setError(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit event</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-event-name">Name</Label>
                <Input
                  id="edit-event-name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-event-location">Location</Label>
                <Input
                  id="edit-event-location"
                  value={form.location}
                  onChange={(event) => setForm({ ...form, location: event.target.value })}
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="edit-event-date">Date</Label>
                <Input
                  id="edit-event-date"
                  type="date"
                  value={form.startDate}
                  onChange={(event) => setForm({ ...form, startDate: event.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-event-start">Starts</Label>
                  <Input
                    id="edit-event-start"
                    type="time"
                    value={form.startTime}
                    onChange={(event) => setForm({ ...form, startTime: event.target.value })}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="edit-event-end">Ends</Label>
                  <Input
                    id="edit-event-end"
                    type="time"
                    value={form.endTime}
                    onChange={(event) => setForm({ ...form, endTime: event.target.value })}
                  />
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="destructive"
                  className="gap-2"
                  onClick={() => void deleteEvent()}
                  disabled={saving}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
                <Button
                  type="button"
                  className="flex-1"
                  onClick={() => void saveEvent()}
                  disabled={saving || !form.name.trim()}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  )
}
