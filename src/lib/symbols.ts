export const TAPE = [
  { symbol: "^GSPC", label: "S&P 500" },
  { symbol: "^IXIC", label: "Nasdaq" },
  { symbol: "^DJI", label: "Dow" },
  { symbol: "^RUT", label: "Russell" },
  { symbol: "^VIX", label: "VIX" },
  { symbol: "CL=F", label: "Crude" },
  { symbol: "GC=F", label: "Gold" },
  { symbol: "BTC-USD", label: "Bitcoin" },
] as const

export const TAPE_SYMBOLS: string[] = TAPE.map((item) => item.symbol)

export const DEFAULT_WATCHLIST = [
  "AAPL",
  "MSFT",
  "NVDA",
  "AMZN",
  "GOOGL",
  "META",
  "TSLA",
  "JPM",
  "LLY",
]

export const WATCHLIST_LIMIT = 20
export const STORAGE_KEY = "desk.watchlist.v1"

const SYMBOL = /^[A-Z0-9.^=-]{1,16}$/

export function normalizeSymbol(input: string) {
  return input.trim().toUpperCase()
}

export function isSymbol(input: string) {
  return SYMBOL.test(input)
}

export function uniqueSymbols(symbols: string[]) {
  const seen = new Set<string>()
  const next: string[] = []
  for (const symbol of symbols) {
    const normalized = normalizeSymbol(symbol)
    if (!isSymbol(normalized) || seen.has(normalized)) continue
    seen.add(normalized)
    next.push(normalized)
  }
  return next
}
