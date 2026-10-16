import { cn } from "cn"

type Stop = {
  label: string
  x: number
  y: number
  /** Anchor for the label, kept clear of the route line. */
  tx: number
  ty: number
  anchor: "start" | "middle" | "end"
  start?: boolean
}

const STOPS: Stop[] = [
  { label: "ILC", x: 70, y: 80, tx: 84, ty: 76, anchor: "start", start: true },
  { label: "Isenberg", x: 95, y: 250, tx: 109, ty: 246, anchor: "start" },
  { label: "Worcester\nDining Commons", x: 250, y: 330, tx: 250, ty: 356, anchor: "middle" },
  { label: "Morrill Science Center", x: 330, y: 190, tx: 318, ty: 186, anchor: "end" },
  { label: "LGRT", x: 300, y: 60, tx: 288, ty: 56, anchor: "end" },
]

const ROUTE = STOPS.map((s) => `${s.x},${s.y}`).join(" ")

/**
 * Stylised campus map with the day's route traced between stops. Rendered as
 * SVG so it scales with its container and follows the theme tokens.
 */
export function RouteMap({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-muted",
        className
      )}
    >
      <svg
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Campus map showing today's route between stops"
        className="h-full w-full"
      >
        {/* Campus blocks */}
        <g className="fill-card">
          <rect x="-16" y="30" width="100" height="72" rx="8" />
          <rect x="248" y="24" width="118" height="84" rx="8" />
          <rect x="150" y="150" width="86" height="62" rx="8" />
          <rect x="268" y="252" width="104" height="70" rx="8" />
          <rect x="30" y="288" width="116" height="130" rx="8" />
          <rect x="330" y="96" width="86" height="70" rx="8" />
          <rect x="-20" y="150" width="86" height="62" rx="8" />
        </g>

        {/* Roads */}
        <g className="stroke-border" strokeWidth="10" strokeLinecap="round">
          <line x1="0" y1="200" x2="400" y2="200" />
          <line x1="212" y1="0" x2="212" y2="400" />
          <line x1="0" y1="110" x2="400" y2="110" />
        </g>

        {/* Route: casing + line */}
        <polyline
          points={ROUTE}
          fill="none"
          className="stroke-card"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points={ROUTE}
          fill="none"
          className="stroke-blue-500 dark:stroke-blue-400"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Stops */}
        <g>
          {STOPS.map((stop) => (
            <circle
              key={stop.label}
              cx={stop.x}
              cy={stop.y}
              r={stop.start ? 11 : 8}
              strokeWidth="4"
              className={cn(
                "fill-card",
                stop.start ? "stroke-primary" : "stroke-foreground/70"
              )}
            />
          ))}
        </g>

        {/* Labels (haloed so the route never crosses the text) */}
        <g
          className="fill-foreground text-[13px] font-semibold"
          stroke="var(--card)"
          strokeWidth="3.5"
          style={{ paintOrder: "stroke" }}
        >
          {STOPS.flatMap((stop) =>
            stop.label.split("\n").map((line, i) => (
              <text
                key={`${stop.label}-${i}`}
                x={stop.tx}
                y={stop.ty + i * 15}
                textAnchor={stop.anchor}
              >
                {line}
              </text>
            ))
          )}
        </g>
      </svg>
    </div>
  )
}
