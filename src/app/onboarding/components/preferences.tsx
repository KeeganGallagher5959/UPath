"use client"

import * as React from "react"
import {
  Accessibility,
  Bike,
  Bus,
  Car,
  PersonStanding,
} from "lucide-react"
import { cn } from "cn"

import { BrandLockup } from "@/components/brand"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"

const TRANSPORT = [
  { value: "walk", label: "Walk", icon: PersonStanding },
  { value: "bus", label: "PVTA Bus", icon: Bus },
  { value: "bike", label: "Bike", icon: Bike },
  { value: "car", label: "Car w/ parking permit", icon: Car },
] as const

const THEMES = [
  { value: "default", label: "Default", swatch: "#ffffff" },
  { value: "mist", label: "Mist", swatch: "#d6e6ea" },
  { value: "sand", label: "Sand", swatch: "#eadfc5" },
  { value: "midnight", label: "Midnight", swatch: "#1f2d3d" },
] as const

type PreferenceKey = "wheelchair" | "alerts" | "contrast"

const PREFERENCES: {
  key: PreferenceKey
  label: string
  icon: React.ElementType
}[] = [
  { key: "wheelchair", label: "Wheelchair-accessible routes", icon: Accessibility },
  { key: "alerts", label: "Leave-for-class alerts", icon: PersonStanding },
  { key: "contrast", label: "High Contrast Mode", icon: Accessibility },
]

/** Step 2 of onboarding — transport mode, theme, and accessibility prefs. */
export function Preferences({ onContinue }: { onContinue: () => void }) {
  const [transport, setTransport] = React.useState<(typeof TRANSPORT)[number]["value"]>("walk")
  const [theme, setTheme] = React.useState<(typeof THEMES)[number]["value"]>("default")
  const [prefs, setPrefs] = React.useState<Record<PreferenceKey, boolean>>({
    wheelchair: true,
    alerts: true,
    contrast: false,
  })

  return (
    <div className="flex flex-col gap-7">
      <BrandLockup markClassName="size-8" />

      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Let&rsquo;s Get to Know You</h1>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Transport</h2>
        <div className="grid grid-cols-2 gap-3">
          {TRANSPORT.map(({ value, label, icon: Icon }) => {
            const selected = transport === value
            return (
              <Button
                key={value}
                type="button"
                variant="outline"
                aria-pressed={selected}
                onClick={() => setTransport(value)}
                className={cn(
                  "h-auto min-h-16 justify-start gap-3 rounded-xl px-4 py-3 text-left text-base font-semibold whitespace-normal",
                  selected
                    ? "border-primary text-primary ring-1 ring-primary hover:bg-primary/5 hover:text-primary"
                    : "text-foreground"
                )}
              >
                <Icon className="size-6 shrink-0" />
                <span className="text-pretty">{label}</span>
              </Button>
            )
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-base font-semibold">Themes</h2>
        <div className="flex gap-4">
          {THEMES.map(({ value, label, swatch }) => {
            const selected = theme === value
            return (
              <button
                key={value}
                type="button"
                aria-label={label}
                aria-pressed={selected}
                onClick={() => setTheme(value)}
                style={{ backgroundColor: swatch }}
                className={cn(
                  "size-14 rounded-xl border border-border shadow-xs transition-all outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
                  selected && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                )}
              />
            )
          })}
        </div>
      </section>

      <section className="flex flex-col">
        {PREFERENCES.map(({ key, label, icon: Icon }, i) => (
          <React.Fragment key={key}>
            {i > 0 && <Separator className="my-1" />}
            <div className="flex items-center justify-between gap-4 py-3">
              <Label
                htmlFor={`pref-${key}`}
                className="gap-3 text-base font-semibold text-foreground"
              >
                <Icon className="size-5 text-muted-foreground" />
                {label}
              </Label>
              <Switch
                id={`pref-${key}`}
                checked={prefs[key]}
                onCheckedChange={(checked: boolean) =>
                  setPrefs((prev) => ({ ...prev, [key]: checked }))
                }
              />
            </div>
          </React.Fragment>
        ))}
      </section>

      <Button
        type="button"
        onClick={onContinue}
        className="h-12 w-full rounded-xl bg-primary text-lg font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Continue
      </Button>
    </div>
  )
}
