import { cn } from "cn"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"]

/** Hours rendered, inclusive of the start label (8 AM) through 6 PM. */
const START_HOUR = 8
const END_HOUR = 18
const SPAN = END_HOUR - START_HOUR
const HOURS = Array.from({ length: SPAN + 1 }, (_, i) => START_HOUR + i)

export type CourseEvent = {
  /** 0 = Mon … 4 = Fri */
  day: number
  /** 24h decimal, e.g. 8.5 = 8:30 AM */
  start: number
  end: number
  name: string
  time: string
  location: string
}

export const SAMPLE_EVENTS: CourseEvent[] = [
  { day: 0, start: 8.5, end: 9.75, name: "Econ 101", time: "8:30 – 9:45", location: "ILC" },
  { day: 0, start: 12.33, end: 13.58, name: "Business 101", time: "12:20 – 1:35", location: "ILC" },
  { day: 1, start: 10, end: 11.25, name: "Math 132", time: "10:00 – 11:15", location: "LLC" },
  { day: 2, start: 8.5, end: 9.75, name: "Physics 131", time: "8:30 – 9:45", location: "LLC" },
  { day: 2, start: 13, end: 14.25, name: "Comp Sci 121", time: "1:00 – 2:15", location: "ILC" },
  { day: 3, start: 10, end: 11.25, name: "Math 132", time: "10:00 – 11:15", location: "LLC" },
  { day: 3, start: 15.5, end: 16.75, name: "Econ 101", time: "3:30 – 4:45", location: "ILC" },
  { day: 4, start: 8.5, end: 9.75, name: "Physics 131", time: "8:30 – 9:45", location: "LLC" },
  { day: 4, start: 12.33, end: 13.58, name: "Business 101", time: "12:20 – 1:35", location: "ILC" },
]

function hourLabel(hour: number) {
  if (hour === 12) return "12 PM"
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
}

/**
 * Weekly class schedule grid. Columns are weekdays and class blocks are
 * absolutely positioned by time so half-hour starts line up correctly.
 */
export function WeekGrid({
  events = SAMPLE_EVENTS,
  className,
}: {
  events?: CourseEvent[]
  className?: string
}) {
  const pct = (hours: number) => `${(hours / SPAN) * 100}%`

  return (
    <div className={cn("rounded-2xl border border-border bg-card p-3 sm:p-4", className)}>
      {/* Day header row (offset by the time gutter) */}
      <div className="grid grid-cols-5 pl-11 pb-2">
        {DAYS.map((day) => (
          <div key={day} className="text-center text-xs font-bold text-foreground sm:text-sm">
            {day}
          </div>
        ))}
      </div>

      <div className="relative pl-11">
        <div className="relative h-[22rem] sm:h-[27rem]">
          {/* Hour rules + gutter labels */}
          {HOURS.map((hour) => (
            <div
              key={hour}
              className="absolute inset-x-0 border-t border-border/60"
              style={{ top: pct(hour - START_HOUR) }}
            >
              <span className="absolute right-full mr-2 -translate-y-1/2 text-[10px] font-medium text-muted-foreground sm:text-xs">
                {hourLabel(hour)}
              </span>
            </div>
          ))}

          {/* Day column separators */}
          <div className="absolute inset-0 grid grid-cols-5">
            {DAYS.map((day) => (
              <div key={day} className="border-l border-border/60 first:border-l-0" />
            ))}
          </div>

          {/* Class blocks */}
          {events.map((event, i) => (
            <div
              key={`${event.name}-${i}`}
              className="absolute overflow-hidden rounded-md bg-primary/10 px-1.5 py-1 text-primary ring-1 ring-primary/10 sm:px-2"
              style={{
                top: pct(event.start - START_HOUR),
                height: pct(event.end - event.start),
                left: `calc(${event.day} * 20% + 2px)`,
                width: "calc(20% - 4px)",
              }}
            >
              <p className="truncate text-[10px] leading-tight font-semibold sm:text-xs">
                {event.name}
              </p>
              <p className="truncate text-[9px] leading-tight opacity-80 sm:text-[11px]">
                {event.time}
              </p>
              <p className="truncate text-[9px] leading-tight opacity-80 sm:text-[11px]">
                {event.location}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
