"use client"

import { useState } from "react"
import { CalendarArrowUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { WeekGrid } from "./week-grid"

/**
 * Step 1 of onboarding — import a `.ics` calendar, preview the generated week,
 * then name and submit it.
 */
export function CalendarImport({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("Fall 2026")

  const commit = () => {
    const trimmed = name.trim() || "My Calendar"
    setName(trimmed)
    setOpen(false)
    onSubmit(trimmed)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-2xl font-bold tracking-tight text-balance sm:text-3xl">
        Import your calendar to create routes
      </h1>

      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className="mx-auto h-12 w-full max-w-[16rem] gap-2 rounded-xl border-border text-base font-semibold text-primary"
      >
        <CalendarArrowUp className="size-5" />
        Import .ics
      </Button>

      <WeekGrid />

      <Button
        type="button"
        onClick={() => (name.trim() ? onSubmit(name.trim()) : setOpen(true))}
        className="h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Submit
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-5">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Name Your Calendar</DialogTitle>
          </DialogHeader>

          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit()
            }}
            aria-label="Calendar name"
            className="h-12 rounded-xl text-base"
          />

          <Button
            type="button"
            onClick={commit}
            className="h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Submit
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
