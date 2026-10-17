"use client"

import { useId, useState } from "react"

import { formatPointTime, formatPrice, formatSigned } from "@/lib/format"
import type { ChartPoint, RangeKey } from "@/lib/types"
import { cn } from "@/lib/utils"

const WIDTH = 640
const HEIGHT = 248
const PAD_X = 8
const PAD_Y = 18

export function PriceChart({
  points,
  reference,
  range,
}: {
  points: ChartPoint[]
  reference: number | null
  range: RangeKey
}) {
  const gradientId = useId().replace(/:/g, "")
  const [hover, setHover] = useState<number | null>(null)

  if (points.length < 2) {
    return (
      <p className="flex h-56 items-center text-sm text-muted-foreground">
        No prints in this range.
      </p>
    )
  }

  const closes = points.map((point) => point.c)
  const last = closes[closes.length - 1]
  const first = closes[0]
  const compare = range === "1d" && reference != null ? reference : first
  const up = last >= compare
  const values = reference != null && range === "1d" ? [...closes, reference] : closes
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || Math.abs(min) * 0.02 || 1
  const lo = min - span * 0.12
  const hi = max + span * 0.12
  const innerWidth = WIDTH - PAD_X * 2
  const innerHeight = HEIGHT - PAD_Y * 2

  const coords = points.map((point, index) => {
    const x = PAD_X + (index / (points.length - 1)) * innerWidth
    const y = PAD_Y + (1 - (point.c - lo) / (hi - lo)) * innerHeight
    return { x, y }
  })
  const line = coords
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(" ")
  const area = `${line} L${coords[coords.length - 1].x.toFixed(2)} ${HEIGHT - PAD_Y} L${coords[0].x.toFixed(2)} ${HEIGHT - PAD_Y} Z`
  const referenceY =
    reference != null && range === "1d"
      ? PAD_Y + (1 - (reference - lo) / (hi - lo)) * innerHeight
      : null
  const active = hover != null ? points[hover] : null
  const rangeChange = ((last - compare) / compare) * 100

  function move(clientX: number, bounds: DOMRect) {
    const ratio = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width))
    const index = Math.round(ratio * (points.length - 1))
    setHover(index)
  }

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 font-mono text-[11px] text-muted-foreground">
        <span>
          {active
            ? formatPointTime(active.t, range)
            : `${range.toUpperCase()} range`}
        </span>
        <span className={cn(up ? "text-up" : "text-down")}>
          {active ? formatPrice(active.c) : `${formatSigned(rangeChange)}%`}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className={cn("h-56 w-full touch-none sm:h-64", up ? "text-up" : "text-down")}
        role="img"
        aria-label="Price chart"
        onPointerLeave={() => setHover(null)}
        onPointerMove={(event) => move(event.clientX, event.currentTarget.getBoundingClientRect())}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.22" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
          </linearGradient>
        </defs>
        {referenceY != null && (
          <line
            x1={PAD_X}
            x2={WIDTH - PAD_X}
            y1={referenceY}
            y2={referenceY}
            stroke="currentColor"
            strokeOpacity="0.35"
            strokeDasharray="3 4"
          />
        )}
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {hover != null && coords[hover] && (
          <g>
            <line
              x1={coords[hover].x}
              x2={coords[hover].x}
              y1={PAD_Y}
              y2={HEIGHT - PAD_Y}
              stroke="currentColor"
              strokeOpacity="0.3"
            />
            <circle cx={coords[hover].x} cy={coords[hover].y} r="3.5" fill="currentColor" />
          </g>
        )}
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[11px] text-muted-foreground">
        <span>{formatPointTime(points[0].t, range)}</span>
        <span>{formatPointTime(points[points.length - 1].t, range)}</span>
      </div>
    </div>
  )
}
