import * as React from "react"
import { Bus, PersonStanding, TriangleAlert } from "lucide-react"
import { cn } from "cn"

type Kind = "walk" | "bus" | "tight"

const KIND_STYLES: Record<
  Kind,
  { icon: React.ElementType; avatar: string; meta: string }
> = {
  walk: {
    icon: PersonStanding,
    avatar: "bg-muted text-muted-foreground",
    meta: "text-muted-foreground",
  },
  bus: {
    icon: Bus,
    avatar: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    meta: "text-blue-600 dark:text-blue-400",
  },
  tight: {
    icon: TriangleAlert,
    avatar: "bg-destructive/10 text-destructive",
    meta: "text-destructive",
  },
}

const STOPS: {
  time: string
  title: string
  subtitle: string
  meta: string
  kind: Kind
}[] = [
  {
    time: "8:00 AM",
    title: "ILC",
    subtitle: "Integrated Learning Center",
    meta: "8 min walk",
    kind: "walk",
  },
  {
    time: "8:12 AM",
    title: "LGRT",
    subtitle: "Life Sciences Lab",
    meta: "Bus 30 · 12 min",
    kind: "bus",
  },
  {
    time: "8:24 AM",
    title: "Isenberg",
    subtitle: "Isenberg School of Management",
    meta: "Tight connection",
    kind: "tight",
  },
  {
    time: "8:34 AM",
    title: "Worcester Dining Commons",
    subtitle: "Lunch",
    meta: "10 min walk",
    kind: "walk",
  },
]

/** Today's stop-by-stop itinerary for the active calendar. */
export function ScheduleList({
  calendarName,
  className,
}: {
  calendarName: string
  className?: string
}) {
  return (
    <section
      className={cn(
        "flex flex-col rounded-2xl border border-border bg-card p-2 sm:p-3",
        className
      )}
    >
      <header className="flex items-center justify-between gap-2 px-2 py-2">
        <h2 className="text-lg font-bold tracking-tight">
          Today &ndash; {calendarName}
        </h2>
        <span className="text-xs font-medium text-muted-foreground">
          {STOPS.length} stops
        </span>
      </header>

      <ul className="flex flex-col">
        {STOPS.map((stop, i) => {
          const { icon: Icon, avatar, meta } = KIND_STYLES[stop.kind]

          return (
            <li
              key={`${stop.title}-${i}`}
              className="flex items-center gap-3 border-b border-border/60 px-2 py-3 last:border-b-0"
            >
              <span
                className={cn(
                  "flex size-10 shrink-0 items-center justify-center rounded-full",
                  avatar
                )}
              >
                <Icon className="size-5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{stop.title}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {stop.subtitle}
                </p>
              </div>

              <div className="flex shrink-0 flex-col items-end text-right">
                <span className="text-sm font-semibold tabular-nums">
                  {stop.time}
                </span>
                <span className={cn("text-xs font-medium", meta)}>
                  {stop.meta}
                </span>
              </div>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
