import { isSymbol, normalizeSymbol } from "@/lib/symbols"
import type {
  ChartPayload,
  ChartPoint,
  Quote,
  QuoteError,
  QuotesPayload,
  RangeKey,
  SearchHit,
  Session,
} from "@/lib/types"
import { RANGES } from "@/lib/types"

const UA = "Mozilla/5.0 (compatible; Desk/1.0; +https://localhost)"

type YahooPeriod = { start: number; end: number }

type YahooChart = {
  meta: {
    symbol?: string
    longName?: string
    shortName?: string
    currency?: string
    fullExchangeName?: string
    exchangeName?: string
    instrumentType?: string
    regularMarketPrice?: number
    chartPreviousClose?: number
    regularMarketDayHigh?: number
    regularMarketDayLow?: number
    fiftyTwoWeekHigh?: number
    fiftyTwoWeekLow?: number
    regularMarketVolume?: number
    regularMarketTime?: number
    currentTradingPeriod?: {
      pre?: YahooPeriod
      regular?: YahooPeriod
      post?: YahooPeriod
    }
  }
  timestamp?: number[]
  indicators?: {
    quote?: Array<{ close?: Array<number | null> }>
  }
}

type YahooSearchQuote = {
  symbol?: string
  shortname?: string
  longname?: string
  quoteType?: string
  exchDisp?: string
  typeDisp?: string
}

function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function sessionAt(meta: YahooChart["meta"], nowSeconds: number): Session {
  const periods = meta.currentTradingPeriod
  const regular = periods?.regular
  if (!regular) return "closed"
  if (nowSeconds >= regular.start && nowSeconds < regular.end) return "open"
  const pre = periods?.pre
  if (pre && nowSeconds >= pre.start && nowSeconds < regular.start) return "pre"
  const post = periods?.post
  if (post && nowSeconds >= regular.end && nowSeconds < post.end) return "post"
  return "closed"
}

function kindLabel(instrumentType: string | undefined) {
  switch (instrumentType) {
    case "EQUITY":
      return "Equity"
    case "ETF":
      return "ETF"
    case "INDEX":
      return "Index"
    case "CRYPTOCURRENCY":
      return "Crypto"
    case "FUTURE":
      return "Future"
    case "CURRENCY":
      return "Currency"
    case "MUTUALFUND":
      return "Fund"
    default:
      return instrumentType
        ? instrumentType.charAt(0) + instrumentType.slice(1).toLowerCase()
        : "Listing"
  }
}

function pairs(chart: YahooChart): ChartPoint[] {
  const times = chart.timestamp ?? []
  const closes = chart.indicators?.quote?.[0]?.close ?? []
  const points: ChartPoint[] = []
  for (let index = 0; index < times.length; index += 1) {
    const close = finite(closes[index])
    const time = finite(times[index])
    if (close == null || time == null) continue
    points.push({ t: time, c: close })
  }
  return points
}

function messageFor(symbol: string, error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (/no data|delisted|not found|invalid|no listing/i.test(message)) {
    return `No listing found for ${symbol}.`
  }
  if (/failed \((429|5\d\d)\)/.test(message)) {
    return "The quote service is busy. Try again in a moment."
  }
  return "The quote did not come through."
}

async function readChart(symbol: string, range: string, interval: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${range}&interval=${interval}&includePrePost=false`
  const response = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": UA },
  })
  if (!response.ok) {
    throw new Error(`Quote request failed (${response.status})`)
  }
  const payload = (await response.json()) as {
    chart?: { result?: YahooChart[] | null; error?: { description?: string } }
  }
  const chart = payload.chart?.result?.[0]
  if (!chart) {
    throw new Error(payload.chart?.error?.description || "No listing found")
  }
  return chart
}

function toQuote(chart: YahooChart): Quote {
  const points = pairs(chart)
  const meta = chart.meta
  const price =
    finite(meta.regularMarketPrice) ?? points[points.length - 1]?.c ?? null
  if (price == null) throw new Error("No listing found")
  const previousClose =
    points.length >= 2
      ? points[points.length - 2].c
      : (finite(meta.chartPreviousClose) ?? price)
  if (previousClose === 0) throw new Error("No listing found")
  const sparkline = points.slice(-22).map((point) => point.c)
  if (sparkline.length > 0) sparkline[sparkline.length - 1] = price
  const change = price - previousClose
  return {
    symbol: meta.symbol || "",
    name: (meta.longName || meta.shortName || meta.symbol || "").trim(),
    kind: kindLabel(meta.instrumentType),
    currency: meta.currency || "USD",
    exchange: meta.fullExchangeName || meta.exchangeName || "",
    price,
    previousClose,
    change,
    changePercent: (change / previousClose) * 100,
    dayHigh: finite(meta.regularMarketDayHigh),
    dayLow: finite(meta.regularMarketDayLow),
    yearHigh: finite(meta.fiftyTwoWeekHigh),
    yearLow: finite(meta.fiftyTwoWeekLow),
    volume: finite(meta.regularMarketVolume),
    marketTime: finite(meta.regularMarketTime) ?? Math.floor(Date.now() / 1000),
    session: sessionAt(meta, Date.now() / 1000),
    sparkline,
  }
}

const memory = new Map<string, { expires: number; value: unknown }>()

async function remember<T>(key: string, ttlMs: number, load: () => Promise<T>) {
  const hit = memory.get(key)
  if (hit && hit.expires > Date.now()) return hit.value as T
  const value = await load()
  memory.set(key, { value, expires: Date.now() + ttlMs })
  return value
}

export async function getQuote(symbol: string): Promise<Quote> {
  const normalized = normalizeSymbol(symbol)
  if (!isSymbol(normalized)) throw new Error("No listing found")
  return remember(`quote:${normalized}`, 20_000, async () => {
    const quote = toQuote(await readChart(normalized, "1mo", "1d"))
    return { ...quote, symbol: normalized }
  })
}

export async function getChart(
  symbol: string,
  range: RangeKey,
): Promise<ChartPayload> {
  const normalized = normalizeSymbol(symbol)
  if (!isSymbol(normalized)) throw new Error("No listing found")
  return remember(`chart:${normalized}:${range}`, 20_000, async () => {
    const spec = RANGES[range]
    const chart = await readChart(normalized, spec.yahooRange, spec.interval)
    const points = pairs(chart)
    const price = finite(chart.meta.regularMarketPrice)
    if (price != null && points.length > 0 && range === "1d") {
      points[points.length - 1] = { ...points[points.length - 1], c: price }
    }
    return {
      symbol: normalized,
      range,
      points,
      reference: range === "1d" ? finite(chart.meta.chartPreviousClose) : null,
    }
  })
}

const TYPE_RANK: Record<string, number> = {
  EQUITY: 0,
  ETF: 1,
  INDEX: 2,
  CRYPTOCURRENCY: 3,
  CURRENCY: 4,
  MUTUALFUND: 5,
  FUTURE: 6,
}

function searchHits(quotes: YahooSearchQuote[], query: string): SearchHit[] {
  const needle = query.trim().toUpperCase()
  return quotes
    .filter((quote) => {
      if (!quote.symbol || !isSymbol(normalizeSymbol(quote.symbol))) return false
      const type = quote.quoteType ?? ""
      if (type === "FUTURE") {
        const name = `${quote.shortname ?? ""} ${quote.longname ?? ""}`
        const exact = quote.symbol.toUpperCase() === needle
        return exact || !/stock futures/i.test(name)
      }
      return type in TYPE_RANK
    })
    .sort((a, b) => {
      const aExact = a.symbol?.toUpperCase() === needle ? 0 : 1
      const bExact = b.symbol?.toUpperCase() === needle ? 0 : 1
      if (aExact !== bExact) return aExact - bExact
      return (TYPE_RANK[a.quoteType ?? ""] ?? 9) - (TYPE_RANK[b.quoteType ?? ""] ?? 9)
    })
    .slice(0, 6)
    .map((quote) => ({
      symbol: quote.symbol ?? "",
      name: (quote.longname || quote.shortname || quote.symbol || "").trim(),
      type: quote.typeDisp || kindLabel(quote.quoteType),
      exchange: quote.exchDisp || "",
    }))
}

export async function searchSymbols(query: string): Promise<SearchHit[]> {
  const trimmed = query.trim()
  if (trimmed.length < 1) return []
  return remember(`search:${trimmed.toLowerCase()}`, 60_000, async () => {
    const url = `https://query2.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(trimmed.slice(0, 40))}&quotesCount=10&newsCount=0`
    const response = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": UA },
    })
    if (!response.ok) throw new Error("Search failed")
    const payload = (await response.json()) as { quotes?: YahooSearchQuote[] }
    return searchHits(payload.quotes ?? [], trimmed)
  })
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
) {
  const results = new Array<R>(items.length)
  let cursor = 0
  async function worker() {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= items.length) return
      results[index] = await task(items[index])
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, () => worker()),
  )
  return results
}

export async function loadQuotes(symbols: string[]): Promise<QuotesPayload> {
  const rows = await mapPool(symbols, 6, async (symbol) => {
    try {
      const quote = await getQuote(symbol)
      return { quote }
    } catch (error) {
      const failure: QuoteError = { symbol, message: messageFor(symbol, error) }
      return { error: failure }
    }
  })
  const quotes: Quote[] = []
  const errors: QuoteError[] = []
  for (const row of rows) {
    if ("quote" in row && row.quote) quotes.push(row.quote)
    if ("error" in row && row.error) errors.push(row.error)
  }
  return { quotes, errors }
}
