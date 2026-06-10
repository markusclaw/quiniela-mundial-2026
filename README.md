# Quiniela Mundial 2026 ⚽

A private, mobile-first World Cup 2026 pool for friends & family. Built with
Next.js (App Router) + Tailwind + shadcn-style components. Fully
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

## Multi-device with Supabase

The app runs on localStorage by default (single device). To sync across phones
and laptops, point it at a Supabase project — no code changes needed:

1. In your Supabase project, open the **SQL editor** and run
   `supabase/schema.sql`. It creates one `pool_state` table, enables Realtime,
   and sets friendly access policies.
2. Copy `.env.example` to `.env.local` and fill in:
   - `NEXT_PUBLIC_SUPABASE_URL` — your project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Settings → API → `anon` `public` key
3. Restart `npm run dev`. The whole pool now lives in Supabase and updates live
   on every device. Leave the keys blank to go back to localStorage-only.

How it works: the entire pool is stored as a single JSON document
(`src/lib/supabase.ts`); every change is upserted and Realtime pushes it to the
other devices. Simple and ample for a ~12-person pool. (Heavy simultaneous
edits use last-write-wins on the document — fine here, since results are
entered by one organizer and picks happen over days.)

## Deploy to Cloudflare Pages

The app is a fully client-side static site (`output: "export"` in
`next.config.mjs`), so it deploys as plain static files — no Workers adapter
needed. In the Cloudflare dashboard:

1. **Workers & Pages → Create → Pages → Connect to Git**, pick the
   `quiniela-mundial-2026` repo.
2. Framework preset: **Next.js (Static HTML Export)** (or set it manually):
   - Build command: `npx next build`
   - Build output directory: `out`
3. Add **Environment variables** (Settings → Variables, for Production *and*
   Preview) — these are read at build time:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `NEXT_PUBLIC_POOL_ID` = `default`
4. Save & Deploy. Every push to `main` redeploys automatically.

(These `NEXT_PUBLIC_*` values get baked into the public bundle — expected and
safe; the anon key is a browser key by design.)

## Data source

Groups, teams, seeding pots and schedule reflect the official **2026 FIFA World
Cup final draw (Dec 5, 2025)**. For live scores during the tournament you can
wire a free feed (e.g. openfootball/worldcup.json or worldcup26 REST API) into
the Results flow — or just have the organizer enter results, which is plenty for
a family pool.

---
A private family & friends pool. ¡Que gane el mejor! 🏆
