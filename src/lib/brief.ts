import { prosePercent, prosePrice, shortName } from "@/lib/format"
import type { Quote, Session } from "@/lib/types"

function sessionSentence(session: Session | null, weekend: boolean) {
  if (session === "open") return "The New York cash session is open."
  if (session === "pre") return "Pre-market trading is underway in New York."
  if (session === "post") {
    return "The cash session is over, and after-hours trading is still open."
  }
  if (weekend) return "U.S. markets are closed for the weekend."
  return "The New York session is closed."
}

function indexClause(quote: Quote, subject: string, live: boolean) {
  const at = prosePrice(quote.symbol, quote.price)
  if (Math.abs(quote.changePercent) < 0.05) {
    return live
      ? `${subject} is flat at ${at}`
      : `${subject} finished flat at ${at}`
  }
  const magnitude = prosePercent(quote.changePercent)
  const up = quote.changePercent > 0
  if (live) {
    return `${subject} is ${up ? "up" : "down"} ${magnitude} at ${at}`
  }
  return `${subject} ${up ? "rose" : "fell"} ${magnitude} to ${at}`
}

function marketSentence(spx: Quote, nasdaq: Quote | undefined, live: boolean) {
  const lead = indexClause(spx, "The S&P 500", live)
  if (!nasdaq || Math.abs(nasdaq.changePercent) < 0.05) {
    const at = nasdaq ? prosePrice(nasdaq.symbol, nasdaq.price) : null
    return at ? `${lead}. The Nasdaq was little changed at ${at}.` : `${lead}.`
  }
  const magnitude = prosePercent(nasdaq.changePercent)
  const at = prosePrice(nasdaq.symbol, nasdaq.price)
  const up = nasdaq.changePercent > 0
  const sameDirection =
    Math.sign(nasdaq.changePercent) === Math.sign(spx.changePercent) &&
    Math.abs(spx.changePercent) >= 0.05
  const further =
    sameDirection &&
    Math.abs(nasdaq.changePercent) > Math.abs(spx.changePercent) + 0.4
  if (further) {
    return live
      ? `${lead}, and the Nasdaq is ${up ? "stronger still" : "weaker still"}, ${up ? "up" : "down"} ${magnitude} at ${at}.`
      : `${lead}, and the Nasdaq ${up ? "rose" : "fell"} further, ${up ? "up" : "down"} ${magnitude} to ${at}.`
  }
  return live
    ? `${lead}, while the Nasdaq is ${up ? "up" : "down"} ${magnitude} at ${at}.`
    : `${lead}, while the Nasdaq ${up ? "rose" : "fell"} ${magnitude} to ${at}.`
}

function nameMove(quote: Quote, label: string, live: boolean) {
  const magnitude = prosePercent(quote.changePercent)
  const at = prosePrice(quote.symbol, quote.price)
  const up = quote.changePercent > 0
  if (live) {
    return `${label} is ${up ? "up" : "down"} ${magnitude} at ${at}.`
  }
  return `${label} ${up ? "rose" : "fell"} ${magnitude} to ${at}.`
}

function aside(
  quotes: Map<string, Quote>,
  watchlist: string[],
  live: boolean,
) {
  const vix = quotes.get("^VIX")
  if (vix && Math.abs(vix.changePercent) >= 8) {
    const up = vix.changePercent > 0
    const magnitude = prosePercent(vix.changePercent)
    const level = prosePrice(vix.symbol, vix.price)
    if (live) {
      return `Volatility is ${up ? "higher" : "easier"}: the VIX is ${up ? "up" : "down"} ${magnitude} at ${level}.`
    }
    return `Volatility ${up ? "jumped" : "eased"}: the VIX ${up ? "rose" : "fell"} ${magnitude} to ${level}.`
  }

  const book = watchlist
    .map((symbol) => quotes.get(symbol))
    .filter((quote): quote is Quote => Boolean(quote))
    .sort(
      (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent),
    )
  const leader = book[0]
  if (leader && Math.abs(leader.changePercent) >= 2) {
    const label = shortName(leader.name)
    return `On the desk, ${nameMove(leader, label, live)}`
  }

  const outside = ["CL=F", "GC=F", "BTC-USD"]
    .map((symbol) => quotes.get(symbol))
    .filter((quote): quote is Quote => Boolean(quote))
    .sort(
      (a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent),
    )[0]
  if (outside && Math.abs(outside.changePercent) >= 1.2) {
    const label =
      outside.symbol === "CL=F"
        ? "Crude oil"
        : outside.symbol === "GC=F"
          ? "Gold"
          : "Bitcoin"
    return nameMove(outside, label, live)
  }

  if (leader && Math.abs(leader.changePercent) >= 0.8) {
    return `On the desk, ${nameMove(leader, shortName(leader.name), live)}`
  }
  return null
}

export function writeBrief(
  quotes: Quote[],
  watchlist: string[],
  weekend: boolean,
) {
  const bySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]))
  const spx = bySymbol.get("^GSPC")
  const session = spx?.session ?? null
  const live = session === "open"
  const parts = [sessionSentence(session, weekend)]
  if (spx) parts.push(marketSentence(spx, bySymbol.get("^IXIC"), live))
  const note = aside(bySymbol, watchlist, live)
  if (note) parts.push(note)
  if (!spx && parts.length === 1) {
    parts.push("The rest of the tape is still coming in.")
  }
  return parts.join(" ")
}
