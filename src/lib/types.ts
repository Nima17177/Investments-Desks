export const RANGES = {
  "1d": { label: "1D", interval: "5m", yahooRange: "1d" },
  "5d": { label: "5D", interval: "15m", yahooRange: "5d" },
  "1mo": { label: "1M", interval: "1d", yahooRange: "1mo" },
  "6mo": { label: "6M", interval: "1d", yahooRange: "6mo" },
  "1y": { label: "1Y", interval: "1d", yahooRange: "1y" },
} as const

export type RangeKey = keyof typeof RANGES

export type Session = "pre" | "open" | "post" | "closed"

export type Quote = {
  symbol: string
  name: string
  kind: string
  currency: string
  exchange: string
  price: number
  previousClose: number
  change: number
  changePercent: number
  dayHigh: number | null
  dayLow: number | null
  yearHigh: number | null
  yearLow: number | null
  volume: number | null
  marketTime: number
  session: Session
  sparkline: number[]
}

export type QuoteError = {
  symbol: string
  message: string
}

export type QuotesPayload = {
  quotes: Quote[]
  errors: QuoteError[]
}

export type ChartPoint = {
  t: number
  c: number
}

export type ChartPayload = {
  symbol: string
  range: RangeKey
  points: ChartPoint[]
  reference: number | null
}

export type SearchHit = {
  symbol: string
  name: string
  type: string
  exchange: string
}
