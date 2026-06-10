# Quiniela Los Reyes Tires · 2026 ⚽

A private, mobile-first World Cup 2026 pool presented by **Los Reyes Tires**.
Built with Next.js (App Router) + Tailwind + shadcn-style components. Fully
**bilingual (Spanish / English)** — auto-detects the device language, defaults
to Spanish, and has a one-tap ES/EN toggle. Runs fully on your machine with
**zero backend** today; structured to drop Supabase in later.

## The format (why this isn't a one-winner raffle)

Three layers keep everyone in the game all month:

1. **Tiered team packages.** All 48 teams are split into 12 packages of 4 — one
   team from every FIFA seeding pot. Packages are tiered by their headline team:
   *Premium* (a title favorite, higher buy-in), *Contender* (mid), and
   *Underdog* (no favorites, cheapest). Supporting teams are snake-paired so
   total package strength stays balanced.
2. **Phase payouts.** Points and pot money are paid out at every milestone —
   group wins, advancing, R16, QF, SF, Final, Champion — not just at the end.
3. **Underdog edge + bonus picks.** Pot 3/4 teams earn a **1.5× multiplier** on
   knockout milestones, and everyone makes three bonus picks (champion, Golden
   Boot, dark horse) worth side-pool points — so unlucky drafters can still win.

Pot shares are **equal weight regardless of buy-in**: a cheap Underdog pack that
runs deep pays the same as a Premium one. You pay more for better odds, not
bigger prizes.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
```

Build for production: `npm run build && npm start`.

> Requires Node 18+. The first screen lets you **Load a demo pool** to see it
> populated instantly.

## How a pool works

- **Organizer** logs in with the organizer PIN (default `0000`) → opens the
  **Admin** panel. Set the pool name, currency, join code, and tier buy-ins,
  then *Apply prices to packages*.
- **Players** open the app, enter a name + 4-digit PIN + the join code, and pick
  a package. Not tech-savvy? The organizer can add anyone and pick on their
  behalf from **Admin → People**.
- As matches happen, the organizer enters results in **Admin → Results**
  (group W-D-L + how far each team got). The **Leaderboard** and everyone's
  **pot share** update live.
- Set the champion + top scorer in **Admin → Answers** to grade bonus picks.

## Scoring (all editable in code)

| Milestone | Points |
|---|---|
| Group win / draw | 3 / 1 |
| Advance (R32) | 5 |
| Round of 16 | 8 |
| Quarter-final | 13 |
| Semi-final | 21 |
| Final | 34 |
| Champion | 55 |
| Underdog (Pot 3/4) knockout bonus | ×1.5 |
| Bonus: champion / top scorer / dark horse | 40 / 25 / 20 |

Pot pools by phase (group 15%, R16 10%, QF 15%, SF 15%, Final 10%, Champion
25%, Predictions 10%) are split proportionally by the points earned in each
phase. Defaults live in `src/lib/scoring.ts`.

## Project structure

```
src/
  app/            # routes: / (join), /draw, /dashboard, /leaderboard, /fixtures, /admin
  components/     # app shell, providers, shadcn-style ui/
  lib/
    data/         # teams, groups, fixtures — the real 2026 draw (seeded)
    packages.ts   # tiered package builder
    scoring.ts    # phase points, underdog multiplier, pot distribution
    store.ts      # ◀ THE DATA LAYER (localStorage today; Supabase seam)
    types.ts
supabase/
  schema.sql      # drop-in Postgres schema for multi-device play
```

## Going online with Supabase (later)

The whole app reads/writes through `loadState` / `saveState` in
`src/lib/store.ts` and the action helpers in `src/components/pool-provider.tsx`.
To go multi-device:

1. Create a Supabase project and run `supabase/schema.sql`.
2. `npm install @supabase/supabase-js`, add your URL + anon key to `.env.local`.
3. Replace the bodies of `loadState`/`saveState` (and the mutation helpers) with
   Supabase queries. The team/group/fixture data stays in `src/lib/data` — it
   never changes. Nothing in the UI needs to change.

## Data source

Groups, teams, seeding pots and schedule reflect the official **2026 FIFA World
Cup final draw (Dec 5, 2025)**. For live scores during the tournament you can
wire a free feed (e.g. openfootball/worldcup.json or worldcup26 REST API) into
the Results flow — or just have the organizer enter results, which is plenty for
a family pool.

---
Presented by Los Reyes Tires. ¡Que gane el mejor! 🏆
