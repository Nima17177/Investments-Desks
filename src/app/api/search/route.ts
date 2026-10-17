import { searchSymbols } from "@/lib/yahoo"

export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get("q") ?? "").trim()
  if (query.length < 1) {
    return Response.json({ hits: [] })
  }
  if (query.length > 40) {
    return Response.json({ error: "That search is too long." }, { status: 400 })
  }
  try {
    const hits = await searchSymbols(query)
    return Response.json(
      { hits },
      { headers: { "Cache-Control": "no-store" } },
    )
  } catch {
    return Response.json(
      { error: "Search did not come through." },
      { status: 502 },
    )
  }
}
