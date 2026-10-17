"use client"

import { XIcon } from "lucide-react"

import { AddSymbolDialog } from "@/components/add-symbol-dialog"
import { Sparkline } from "@/components/sparkline"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { formatPercent, formatPrice, toneClass } from "@/lib/format"
import { DEFAULT_WATCHLIST } from "@/lib/symbols"
import type { Quote } from "@/lib/types"
import { cn } from "@/lib/utils"

export function Watchlist({
  symbols,
  quotes,
  selected,
  loading,
  onSelect,
  onRemove,
  onAdd,
  onReset,
}: {
  symbols: string[]
  quotes: Record<string, Quote>
  selected: string | null
  loading: boolean
  onSelect: (symbol: string) => void
  onRemove: (symbol: string) => void
  onAdd: (symbol: string) => Promise<void>
  onReset: () => void
}) {
  const customized =
    symbols.length !== DEFAULT_WATCHLIST.length ||
    symbols.some((symbol, index) => symbol !== DEFAULT_WATCHLIST[index])

  function move(key: string) {
    if (key !== "ArrowDown" && key !== "ArrowUp") return false
    const current = symbols.indexOf(selected ?? "")
    const origin = current === -1 ? 0 : current
    const next = key === "ArrowDown" ? origin + 1 : origin - 1
    const symbol = symbols[Math.max(0, Math.min(symbols.length - 1, next))]
    if (symbol) onSelect(symbol)
    return true
  }

  return (
    <section aria-label="Watchlist" onKeyDown={(event) => {
      if (move(event.key)) event.preventDefault()
    }}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            The desk
          </h2>
          <p className="mt-1 font-serif text-2xl">
            {loading ? "Loading the book" : `${symbols.length} ${symbols.length === 1 ? "name" : "names"}`}
          </p>
        </div>
        <AddSymbolDialog onAdd={onAdd} />
      </div>

      {loading ? (
        <ul className="mt-4 border-t border-foreground/15">
          {Array.from({ length: 8 }, (_, index) => (
            <li
              key={index}
              className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-3 border-b border-foreground/10 py-3"
            >
              <Skeleton className="h-8 w-[4.5rem]" />
              <span className="space-y-2">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-3 w-28" />
              </span>
              <span className="space-y-2">
                <Skeleton className="ml-auto h-4 w-14" />
                <Skeleton className="ml-auto h-3 w-10" />
              </span>
            </li>
          ))}
        </ul>
      ) : symbols.length === 0 ? (
        <div className="mt-4 border-y border-foreground/15 py-10">
          <p className="font-serif text-2xl">Nothing on the desk yet.</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            Add a name to start the list. It stays in this browser.
          </p>
          <Button variant="outline" className="mt-5" onClick={onReset}>
            Restore the original list
          </Button>
        </div>
      ) : (
        <ul className="mt-4 border-t border-foreground/15">
          {symbols.map((symbol) => {
            const quote = quotes[symbol]
            const active = selected === symbol
            return (
              <li
                key={symbol}
                className={cn(
                  "group grid grid-cols-[4.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 border-b border-foreground/10",
                  active && "bg-accent",
                )}
              >
                <button
                  type="button"
                  aria-pressed={active}
                  className="col-span-3 grid cursor-pointer grid-cols-subgrid items-center py-3 pl-2 text-left outline-none focus-visible:bg-accent"
                  onClick={() => onSelect(symbol)}
                >
                  {quote ? (
                    <Sparkline values={quote.sparkline} change={quote.changePercent} />
                  ) : (
                    <span className="h-8 w-[4.5rem]" />
                  )}
                  <span className="min-w-0">
                    <span className="block font-mono text-sm">{symbol}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {quote?.name ?? "Waiting on a quote"}
                    </span>
                  </span>
                  <span className="pr-2 text-right">
                    {quote ? (
                      <>
                        <span className="block font-mono text-sm tabular-nums">
                          {formatPrice(quote.price)}
                        </span>
                        <span
                          className={cn(
                            "block font-mono text-xs tabular-nums",
                            toneClass(quote.changePercent),
                          )}
                        >
                          {formatPercent(quote.changePercent)}
                        </span>
                      </>
                    ) : (
                      <span className="font-mono text-sm text-muted-foreground">—</span>
                    )}
                  </span>
                </button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  className="mr-1 opacity-70 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                  aria-label={`Remove ${symbol}`}
                  onClick={() => onRemove(symbol)}
                >
                  <XIcon />
                </Button>
              </li>
            )
          })}
        </ul>
      )}

      {customized && symbols.length > 0 && (
        <Button
          type="button"
          variant="link"
          className="mt-3 h-auto px-0 text-muted-foreground"
          onClick={onReset}
        >
          Reset list
        </Button>
      )}
    </section>
  )
}
