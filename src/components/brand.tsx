import { cn } from "cn"

/**
 * UPath brand mark: maroon disc with a white "U" and a torch flame
 * rising through its center. Pure SVG so it scales crisply and follows the
 * active theme via `currentColor`-based utility classes.
 */
export function TransitMark({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label="UPath"
      className={cn("shrink-0", className)}
      {...props}
    >
      <circle cx="32" cy="32" r="32" className="fill-primary" />
      <path
        d="M24 18v14a8 8 0 0 0 16 0V18"
        fill="none"
        strokeWidth={6}
        strokeLinecap="round"
        className="stroke-primary-foreground"
      />
      <path
        d="M32 22c-1.8 3.4-4 5.2-4 8.6a4 4 0 0 0 8 0c0-3.4-2.2-5.2-4-8.6Z"
        className="fill-primary-foreground"
      />
    </svg>
  )
}

/** Mark + "UPath" wordmark lockup used in page headers. */
export function BrandLockup({
  className,
  markClassName,
  textClassName,
}: {
  className?: string
  markClassName?: string
  textClassName?: string
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <TransitMark className={cn("size-9", markClassName)} />
      <span className={cn("text-lg font-bold tracking-tight text-foreground", textClassName)}>
        UPath
      </span>
    </div>
  )
}
