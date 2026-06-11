# Quiniela Mundial 2026 — Website Audit

_Audited June 11, 2026, after the opening match. Scope: correctness & data, UX/copy/mobile, robustness/edge cases, security/config. Findings verified against the official Dec 5, 2025 final draw and the live codebase._

## The short version

The app is in good shape. The network layer is genuinely well-built (every external call fails closed, intervals are cleaned up, the realtime echo-loop is guarded), the Spanish-first bilingual system is airtight (232/232 keys, native wording), the data matches the real 2026 draw, and the rules page is clear. There are **two real money-affecting bugs** in the payout logic that are worth fixing before the knockout rounds, **one security reality** to make a conscious decision about, and a handful of small data and UX cleanups.

Fix priority: **B1 → B2 → D1 → S1 (decision) → R1**, then the rest as time allows.

---

## Critical / money-affecting

### B1 — A drawn Final crowns the wrong champion (drives the 60% prize)
`src/lib/results-sync.ts:201`

```ts
championId = score[0] >= score[1] ? id1 : id2;
```

World Cup finals that finish level go to a penalty shootout. The free results feed reports the 90/120-minute score (e.g. `1-1`), and the real winner is whoever won the shootout. With `>=`, a drawn final **always** hands the title to the first-listed team — wrong roughly half the time it goes to penalties. This directly sets the champion, which pays out **60% of the pot**. This is the highest-impact bug in the app.

**Fix:** when the FT score is level, read the penalty score the feed provides; if it's unavailable, fall back to "no champion yet / needs manual confirmation" rather than guessing.

### B2 — A tie for most points isn't split (the 40% prize)
`src/lib/scoring.ts:174–188`

```ts
const pointsLeaderId = sorted[0] && sorted[0].totalPoints > 0 ? sorted[0].participant.id : null;
```

If two or more players tie on points, only `sorted[0]` — effectively whoever joined first — receives the **entire 40%** points prize. There's no split and no tie-break rule. (Good news: the case where the champion's owner is *also* the points leader is handled correctly — the two shares accumulate.)

**Fix:** find everyone whose total equals the top total and split `pot × payout.points` evenly among them. Document the rule on the Rules page.

---

## Security — one real decision to make

### S1 — Anyone with the link can overwrite or wipe the pool
`supabase/schema.sql:36–42`, `src/lib/supabase.ts:17–29`, `src/components/require-auth.tsx`

The "Admin" PIN gate is **cosmetic** — it only decides which screens render, not who can write. Combined with Supabase RLS policies that grant the public `anon` role full `INSERT`/`UPDATE` on the pool row (`with check (true)`), and the anon key being baked into the browser bundle by design, the practical result is: **anyone the link reaches can write arbitrary data to the shared pool** (change owners, settings, results, or replace the whole thing), and realtime pushes it to everyone.

For ~12 trusted family members with no money moving through the app, the *likelihood* is low but the *impact* is total (and there's no recovery beyond re-entering everything). This is a conscious choice, not an emergency:

- **Accept it** (reasonable for this audience) — but I'd add a periodic JSON backup so you can restore after an accidental or malicious wipe.
- **Lock it down** (a one-evening change) — make the anon policies read-only and route writes through the existing Cloudflare Worker (or a Supabase Edge Function) guarded by a write-token the organizer holds and that never ships to the browser.
- **Do it "properly"** — Supabase Auth (magic link for you), gate writes to authenticated. Heaviest option.

Related, low-severity: the organizer PIN `3389` is hardcoded in client JS and stored in the world-readable pool JSON — but since the gate it protects is already bypassable, it protects nothing of value today. The README still documents the old default PIN `0000` (code uses `3389`).

**What's done correctly:** the API-Football key is a proper Wrangler secret (never in the repo, never sent to the browser); the Worker's `CORS: *` is fine for a public read-only score proxy; `.env.local` is gitignored and this folder isn't a git repo; the Cloudflare `account_id` in `wrangler.toml` is not sensitive.

---

## Data accuracy

### D1 — Three duplicated FIFA ranks (data-entry slips)
`src/lib/data/teams.ts:29, 40, 58`

- Turkey `fifaRank: 27` — copied from Canada (also 27)
- Sweden `fifaRank: 41` — copied from Ivory Coast (also 41)
- Iraq `fifaRank: 58` — copied from Saudi Arabia (also 58)

These feed the "featured match" picker (lower rank = more prominent on the hero) and tier displays. Low impact, trivial fix — set the real Nov-2025 ranks. **The group assignments and all 48 teams are otherwise correct**, and the opening match (Mexico vs South Africa at the Azteca) matches reality.

### D2 — The fixtures generator is wrong, but unused
`src/lib/data/fixtures.ts:15–19`

The hand-rolled round-robin pairs MD1 as 1v4/2v3, but the real schedule is 1v2/3v4 (the opener was Mexico vs South Africa, not Mexico vs Czechia). **However, this module isn't imported anywhere** — the live card and the calendario both pull real fixtures from openfootball. It's dead code. **Fix:** delete the module (cleanest) so a stray future import can't surface wrong fixtures.

---

## Robustness

### R1 — Knockout standings can freeze until the bracket fills in
`src/lib/results-sync.ts:186–213`

Advancement and elimination are only computed once the knockout bracket has **real team names**. The free feed publishes knockout slots as placeholders ("Winner Group A", "1A", etc.) that don't map, so until it backfills real names, teams that advanced stay marked "group" and **nobody gets marked eliminated** — exactly when standings matter most. **Fix:** derive top-2-per-group (+ best thirds) advancement from the group table directly, independent of whether the bracket names have resolved.

### R2 — No "results may be stale / feed is down" signal
`src/lib/live.ts`, `src/components/sync-indicator.tsx`

Every backend failure degrades silently to empty data — great for not crashing, but the sync indicator shows a permanent green "live" pill even if every source is down, so you can't tell results are stale. **Fix:** surface a subtle "stale" state when the last successful sync is older than ~15 minutes.

### R3 — Concurrent-edit clobber (last writer wins)
`src/components/pool-provider.tsx`, `src/lib/supabase.ts`

Every edit upserts the entire pool JSON with no version check. If two people have Admin open, one's save silently overwrites the other's. The schema already has an `updated_at` column — use it for a conditional write, or merge at field level. Low probability for a 12-person pool, data-destroying when it hits.

### R4 — `findLiveFor` can mis-match half-resolved knockout fixtures
`src/lib/live.ts:77–84`

A fixture with one known side (`homeId="ESP"`, `awayId=null`) can match a live match on the `null === null` branch and show the wrong score. **Fix:** require both team IDs to be present and matched.

### R5 — Live/pending window too short for extra time
`src/components/matchday-today.tsx`

The 2.5h "in progress" window can flip a knockout match that goes to ET + penalties into the "score pending" state while it's still playing. **Fix:** widen to ~3.25h for knockout rounds.

---

## UX, copy & mobile

- **U1 (Medium)** — The "score pending" hero shows a large greyed `– · –`, which a non-technical user could read as a load failure. The copy ("marcador por confirmar") is fine; soften the visual to a small pill or spinner. `src/components/matchday-today.tsx`
- **U2 (Medium)** — A few admin strings bypass translation: `aria-label="Remove"` and an `"org"` badge (`src/app/admin/page.tsx:291, 261`); and `team-chip.tsx:30,35` has hardcoded "Grp"/"Pot" (currently unused, but latent). Route through `t()`.
- **U3 (Low)** — Crest rows can clip on narrow phones for players owning 4+ teams (dashboard doesn't scroll; leaderboard scrolls with no affordance). Add a `+N` counter or fade edge. `src/app/dashboard/page.tsx:70`, `src/app/leaderboard/page.tsx:62`
- **U4 (Low)** — Bottom-nav tap targets are ~40px, just under the 44px guideline. Bump padding to `py-3`. `src/components/app-shell.tsx:161`
- **U5 (Low)** — ~40 dead i18n keys remain from removed features (landing/join/bonus-picks). Harmless, but maintenance debt to prune. `src/lib/i18n.tsx`

---

## What's solid (verified, no action needed)

- **Bilingual system:** ES and EN dictionaries each have exactly 232 keys, zero missing/duplicated; Spanish is the hard default (`<html lang="es">`, `es` fallback) and reads as native Mexican-Spanish quiniela language (`bote`, `tapado`, `papelitos`, `Botín de Oro`).
- **Rules page:** plain-language, both payouts shown with live % badges (60/40), points table always visible (not collapsed), underdog multiplier explained.
- **Data:** all 48 teams, 12 groups A–L, and every group assignment match the official final draw; playoff placeholders resolved to real nations; the `NAME_TO_ID` map covers every group-stage name plus accent/variant forms.
- **Scoring engine** (apart from B1/B2): empty-state safe (no division-by-zero, no NaN, everyone at 0 before results), underdog multiplier correctly scoped to knockout milestones only, stage cumulation correct, third-place match correctly excluded, champion/leader overlap handled.
- **Network layer:** all fetches wrapped in try/catch and fail closed; CDN→raw GitHub fallback for results; all intervals cleared on unmount; realtime echo-loop guarded; worker caches only successful responses; manual organizer edits respected by auto-sync.
- **No "Los Reyes Tires" branding anywhere** (fully removed).
- **Score orientation** (home/away swap between our data and the live feed) handled correctly in both the hero and match rows.

---

_Recommended order: B1, B2, D1, then the S1 decision, then R1. I can implement the code fixes (B1, B2, D1, D2, R1, R4, R5, U1, U2) in one pass; S1 and R2/R3 are larger choices worth discussing first._
