import { loadQuotes } from "@/lib/yahoo"
import { isSymbol, normalizeSymbol, uniqueSymbols } from "@/lib/symbols"

export async function GET(request: Request) {
  const symbols = uniqueSymbols(
    (new URL(request.url).searchParams.get("symbols") ?? "").split(","),
  ).filter(isSymbol)

  if (symbols.length === 0) {
    return Response.json(
      { error: "Add at least one symbol." },
      { status: 400 },
    )
  }
  if (symbols.length > 32) {
    return Response.json(
      { error: "Ask for 32 symbols or fewer." },
      { status: 400 },
    )
  }

  const payload = await loadQuotes(symbols.map(normalizeSymbol))
  return Response.json(payload, {
    headers: { "Cache-Control": "no-store" },
  })
}
