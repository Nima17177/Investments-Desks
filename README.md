# Desk

A morning market desk. It opens with a short brief, a tape of indexes and commodities, and a watchlist you can edit. Prices are live quotes from Yahoo Finance. No API key.

The watchlist is saved in this browser.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123).

## What you can do

- Read the session brief and the tape (S&P 500, Nasdaq, Dow, Russell, VIX, crude, gold, bitcoin).
- Select a name to see the session chart. Ranges are 1D, 5D, 1M, 6M, and 1Y.
- Add or remove names. Search accepts a company or a ticker. The list holds 20 names.
- Reset the list to the original book.

Quotes can lag the exchange. Desk is a reading surface, not a brokerage.
