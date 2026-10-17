import type { RangeKey, Session } from "@/lib/types"

const ET = "America/New_York"

export function formatPrice(value: number) {
  const abs = Math.abs(value)
  const digits = abs >= 1000 ? 2 : abs >= 1 ? 2 : 4
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits === 4 ? 2 : digits,
    maximumFractionDigits: digits,
  })
}

export function formatSigned(value: number, digits = 2) {
  const body = Math.abs(value).toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })
  if (value > 0) return `+${body}`
  if (value < 0) return `−${body}`
  return body
}

export function formatPercent(value: number) {
  return `${formatSigned(value)}%`
}

export function formatVolume(value: number | null) {
  if (value == null || value <= 0) return "—"
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toLocaleString("en-US")
}

export function toneClass(value: number) {
  if (value > 0.005) return "text-up"
  if (value < -0.005) return "text-down"
  return "text-muted-foreground"
}

export function formatLongDate(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function formatClock(unixSeconds: number) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(new Date(unixSeconds * 1000))
}

export function formatPointTime(unixSeconds: number, range: RangeKey) {
  const date = new Date(unixSeconds * 1000)
  if (range === "1d" || range === "5d") {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: ET,
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(date)
  }
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function isNewYorkWeekend(date = new Date()) {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: ET,
    weekday: "short",
  }).format(date)
  return weekday === "Sat" || weekday === "Sun"
}

export function sessionLabel(session: Session) {
  switch (session) {
    case "open":
      return "Market open"
    case "pre":
      return "Pre-market"
    case "post":
      return "After hours"
    default:
      return "Market closed"
  }
}

export function shortName(name: string) {
  const trimmed = name
    .replace(
      /,?\s+(Inc\.|Incorporated|Corporation|Corp\.|Ltd\.|Limited|PLC|S\.A\.|N\.V\.|Co\.|Company)\.?$/i,
      "",
    )
    .replace(/,/g, "")
    .trim()
  return trimmed.length > 28 ? trimmed.slice(0, 26).trimEnd() + "…" : trimmed
}

export function prosePrice(symbol: string, price: number) {
  if (symbol === "^VIX") return price.toFixed(1)
  if (symbol.startsWith("^")) {
    return price.toLocaleString("en-US", { maximumFractionDigits: 0 })
  }
  if (price >= 1000) {
    return `$${price.toLocaleString("en-US", { maximumFractionDigits: 0 })}`
  }
  return `$${price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

export function prosePercent(value: number) {
  const abs = Math.abs(value)
  const digits = abs >= 10 ? 0 : 1
  return `${abs.toFixed(digits)}%`
}
