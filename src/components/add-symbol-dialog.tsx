"use client"

import { useEffect, useState } from "react"
import { PlusIcon } from "lucide-react"

import { fetchSearch } from "@/lib/api"
import { isSymbol, normalizeSymbol } from "@/lib/symbols"
import type { SearchHit } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"

const SUGGESTIONS = ["Apple", "NVIDIA", "Bitcoin", "SPY"]

export function AddSymbolDialog({
  onAdd,
}: {
  onAdd: (symbol: string) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<SearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [addError, setAddError] = useState<string | null>(null)
  const [pending, setPending] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    const trimmed = query.trim()
    if (trimmed.length < 1) {
      return
    }
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      setSearching(true)
      setSearchError(null)
      fetchSearch(trimmed, controller.signal)
        .then((next) => {
          if (!controller.signal.aborted) setHits(next)
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return
          setHits([])
          setSearchError(
            error instanceof Error ? error.message : "Search did not come through.",
          )
        })
        .finally(() => {
          if (!controller.signal.aborted) setSearching(false)
        })
    }, 220)
    return () => {
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [open, query])

  function closeDialog(next: boolean) {
    setOpen(next)
    if (next) return
    setQuery("")
    setHits([])
    setSearchError(null)
    setAddError(null)
    setPending(null)
  }

  async function add(symbol: string) {
    const normalized = normalizeSymbol(symbol)
    if (!isSymbol(normalized)) {
      setAddError("Enter a ticker such as AAPL or BTC-USD.")
      return
    }
    setPending(normalized)
    setAddError(null)
    try {
      await onAdd(normalized)
      setOpen(false)
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Could not add that name.")
    } finally {
      setPending(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={closeDialog}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <PlusIcon />
        Add
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl">Add a name</DialogTitle>
          <DialogDescription>
            Search a company, fund, or ticker. Names you add stay on this browser.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (hits[0] && !isSymbol(normalizeSymbol(query))) {
              void add(hits[0].symbol)
              return
            }
            void add(query)
          }}
        >
          <Input
            autoFocus
            value={query}
            placeholder="Apple, crude, or AAPL"
            aria-label="Search listings"
            className="h-10 font-mono"
            onChange={(event) => {
              setQuery(event.target.value)
              setAddError(null)
              if (event.target.value.trim().length < 1) setHits([])
            }}
          />
        </form>
        <div className="min-h-40">
          {query.trim().length < 1 ? (
            <div>
              <p className="text-xs text-muted-foreground">Try a name</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setQuery(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          ) : searching && hits.length === 0 ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : searchError ? (
            <p className="text-sm text-destructive" role="alert">
              {searchError}
            </p>
          ) : hits.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing listed under that name.
            </p>
          ) : (
            <ul>
              {hits.map((hit) => (
                <li key={hit.symbol} className="border-b border-foreground/10">
                  <button
                    type="button"
                    className="flex w-full items-baseline justify-between gap-3 py-2.5 text-left hover:bg-accent disabled:opacity-50"
                    disabled={pending != null}
                    onClick={() => void add(hit.symbol)}
                  >
                    <span className="min-w-0">
                      <span className="font-mono text-sm">{hit.symbol}</span>
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {hit.name}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] tracking-wide text-muted-foreground uppercase">
                      {pending === hit.symbol ? "Adding" : hit.type}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        {addError && (
          <p className="text-sm text-destructive" role="alert">
            {addError}
          </p>
        )}
      </DialogContent>
    </Dialog>
  )
}
