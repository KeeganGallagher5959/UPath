"use client"

import { CloudUpload, EllipsisVertical, Plus, Trash2 } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

/** Horizontal calendar switcher plus the overflow menu for calendar actions. */
export function CalendarTabs({
  calendars,
  active,
  onChange,
  onAdd,
  onDelete,
  className,
}: {
  calendars: string[]
  active: number
  onChange: (index: number) => void
  onAdd: () => void
  onDelete: () => void
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="-mb-1 flex flex-1 items-center gap-2 overflow-x-auto pb-1">
        {calendars.map((name, i) => (
          <button
            key={name}
            type="button"
            onClick={() => onChange(i)}
            aria-pressed={i === active}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              i === active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {name}
          </button>
        ))}

        <button
          type="button"
          onClick={onAdd}
          aria-label="Add calendar"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <Plus className="size-4" />
        </button>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              aria-label="Calendar options"
              className="shrink-0 rounded-full text-muted-foreground"
            />
          }
        >
          <EllipsisVertical className="size-5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          <DropdownMenuItem onClick={onAdd}>
            <CloudUpload className="size-4" />
            Upload calendar
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            disabled={calendars.length <= 1}
            onClick={onDelete}
          >
            <Trash2 className="size-4" />
            Delete calendar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
