"use client"

import { useRef, useState } from "react"
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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("Fall 2026")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const selectFile = () => {
    setError(null)
    fileInputRef.current?.click()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return
    if (!file.name.toLowerCase().endsWith(".ics")) {
      setError("Please choose an .ics calendar file.")
      return
    }

    setSelectedFile(file)
    setName(file.name.replace(/\.ics$/i, "") || "My Calendar")
    setOpen(true)
  }

  const commit = async () => {
    const trimmed = name.trim() || "My Calendar"
    if (!selectedFile) {
      setError("Choose an .ics file before submitting.")
      return
    }

    setIsUploading(true)
    setError(null)

    try {
      const form = new FormData()
      form.append("file", selectedFile)
      form.append("name", trimmed)

      const response = await fetch("/api/schedules/upload", {
        method: "POST",
        body: form,
      })
      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to upload calendar.")
      }

      setName(trimmed)
      setSelectedFile(null)
      setOpen(false)
      onSubmit(result.schedule?.name || trimmed)
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Failed to upload calendar.")
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-center text-2xl font-bold tracking-tight text-balance sm:text-3xl">
        Import your calendar to create routes
      </h1>

      <Button
        type="button"
        variant="outline"
        onClick={selectFile}
        disabled={isUploading}
        className="mx-auto h-12 w-full max-w-[16rem] gap-2 rounded-xl border-border text-base font-semibold text-primary"
      >
        <CalendarArrowUp className="size-5" />
        {isUploading ? "Uploading..." : "Import .ics"}
      </Button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".ics,text/calendar"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Choose an ICS calendar file"
      />

      {error && <p className="text-center text-sm text-destructive">{error}</p>}

      <WeekGrid />

      <Button
        type="button"
        onClick={() => (selectedFile ? setOpen(true) : selectFile())}
        disabled={isUploading}
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
              if (e.key === "Enter") void commit()
            }}
            aria-label="Calendar name"
            className="h-12 rounded-xl text-base"
          />

          <Button
            type="button"
            onClick={() => void commit()}
            disabled={isUploading}
            className="h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90"
          >
            {isUploading ? "Uploading..." : "Submit"}
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
