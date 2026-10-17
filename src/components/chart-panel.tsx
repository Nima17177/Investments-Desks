"use client"

import { useEffect, useState } from "react"

import { PriceChart } from "@/components/price-chart"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchChart } from "@/lib/api"
import {
  formatPercent,
  formatPrice,
  formatSigned,
  formatVolume,
  toneClass,
} from "@/lib/format"
import type { ChartPayload, Quote, RangeKey } from "@/lib/types"
import { RANGES } from "@/lib/types"
import { cn } from "@/lib/utils"

const RANGE_KEYS = Object.keys(RANGES) as RangeKey[]

export function ChartPanel({
  symbol,
  quote,
  range,
  onRange,
}: {
  symbol: string | null
  quote: Quote | undefined
  range: RangeKey
  onRange: (range: RangeKey) => void
}) {
  const [chart, setChart] = useState<ChartPayload | null>(null)
  const [failure, setFailure] = useState<{
    symbol: string
    range: RangeKey
    message: string
  } | null>(null)

  useEffect(() => {
    if (!symbol) return
    const controller = new AbortController()
    const requested = symbol
    fetchChart(requested, range, controller.signal)
      .then((payload) => {
        if (controller.signal.aborted) return
        setChart(payload)
        setFailure(null)
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return
        setFailure({
          symbol: requested,
          range,
          message:
            reason instanceof Error
              ? reason.message
              : "The chart did not come through.",
        })
      })
    return () => controller.abort()
  }, [symbol, range])

  const ready = chart != null && chart.symbol === symbol && chart.range === range
  const error =
    failure && failure.symbol === symbol && failure.range === range
      ? failure.message
      : null

  const daySpan =
    quote?.dayHigh != null && quote.dayLow != null && quote.dayHigh > quote.dayLow
      ? ((quote.price - quote.dayLow) / (quote.dayHigh - quote.dayLow)) * 100
      : null

  return (
    <section aria-label="Chart" className="lg:sticky lg:top-6 lg:self-start">
      {!symbol || !quote ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (
        <>
          <p className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase">
            {quote.kind}
            {quote.exchange ? ` · ${quote.exchange}` : ""}
          </p>
          <h2 className="mt-2 font-serif text-4xl leading-none text-balance">
            {quote.name}
          </h2>
          <p className="mt-2 font-mono text-xs text-muted-foreground">{quote.symbol}</p>
          <div className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <p className="font-mono text-3xl tabular-nums">{formatPrice(quote.price)}</p>
            <p className={cn("font-mono text-sm tabular-nums", toneClass(quote.change))}>
              {formatSigned(quote.change)} {formatPercent(quote.changePercent)}
            </p>
            {quote.currency !== "USD" && (
              <p className="text-xs text-muted-foreground">{quote.currency}</p>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-1" role="group" aria-label="Chart range">
            {RANGE_KEYS.map((key) => (
              <Button
                key={key}
                type="button"
                size="xs"
                variant={key === range ? "default" : "outline"}
                aria-pressed={key === range}
                onClick={() => onRange(key)}
              >
                {RANGES[key].label}
              </Button>
            ))}
          </div>

          <div className="mt-4">
            {error ? (
              <p className="flex h-56 items-center text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : ready && chart ? (
              <PriceChart
                points={chart.points}
                reference={chart.reference}
                range={range}
              />
            ) : (
              <Skeleton className="h-56 w-full" />
            )}
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-foreground/15 pt-4">
            <Stat label="Previous close" value={formatPrice(quote.previousClose)} />
            <Stat label="Volume" value={formatVolume(quote.volume)} />
            <Stat label="Day high" value={quote.dayHigh == null ? "—" : formatPrice(quote.dayHigh)} />
            <Stat label="Day low" value={quote.dayLow == null ? "—" : formatPrice(quote.dayLow)} />
            <Stat label="52-week high" value={quote.yearHigh == null ? "—" : formatPrice(quote.yearHigh)} />
            <Stat label="52-week low" value={quote.yearLow == null ? "—" : formatPrice(quote.yearLow)} />
          </dl>

          {daySpan != null && quote.dayLow != null && quote.dayHigh != null && (
            <div className="mt-5">
              <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
                <span>{formatPrice(quote.dayLow)}</span>
                <span>Day range</span>
                <span>{formatPrice(quote.dayHigh)}</span>
              </div>
              <div className="relative mt-2 h-px bg-foreground/20">
                <span
                  className="absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 bg-foreground"
                  style={{ left: `${Math.min(100, Math.max(0, daySpan))}%` }}
                />
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="mt-1 font-mono text-sm tabular-nums">{value}</dd>
    </div>
  )
}
