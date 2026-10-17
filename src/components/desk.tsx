"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import { RefreshCwIcon } from "lucide-react"

import { ChartPanel } from "@/components/chart-panel"
import { TapeStrip } from "@/components/tape-strip"
import { Watchlist } from "@/components/watchlist"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { fetchQuotes } from "@/lib/api"
import { writeBrief } from "@/lib/brief"
import {
  formatClock,
  sessionLabel,
} from "@/lib/format"
import {
  DEFAULT_WATCHLIST,
  STORAGE_KEY,
  TAPE_SYMBOLS,
  WATCHLIST_LIMIT,
  isSymbol,
  normalizeSymbol,
  uniqueSymbols,
} from "@/lib/symbols"
import type { Quote, RangeKey, Session } from "@/lib/types"
import { cn } from "@/lib/utils"

const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULT_WATCHLIST)

function subscribeWatchlist(onChange: () => void) {
  window.addEventListener("storage", onChange)
  window.addEventListener("desk-watchlist", onChange)
  return () => {
    window.removeEventListener("storage", onChange)
    window.removeEventListener("desk-watchlist", onChange)
  }
}

function readWatchlistSnapshot() {
  return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SNAPSHOT
}

function parseWatchlist(snapshot: string) {
  try {
    const parsed = JSON.parse(snapshot) as unknown
    if (!Array.isArray(parsed)) return [...DEFAULT_WATCHLIST]
    return uniqueSymbols(parsed.filter((item) => typeof item === "string")).slice(
      0,
      WATCHLIST_LIMIT,
    )
  } catch {
    return [...DEFAULT_WATCHLIST]
  }
}

function commitWatchlist(symbols: string[]) {
  const next = uniqueSymbols(symbols).slice(0, WATCHLIST_LIMIT)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  window.dispatchEvent(new Event("desk-watchlist"))
}

export function Desk({
  dateLabel,
  weekend,
}: {
  dateLabel: string | null
  weekend: boolean
}) {
  const snapshot = useSyncExternalStore(
    subscribeWatchlist,
    readWatchlistSnapshot,
    () => DEFAULT_SNAPSHOT,
  )
  const watchlist = useMemo(() => parseWatchlist(snapshot), [snapshot])
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading")
  const [banner, setBanner] = useState<string | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>("1d")
  const [refreshing, setRefreshing] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)
  const [checkedAt, setCheckedAt] = useState<number | null>(null)
  const chartRef = useRef<HTMLDivElement>(null)
  const hasLoaded = useRef(false)

  const load = useCallback(async (symbols: string[]) => {
    const initial = !hasLoaded.current
    if (!initial) setRefreshing(true)
    try {
      const payload = await fetchQuotes(symbols)
      const next: Record<string, Quote> = {}
      for (const quote of payload.quotes) next[quote.symbol] = quote
      setQuotes((current) => ({ ...current, ...next }))
      if (payload.quotes.length === 0) {
        setStatus("error")
        setBanner(payload.errors[0]?.message ?? "The tape did not come through.")
      } else {
        hasLoaded.current = true
        setStatus("ready")
        const missed = payload.errors.map((error) => error.symbol).filter(Boolean)
        setBanner(
          missed.length > 0 ? `No quote for ${missed.join(", ")}.` : null,
        )
        setCheckedAt(Date.now() / 1000)
      }
    } catch (error) {
      if (initial) {
        setStatus("error")
        setBanner(
          error instanceof Error ? error.message : "The tape did not come through.",
        )
      } else {
        setBanner("Could not refresh. Showing the last tape.")
      }
    } finally {
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    const symbols = uniqueSymbols([...TAPE_SYMBOLS, ...parseWatchlist(snapshot)])
    let cancelled = false
    queueMicrotask(() => {
      if (!cancelled) void load(symbols)
    })
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(symbols)
    }, 60_000)
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [snapshot, reloadKey, load])

  useEffect(() => {
    const nudge = window.setTimeout(() => {
      window.dispatchEvent(new Event("desk-watchlist"))
    }, 0)
    return () => window.clearTimeout(nudge)
  }, [])

  function select(symbol: string) {
    setSelected(symbol)
    if (window.matchMedia("(max-width: 1023px)").matches) {
      chartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }

  async function addSymbol(symbol: string) {
    const normalized = normalizeSymbol(symbol)
    if (!isSymbol(normalized)) throw new Error("Enter a ticker such as AAPL.")
    if (watchlist.includes(normalized)) {
      select(normalized)
      return
    }
    if (watchlist.length >= WATCHLIST_LIMIT) {
      throw new Error("The desk holds 20 names. Remove one first.")
    }
    const payload = await fetchQuotes([normalized])
    const quote = payload.quotes[0]
    if (!quote) {
      throw new Error(payload.errors[0]?.message ?? "No listing found.")
    }
    setQuotes((current) => ({ ...current, [quote.symbol]: quote }))
    commitWatchlist([quote.symbol, ...watchlist])
    setSelected(quote.symbol)
    setStatus("ready")
    hasLoaded.current = true
  }

  function removeSymbol(symbol: string) {
    const current = watchlist
    const index = current.indexOf(symbol)
    const next = current.filter((item) => item !== symbol)
    commitWatchlist(next)
    if (selected === symbol) {
      setSelected(next[index] ?? next[index - 1] ?? next[0] ?? TAPE_SYMBOLS[0])
    }
  }

  const active =
    selected &&
    (watchlist.includes(selected) || TAPE_SYMBOLS.includes(selected))
      ? selected
      : (watchlist[0] ?? TAPE_SYMBOLS[0])

  const session: Session | null = quotes["^GSPC"]?.session ?? null
  const cashPrint = quotes["^GSPC"]?.marketTime ?? null
  const brief =
    status === "ready"
      ? writeBrief(Object.values(quotes), watchlist, weekend)
      : null

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-medium tracking-[0.22em] text-mark uppercase">
            Morning tape
          </p>
          <h1 className="mt-2 font-serif text-6xl leading-none font-medium tracking-tight italic sm:text-7xl">
            Desk
          </h1>
        </div>
        <div className="sm:text-right">
          {dateLabel ? (
            <p className="font-serif text-xl">{dateLabel}</p>
          ) : (
            <Skeleton className="h-7 w-56 sm:ml-auto" />
          )}
          <p className="mt-1 text-sm text-muted-foreground">New York</p>
          <div className="mt-3 flex items-center gap-2 sm:justify-end">
            {session ? (
              <span className="inline-flex items-center gap-2 font-mono text-[11px] tracking-wide uppercase">
                <span
                  className={cn(
                    "size-1.5",
                    session === "open" && "bg-up",
                    session === "closed" && "bg-foreground/40",
                    (session === "pre" || session === "post") && "bg-mark",
                  )}
                  aria-hidden
                />
                {sessionLabel(session)}
              </span>
            ) : (
              <Skeleton className="h-4 w-28" />
            )}
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Refresh the tape"
                    disabled={refreshing || status === "loading"}
                    onClick={() => {
                      if (status !== "loading") {
                        void load(uniqueSymbols([...TAPE_SYMBOLS, ...watchlist]))
                      }
                    }}
                  />
                }
              >
                <RefreshCwIcon className={cn(refreshing && "animate-spin motion-reduce:animate-none")} />
              </TooltipTrigger>
              <TooltipContent>Refresh the tape</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </header>

      <Separator className="mt-6 bg-foreground/20" />

      {status === "error" ? (
        <div className="mt-10 max-w-xl" role="alert">
          <p className="font-serif text-3xl">The tape did not come through.</p>
          <p className="mt-3 text-sm text-muted-foreground">
            {banner ?? "The quote service did not answer. Try again in a moment."}
          </p>
          <Button
            className="mt-6"
            onClick={() => {
              setStatus("loading")
              setBanner(null)
              setReloadKey((value) => value + 1)
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        <>
          <section className="mt-8" aria-label="Morning brief">
            <h2 className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
              The brief
            </h2>
            {brief ? (
              <p className="mt-3 max-w-3xl font-serif text-[1.65rem] leading-snug text-pretty sm:text-3xl sm:leading-snug">
                {brief}
              </p>
            ) : (
              <div className="mt-4 max-w-3xl space-y-3">
                <Skeleton className="h-7 w-full" />
                <Skeleton className="h-7 w-11/12" />
                <Skeleton className="h-7 w-2/3" />
              </div>
            )}
            {banner && status === "ready" && (
              <p className="mt-4 text-sm text-destructive" role="status">
                {banner}
              </p>
            )}
          </section>

          <div className="mt-10">
            <TapeStrip
              quotes={quotes}
              selected={active}
              loading={status === "loading"}
              onSelect={select}
            />
          </div>

          <div className="mt-10 grid gap-10 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-12">
            <div className="order-2 lg:order-1">
              <Watchlist
                symbols={watchlist}
                quotes={quotes}
                selected={active}
                loading={status === "loading"}
                onSelect={select}
                onRemove={removeSymbol}
                onAdd={addSymbol}
                onReset={() => {
                  commitWatchlist([...DEFAULT_WATCHLIST])
                  setSelected(DEFAULT_WATCHLIST[0])
                }}
              />
            </div>
            <div ref={chartRef} className="order-1 scroll-mt-6 lg:order-2">
              <ChartPanel
                symbol={active}
                quote={active ? quotes[active] : undefined}
                range={range}
                onRange={setRange}
              />
            </div>
          </div>
        </>
      )}

      <footer className="mt-16 border-t border-foreground/15 pt-4 text-xs text-muted-foreground">
        <p>
          Prices from Yahoo Finance. They can lag the exchange. Desk is a reading
          surface, not a place to trade.
        </p>
        <p className="mt-1 font-mono">
          {cashPrint ? `Cash session ${formatClock(cashPrint)}` : "Waiting on a print"}
          {checkedAt ? ` · Checked ${formatClock(checkedAt)}` : ""}
        </p>
      </footer>
    </div>
  )
}
