"use client"

import * as React from "react"
import { Eye, EyeOff, Lock } from "lucide-react"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const leadingIconClass =
  "pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-muted-foreground"

/** Text input with a leading decorative icon (e.g. mail, lock). */
export function IconInput({
  icon: Icon,
  className,
  ...props
}: React.ComponentProps<typeof Input> & { icon: React.ElementType }) {
  return (
    <div className="relative">
      <Icon aria-hidden className={leadingIconClass} />
      <Input className={cn("h-12 rounded-xl pl-11 text-base", className)} {...props} />
    </div>
  )
}

/** Password input with a leading lock icon and a show/hide toggle. */
export function PasswordInput({
  className,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="relative">
      <Lock aria-hidden className={leadingIconClass} />
      <Input
        type={visible ? "text" : "password"}
        className={cn("h-12 rounded-xl pr-11 pl-11 text-base", className)}
        {...props}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute top-1/2 right-1.5 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
      >
        {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
      </Button>
    </div>
  )
}
