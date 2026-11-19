"use client"

import * as React from "react"
import { useMemo, useState } from "react"
import { addMinutes, format, setDay, startOfDay, startOfWeek } from "date-fns"
import {
  Bus,
  CalendarDays,
  Flag,
  List,
  PersonStanding,
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
  EventCalendarNavToday,
  EventCalendarTitle,
} from "@/components/reui/event-calendar/event-calendar-nav"
import type {
  CalendarEvent,
  EventCalendarOccurrence,
} from "@/components/reui/event-calendar/event-calendar-types"

type ClassData = { location: string; building: string }
type Mode = "list" | "calendar"

const BYDAY = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const

const WALK_FROM_ILC: Record<string, number> = {
  ILC: 0,
  "Morrill Science Center": 3,
  "Worcester Dining Commons": 6,
  LGRT: 8,
  Isenberg: 9,
}

// mock courses
const COURSES: {
  id: string
  name: string
  building: string
  location: string
  days: number[]
  start: number
  minutes: number
  color: string
}[] = [
  { id: "econ", name: "Econ 101", building: "ILC", location: "Integrated Learning Center", days: [1, 4], start: 8 * 60 + 30, minutes: 75, color: "var(--color-violet-500)" },
  { id: "math", name: "Math 132", building: "LGRT", location: "Lederle Graduate Research Tower", days: [2, 4], start: 10 * 60, minutes: 75, color: "var(--color-sky-500)" },
  { id: "bus", name: "Business 101", building: "Isenberg", location: "Isenberg School of Management", days: [1, 5], start: 12 * 60 + 20, minutes: 75, color: "var(--color-amber-500)" },
  { id: "phys", name: "Physics 131", building: "Morrill Science Center", location: "Morrill Science Center", days: [3, 5], start: 8 * 60 + 30, minutes: 75, color: "var(--color-rose-500)" },
  { id: "cs", name: "Comp Sci 121", building: "ILC", location: "Integrated Learning Center", days: [3], start: 13 * 60, minutes: 75, color: "var(--color-emerald-500)" },
  { id: "lunch", name: "Lunch", building: "Worcester Dining Commons", location: "Worcester Dining Commons", days: [1, 2, 3, 4, 5], start: 11 * 60 + 30, minutes: 45, color: "var(--color-slate-500)" },
]

function buildEvents(anchor: Date): CalendarEvent<ClassData>[] {
  const weekStart = startOfWeek(anchor, { weekStartsOn: 0 })

  return COURSES.map((course) => {
    const firstDay = startOfDay(setDay(weekStart, course.days[0]))
    const start = addMinutes(firstDay, course.start)
    return {
      id: course.id,
      title: course.name,
      start,
      end: addMinutes(start, course.minutes),
      color: course.color,
      readOnly: true,
      recurrence: `RRULE:FREQ=WEEKLY;BYDAY=${course.days.map((d) => BYDAY[d]).join(",")}`,
      data: { location: course.location, building: course.building },
    }
  })
}

function renderChip({ occurrence, segment }: EventCalendarRenderEventProps<ClassData>) {
  const building = occurrence.event.data?.building
  const minutes = (segment.endMin ?? 0) - (segment.startMin ?? 0)

  return (
    <span className="flex h-full min-w-0 flex-col gap-0.5">
      <span className="truncate font-semibold">{occurrence.event.title}</span>
      {building && minutes >= 45 && (
        <span className="truncate text-[11px] font-medium text-(--ec-event-color)">
          {building}
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

function DayList() {
  const { date } = useEventCalendarNavigation()
  const { segments } = useEventCalendarDay<ClassData>(date)
  const stops = [...segments.timed]
    .map((segment) => segment.occurrence)
    .sort((a, b) => a.start.getTime() - b.start.getTime())

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
                <span className="truncate">{stop.event.data?.building}</span>
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {stop.event.title} &middot; {stop.event.data?.location}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end text-right">
              <span className="text-sm font-semibold tabular-nums">
                {format(stop.start, "h:mm a")}
              </span>
              <span className={cn("text-xs font-medium", meta)}>{leg.label}</span>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

function StopCount() {
  const { date } = useEventCalendarNavigation()
  const { segments } = useEventCalendarDay(date)
  const count = segments.timed.length
  return (
    <span className="text-xs font-medium text-muted-foreground">
      {count} {count === 1 ? "stop" : "stops"}
    </span>
  )
}

const MODES: { value: Mode; label: string; icon: React.ElementType }[] = [
  { value: "list", label: "List", icon: List },
  { value: "calendar", label: "Calendar", icon: CalendarDays },
]

export function DayCalendar({
  calendarName,
  className,
}: {
  calendarName: string
  className?: string
}) {
  const events = useMemo(() => buildEvents(new Date()), [])
  const [mode, setMode] = useState<Mode>("list")

  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl border border-border bg-card",
        className
      )}
    >
      <EventCalendar
        defaultEvents={events}
        defaultView="day"
        views={["day"]}
        dayStartHour={8}
        dayEndHour={18}
        interactions={{ drag: false, resize: false, selectSlot: false }}
        renderEvent={renderChip}
        className={cn("w-full", mode === "calendar" && "h-[32rem]")}
      >
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
          <EventCalendarNavToday />
          <div className="flex items-center">
            <EventCalendarNavPrev />
            <EventCalendarNavNext />
          </div>
          <EventCalendarTitle className="ms-2" />
          <div className="grow" />
          <EventCalendarDatePicker />
        </div>

        {mode === "calendar" ? <EventCalendarContent /> : <DayList />}
      </EventCalendar>
    </section>
  )
}
