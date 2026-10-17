import { getChart } from "@/lib/yahoo"
import { isSymbol, normalizeSymbol } from "@/lib/symbols"
import { RANGES, type RangeKey } from "@/lib/types"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const symbol = normalizeSymbol(url.searchParams.get("symbol") ?? "")
  const range = url.searchParams.get("range") ?? "1d"
  if (!isSymbol(symbol) || !(range in RANGES)) {
    return Response.json({ error: "Unknown symbol or range." }, { status: 400 })
  }
  try {
    const chart = await getChart(symbol, range as RangeKey)
    return Response.json(chart, {
      headers: { "Cache-Control": "no-store" },
    })
  } catch {
    return Response.json(
      { error: `No chart for ${symbol}.` },
      { status: 404 },
    )
  }
}
