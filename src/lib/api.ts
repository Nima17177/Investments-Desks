import type { ChartPayload, QuotesPayload, RangeKey, SearchHit } from "@/lib/types"

async function readError(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as {
    error?: string
  } | null
  return body?.error || fallback
}

export async function fetchQuotes(symbols: string[]) {
  const response = await fetch(
    `/api/quotes?symbols=${encodeURIComponent(symbols.join(","))}`,
    { cache: "no-store" },
  )
  if (!response.ok) {
    throw new Error(await readError(response, "The tape did not come through."))
  }
  return (await response.json()) as QuotesPayload
}

export async function fetchChart(symbol: string, range: RangeKey, signal?: AbortSignal) {
  const response = await fetch(
    `/api/chart?symbol=${encodeURIComponent(symbol)}&range=${range}`,
    { cache: "no-store", signal },
  )
  if (!response.ok) {
    throw new Error(await readError(response, "The chart did not come through."))
  }
  return (await response.json()) as ChartPayload
}

export async function fetchSearch(query: string, signal?: AbortSignal) {
  const response = await fetch(
    `/api/search?q=${encodeURIComponent(query)}`,
    { cache: "no-store", signal },
  )
  if (!response.ok) {
    throw new Error(await readError(response, "Search did not come through."))
  }
  const body = (await response.json()) as { hits: SearchHit[] }
  return body.hits
}
