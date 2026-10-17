"use client"

import { formatPercent, formatPrice, toneClass } from "@/lib/format"
import { TAPE } from "@/lib/symbols"
import type { Quote } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

export function TapeStrip({
  quotes,
  selected,
  loading,
  onSelect,
}: {
  quotes: Record<string, Quote>
  selected: string | null
  loading: boolean
  onSelect: (symbol: string) => void
}) {
  return (
    <section aria-label="Market tape">
      <h2 className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
        The tape
      </h2>
      <div className="mt-3 -mx-4 flex overflow-x-auto border-y border-foreground/15 sm:mx-0 sm:grid sm:grid-cols-4 sm:overflow-visible sm:border lg:grid-cols-8">
        {TAPE.map((item) => {
          const quote = quotes[item.symbol]
          const active = selected === item.symbol
          return (
            <button
              key={item.symbol}
              type="button"
              className={cn(
                "min-w-32 shrink-0 cursor-pointer border-r border-foreground/15 px-3 py-3 text-left transition-colors last:border-r-0 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:min-w-0",
                active && "bg-accent",
              )}
              onClick={() => onSelect(item.symbol)}
              disabled={!quote && !loading}
            >
              <span className="block text-[11px] tracking-wide text-muted-foreground uppercase">
                {item.label}
              </span>
              {loading && !quote ? (
                <span className="mt-2 block space-y-2">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-3 w-10" />
                </span>
              ) : quote ? (
                <>
                  <span className="mt-1 block font-mono text-sm whitespace-nowrap tabular-nums">
                    {formatPrice(quote.price)}
                  </span>
                  <span
                    className={cn(
                      "mt-0.5 block font-mono text-xs whitespace-nowrap tabular-nums",
                      toneClass(quote.changePercent),
                    )}
                  >
                    {formatPercent(quote.changePercent)}
                  </span>
                </>
              ) : (
                <span className="mt-1 block font-mono text-sm text-muted-foreground">—</span>
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
