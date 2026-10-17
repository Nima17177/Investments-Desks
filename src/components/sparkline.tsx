import { cn } from "@/lib/utils"

export function Sparkline({
  values,
  change,
}: {
  values: number[]
  change: number
}) {
  if (values.length < 2) {
    return <div className="h-8 w-[4.5rem]" />
  }
  const width = 72
  const height = 32
  const min = Math.min(...values)
  const max = Math.max(...values)
  const span = max - min || 1
  const path = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * (width - 2) + 1
      const y = 2 + (1 - (value - min) / span) * (height - 4)
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`
    })
    .join(" ")
  const tone =
    change > 0.005 ? "text-up" : change < -0.005 ? "text-down" : "text-foreground/50"

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={cn("h-8 w-[4.5rem]", tone)}
      aria-hidden
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  )
}
