# Token Radar

[![make.fun](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/bocahtamvan/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/bocahtamvan/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

A token launch radar: which pre-token protocols are worth farming next, ranked by implied value, with a farm plan for each. Built for the [make.fun token-radar-01 bounty](https://make.fun/bounty/token-radar-01).

## What it does

`main.ts` (Node 22, standard library only) reads the sealed DefiLlama snapshot at `/input/snapshot.json` (758 protocols, 14 Nov 2026, 40 on the watchlist), scores every pre-token protocol, and writes:

- `/output/board.json` — 200 ranked rows (the 40 watchlist protocols plus 160 early ones below the $50M floor), each with an implied value and a farm plan
- `/output/data.js` — the dashboard's data
- `/output/dashboard/` — a sortable, filterable board with a detail view per protocol
- `/output/dossier.json` — the entry dossier

## The model (radar-2)

Every row is scored by one function of the snapshot figures. No protocol name is special-cased.

```
implied = round( tvl_usd x 0.25
  x (1 + clamp(change_7d, -80, 150) / 100 x 0.75)
  x (0.55 + min(age_days, 1095) / 1095 x 0.45)
  x (1 + 0.025 x min(max(chains - 1, 0), 4)) )
```

- **TVL** — the protocol's locked value, the base of the estimate.
- **Seven-day growth** — momentum, clamped so one wild week cannot dominate.
- **Age with no token** — how long it has run since first listed; an unlisted age uses 365 days.
- **Chain breadth** — up to +10% for protocols live on more chains; they are more entrenched.

Live-token protocols are set aside with their market caps shown, not ranked as pre-token.

## Farm plan

Each row carries six steps derived from its own category, chains, TVL and age: a fresh wallet, the main action (supply, provide liquidity, bridge, stake, deposit), weekly qualifying actions, a hold of 30–60 days, claiming only from the protocol's own points page, and a farm log. Gas costs are chain-specific (about $1 on Base, Solana and Arbitrum; about $9 on Ethereum).

## Run it

```sh
node main.ts --input ../token-radar-01-kit/input/snapshot.json
```

Or, from the kit directory, with the output directory set as the kit expects. Then open `out/dashboard/index.html`.

## Screenshots

- `screenshots/1-board.png` — the ranked board
- `screenshots/2-detail.png` — a protocol's detail view, model breakdown and farm plan
- `screenshots/3-filtered.png` — the board filtered by the Lending category

Implied value is a model, not a price and not a promise. Do your own research before farming anything.
