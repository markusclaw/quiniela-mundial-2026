# Hero Section — Deep Product Audit

_Audited the live hero (`MatchdayToday` / `FeaturedMatch` in `src/components/matchday-today.tsx`) of the Quiniela Mundial 2026 dashboard. Written from three lenses: senior sports‑product UI/UX, senior frontend, and product strategy. Blunt on purpose._

---

## 1. High‑level critique

**What's genuinely good:** the bones are solid. Score is centered and dominant, the live pill is now high‑contrast, scorers are present, stadium/competition context is there, the team‑colored silk is a tasteful signature, and the i18n + data plumbing (API‑Football primary, openfootball fallback, 20s polling, finished‑match grace window) is more disciplined than most hobby builds. As a *scoreboard*, it's already above average.

**The core problem: it's a good generic scoreboard, not a quiniela command center.** A user opening this during Brazil–Morocco learns the score and stats — exactly what ESPN/FotMob already give them better. What they **cannot** learn here is the only thing this app uniquely knows: *what this match means for the money and the standings.* SITO owns Morocco; Panchito owns Brazil. If Morocco equalizes, does SITO jump a rank? Is anyone's pot share moving? Is the goals‑leader race shifting? That's the emotional core of a quiniela and it's **completely absent from the hero.** The owner names are present but inert — they're labels, not stakes.

**Second problem: it's visually rich but emotionally static.** The silk moves; nothing else does. A goal — the single most exciting event in the sport — produces no reaction: the number just silently changes on the next 20s poll. No flash, no "GOL," no scorer spotlight, no haptic. The hero looks alive but doesn't *behave* alive.

**Third: information architecture is flat.** Period, score, teams, owners, scorers, venue, competition, and a stats toggle all sit in one vertical stack with similar visual weight. There's no clear "primary glance / secondary detail / tap‑for‑more" hierarchy. Stats are hidden behind a tap (fine), but the *most* glanceable live signal — momentum/possession — is buried inside that tap while low‑value text (full competition + group string, repeated) sits in the always‑visible zone.

**Fourth: state coverage is incomplete.** Pre‑match is thin (just a countdown), penalties aren't really designed (no shootout tracker), halftime is just a label, and abandoned/postponed/extra‑time aren't handled distinctly. The hero is built for "live 2nd half" and degrades elsewhere.

Net: **B‑minus scoreboard, D quiniela experience.** The upside is enormous and mostly involves wiring data you already have (owners, points, standings, goals metric) into the moment.

---

## 2. Top 10 improvements (highest leverage first)

1. **"What's at stake" strip.** Under/around the teams, show each owner + their live points and a real‑time **leaderboard delta** ("SITO ▲ to #1 if this holds"). This is the feature that makes the hero a quiniela hero.
2. **Goal moment.** On score change: brief full‑card flash, "GOL" flourish, scorer spotlight, and — uniquely — *"Vinícius 32' · Panchito's Brazil"* tying the event to the owner. Optional sound/haptic toggle.
3. **Always‑visible momentum bar.** A single possession/shots bar (home‑color vs away‑color) sits above the stats toggle, always on. It's the most glanceable "who's on top" signal; don't bury it.
4. **Live points/goals tick.** When a goal lands, animate the scoring team's owner's points and the **goals‑leader race** ("Brazil's goal → Panchito 4 goles, retakes Líder de goles"). Connect match events to your two prize metrics.
5. **Proper state machine + per‑state layouts** (pre / live / HT / FT / ET / penalties / postponed). Each state shows the right thing (see §8).
6. **Penalty shootout tracker.** Dots per kick (●○) per team — table‑stakes for knockout drama; you already get `score.penalty` from the API.
7. **Event timeline, not a text list.** A horizontal mini‑timeline (0'→90') with goal/card/sub markers, color‑coded by team; tap a marker for detail. Replaces the flat scorer text.
8. **Contrast hardening.** Stop relying on flag colors for legibility. Add a consistent dark scrim/vignette behind the content column so white text is AA‑compliant over *any* pairing (Brazil green/yellow + Morocco red is already borderline). Keep the silk for flavor at the edges.
9. **Tap‑through to a full match page.** The hero is a *preview/command center*; a tap opens a dedicated match view (lineups, full timeline, H2H, all owners affected, win probability). Don't cram everything into the hero.
10. **Pre‑match build‑up.** Countdown + each side's owner, recent form (W/D/L pills), head‑to‑head, and "what's at stake for the table." Turn dead pre‑match time into anticipation.

---

## 3. Prioritized roadmap

**Quick wins (hours, no new data):**
- Move the competition·group line to a smaller, single de‑emphasized caption; promote period+minute.
- Add a consistent dark scrim behind the content for contrast (fixes the flag‑color legibility risk).
- Always‑visible **possession bar** (you already fetch possession) as a 1‑line preview above the collapsed stats.
- Highlight the viewer's own teams (if `me` is a participant) with a ring/"TU" tag.
- Goal‑change **flash/scale animation** on the score (pure CSS, respect reduced‑motion).
- Penalty **dots** from `score.penalty` (data already available via the day feed).

**Medium effort (1–2 evenings, data you already have or one endpoint):**
- **"At stake" strip**: compute live `computeStandings` deltas and render owner points + rank movement. (All client‑side; you already recompute standings.)
- **Event timeline** component fed by the existing `/events` worker endpoint; color by team; markers for goal/card/sub/VAR.
- **Goals‑leader / points‑leader live tick** tied to goal events.
- Per‑state layouts (pre/live/HT/FT/ET/pens) via a small `heroState` discriminator.
- Loading + stale/error treatment (skeleton for events, a subtle "datos demorados" chip when `lastSync` is old).

**Ambitious / premium:**
- **Win‑probability bar** (API‑Football `/predictions`) + live xG if exposed.
- **Dedicated full match page** (lineups via `/fixtures/lineups`, full timeline, H2H, every affected participant, pot‑share simulator).
- **"Quiniela impact" mini‑sim**: "If it ends 1‑1, final table looks like →" with projected ranks/payouts.
- **Goal celebration moment** with team‑colored confetti/flash + optional sound, and a shareable result card.
- Multi‑match "live now" switcher when more than one game is in play.

---

## 4. Specific UI layout suggestions

**Live layout (desktop), top→bottom:**
```
┌───────────────────────────────────────────────┐
│            ● 2T 85'  (prominent, ticking)       │  ← state pill, bigger minute
│                                                 │
│  [crest]                1 – 1                [crest]
│  Brazil                                   Morocco
│  ⬤ Panchito · 12 pts ▲#2     ⬤ SITO · 9 pts ▼#3   │  ← OWNER + STAKE (new)
│                                                 │
│  ●━━━━━━━━━━━━━━━━━━━━○  55% Posesión 45%        │  ← always-on momentum bar (new)
│  ───────────────────────────────────────────   │
│  ⚽ 21' Saibari (MAR)   ⚽ 32' Vinícius (BRA)     │  ← scorers (tie to owner color)
│  📍 MetLife Stadium · New York/New Jersey        │  ← smaller caption
│  ▸ Estadísticas en vivo   |   Cronología  +      │  ← tabs inside expandable
└───────────────────────────────────────────────┘
```

Principles:
- **Three tiers of weight:** (1) score + minute, (2) teams + owners + stake, (3) everything else as captions or behind a tap.
- Give the **minute** real estate — it's the heartbeat. Consider it ticking live (interpolate seconds between polls) for a "real‑time" feel.
- Collapse competition/group/venue into one muted line; nobody glances for "Group C" mid‑match.
- The owner row is the quiniela layer — make it a first‑class tier, not a tiny chip.

**Mobile:** stack to two team rows (crest + name + owner + stake on each line, score centered between) — the same pattern you already adopted for match rows. The big 3‑column hero gets cramped at 360px; a vertical "FotMob card" reads better. Momentum bar full‑width. Stats/timeline as a segmented control, collapsed by default.

---

## 5. Specific interaction suggestions

- **Goal:** 600–900ms sequence — score scales up + glows in the scoring team's color, a "GOL" ribbon sweeps, scorer name + owner slides in, then settles. One‑shot, respects `prefers-reduced-motion`.
- **Minute ticking:** locally interpolate the clock between 20s polls so it never looks frozen (snap to server value on each poll).
- **Tap team / owner:** open that participant's standings row (or filter the table to them).
- **Tap match:** push to a full match page.
- **Tap a timeline marker:** popover with event detail (assist, card reason, VAR outcome).
- **Pull/scroll affordance:** if multiple live matches, a small dot pager or horizontal swipe between live heroes.
- **Stats:** default to a **1‑line momentum preview always visible**, with "ver más" expanding the full table — partially visible beats fully hidden for a command center.
- **Haptic/sound toggle** for goals (off by default), remembered in localStorage.

---

## 6. Data elements to add / remove

**Add (all available from API‑Football or already computed):**
- **Owner live stake:** points now, rank, and rank delta vs. pre‑match (from `computeStandings`).
- **Penalty shootout** scores (`score.penalty`).
- **Cards & subs & VAR** from `/events` (you only render goals today).
- **Lineups / formations** (`/fixtures/lineups`) — for the full match page.
- **Win probability / prediction** (`/predictions`) — premium.
- **Recent form (W/D/L) and H2H** — pre‑match build‑up.
- **"Affects N players"** count (how many participants own a team in this match).

**Remove / demote:**
- The repeated, full "FIFA World Cup 2026 · Group C" line — demote to a tiny caption; it's not glance‑worthy live.
- Redundant period text when the minute already conveys it (e.g., don't need both a long "2nd half" *and* "85'" at equal weight — pair them compactly).
- Stop spending the always‑visible zone on low‑value text while burying possession behind a tap.

---

## 7. Engineering implementation notes

- **State machine:** derive a single `heroPhase` = `pre | live | half | full | extra | pens | postponed` from `status.short` + clock, and render a `<HeroLive>` / `<HeroPre>` / `<HeroFinal>` variant. Today the logic is a long ternary chain in one component — it'll get unmaintainable as states grow. Extract `FeaturedMatch` into a thin shell + per‑phase subcomponents sharing a `HeroFrame` (background, crests, score slot).
- **Live data:** API‑Football is polling‑only, so keep the 20s cadence but (a) **pause polling when the hero isn't in the viewport** (IntersectionObserver) and when the tab is hidden, (b) drive a **lightweight "seconds" ticker** locally between polls. Consider bumping live polling to ~15s only while a match is in play, backing off otherwise.
- **Goal detection:** you already refetch events on score change — use that same signal to trigger the goal animation (diff previous vs current score in a ref).
- **Animations:** prefer CSS transforms/opacity (GPU‑friendly); gate everything behind `prefers-reduced-motion`. The "GOL" moment should be a single keyframed element, not a layout thrash.
- **Silk performance:** it allocates an `ImageData` every frame and loops pixels — fine on the card but wasteful. Pause it via IntersectionObserver when off‑screen; consider precomputing the noise or dropping to ~30fps. It's currently the heaviest thing on the page.
- **Loading/error/stale:** add a skeleton for the events row, and a subtle "resultados demorados" chip when `lastSync` is older than ~2 min or the worker returns an error (right now failures are invisible).
- **Reusability:** the momentum bar, event timeline, penalty dots, and "stake" chip should be standalone components reused on the full match page and the Partidos detail.
- **Data model:** add an optional `MatchEvent[]`/`lineups` cache keyed by fixtureId; you're refetching events inside the hero — lift to a small shared store so the match page reuses it.

---

## 8. Proposed "ideal hero" per state

**Pre‑match (T‑minus):**
- Big countdown (already good) + kickoff local time + stadium·city.
- Each side: crest, name, **owner**, recent form (●●●), and "owns this team."
- A one‑line "en juego" stake: "Brazil — Panchito · Morocco — SITO."
- Optional H2H / win‑probability bar.
- CTA feel: anticipation, not dead air.

**Live:**
- State pill with **ticking minute** front and center.
- Score dominant; scoring animations on change.
- Owner + live **points & rank delta** under each team.
- Always‑on momentum bar; scorers as a timeline; tap for full stats.
- "Afecta a N jugadores" micro‑label.

**Halftime:**
- "Medio tiempo" + **1T summary**: score, scorers so far, possession/shots snapshot (not hidden), and current stake standings. People check the table at HT — surface it.

**Full time:**
- Final score, **FT** clearly, full scorer list.
- **Result impact:** "Resultado: Panchito gana 3 pts; SITO sube a #2" — the payoff line.
- Quiet, settled styling (less motion); keep featured for the grace window (already done), then advance.

**Extra time:** like live but pill = "Prórroga 105'+", and note it's ET.

**Penalty shootout:**
- Aggregate score + **shootout dots** per team (●●○●), updating per kick.
- Scorer/misser of last kick highlighted.
- On decision: "Brasil avanza (4‑3 pen)" + impact line. This is peak drama — design it intentionally.

**Postponed / abandoned:** explicit state chip ("Aplazado") instead of a stuck countdown or false "live."

---

## 9. What the hero's purpose should be

**The hero is not a scoreboard — it's the live stakes engine of the quiniela.** Its one job: when a World Cup match is happening, instantly answer *"what's happening, and what does it mean for me and the pool?"* ESPN tells you the score; only this app can tell you that Morocco's equalizer just bumped SITO into the money and put Panchito's goals‑lead at risk. Lead with the match, but **always tie the match back to people, points, and payouts.** Everything else (lineups, deep stats, H2H) lives one tap away on a full match page. Make the hero the thing people keep open on a second screen during every game — not because it has the most data, but because it's the only place that makes *their* stake in the match feel alive.

---

### Bottom line
You've nailed the scoreboard. The leap from "nice" to "addictive" is one theme: **connect the live match to the quiniela stakes** — owner points, rank movement, the goals/points races, and a real goal moment. Do the quick wins (contrast, momentum bar, stake strip, goal flash, penalty dots) first; they're cheap and transform the feel. Then build the dedicated match page and per‑state layouts.
