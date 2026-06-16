# Corrections & Ground Truth — Prize Race Dashboard

**To: ChatGPT (advisory role).** You're acting as an outside design consultant on the **Quiniela Mundial 2026** app. You are **not** building it — a separate engineer is. Your Prize Race brief was strong on vision but made several assumptions that don't match the real app and its already‑agreed rules. Please **revise your plan** to fit the constraints below. Where you disagree, argue it, but build on these facts rather than around them.

The product goal driving this: **make each participant see, live, how much money they're currently winning** — that's the engagement hook. Optimize the design for "what am I winning right now, and what could I still win."

**Updated intent (important):** the organizer *wants* to **expand the payout to more winners** as an experiment — the theory is that more people with live money on the line = more people checking the app. The current 3‑prize model is the floor, not the target. They plan to try a wider split this tournament and, if players don't like spreading the money thin, **dial it back** (e.g. to ~5 winners, or back to 3). So the payout must be a **configurable preset the organizer can switch between (3 / 5 / 7 prizes), all percentage‑based, summing to 100%** — changeable without code edits. Design Track 2 as the real near‑term target, not a far‑future maybe.

---

## A. Hard facts about the current app (please treat as fixed)

1. **The prize model is already live and is 3 prizes, percentage‑based (not fixed dollars):**
   - **Champion: 7/12 ≈ 58.33%** of the pot — paid to the participant who **owns the team that wins the World Cup**.
   - **Most points: 5/24 ≈ 20.83%.**
   - **Most goals: 5/24 ≈ 20.83%** — based on **total goals scored by all teams a participant owns** (a "team‑pack" total), already tracked.
   - These are **percentages of a live pot** that grows as players pay in. Do **not** propose fixed dollar prizes (e.g. $1,200/$500/$300) — they only sum correctly at one exact pot value and break when the pot changes.

2. **There are no "picks."** Participants are assigned/own **teams** (individual mode) or **packages**. Therefore:
   - **"Champion pick" does not exist.** The champion prize goes to whoever *owns* the winning team. The dashboard should say *"va ganando: [owner of the best‑placed surviving team]"*, not treat champion as a user‑submitted prediction.
   - **"Golden Boot pick" does not exist** and would be a brand‑new game mechanic (each player predicts the tournament top scorer + we ingest the real Golden Boot result). It is **not** the same as our existing "most goals" prize. Don't list both as if they already exist.

3. **Tie‑break logic you proposed is already implemented.** Standings sort by **points, then goals**; a leader card shows **one** name unless players are tied on **both** points and goals. So that logic is done — what's missing is only the **label** ("Desempate por goles" / "Empate total"). Please treat tie‑break as a labeling/UX task, not new logic.

4. **Data we already have (free to use):** per‑participant `points`, `goals`; per‑team `stageReached` (so `teamsAlive` / `teamsEliminated` is derivable); `ownerMap` (team→owner); live `pot` and `amountCollected`; team flag colors.

5. **Data we do NOT have (would be new work):** `goldenBootPick` and its result; explicit runner‑up/3rd/4th prize logic; `maxPossiblePoints`; rank history / `previousRank` (no snapshots stored).

6. **The brief contradicts itself.** It says "don't redesign the whole app, only the dashboard," but the 7‑prize structure + Golden Boot picks + finalist/3rd/4th prizes is a **payout‑engine rewrite + two new game features + a new money agreement among 15 real players**. That's an epic, not a dashboard change. Please separate "dashboard presentation" from "prize‑rule changes" explicitly.

---

## B. Specific corrections to your plan

- **Drop fixed‑dollar prize amounts** → express every prize as a **% of the live pot**, render the live dollar value next to it.
- **Remove "Champion pick" / "Golden Boot pick" as existing prizes.** Reframe champion as ownership‑based. Treat Golden Boot pick as an *optional future feature*, clearly labeled as net‑new.
- **De‑duplicate goals:** we have exactly one goals prize ("most goals," team‑pack). Don't also propose a separate goals‑pick prize unless explicitly designing the future epic.
- **Don't put `maxPossiblePoints` in the table** — it requires simulating all remaining fixtures per team and is misleading. If you want an "upside" signal, use **equipos vivos** (teams still alive) as the lightweight proxy.
- **Cap the top card row at 4** (mobile‑first, 15 players). Don't grow to 9 cards. Recommend exactly which 4.
- **Tie‑break = labels only**, since the logic exists.

---

## C. What to keep from your brief (it's good)

- The **"Premios en juego" / Carrera por premios** section concept — a per‑prize row with name, amount, current leader/eligible, and a status chip (**activo / empatado / por definirse**). This is the centerpiece; keep it.
- **Tie‑break notes** in Spanish ("Desempate por goles," "Empate total").
- **Equipos vivos / eliminados** context.
- **Movement arrows** (▲▼–) — acceptable, but note it needs a stored rank snapshot (small new piece).
- Your **Spanish label set** — polished and usable.
- The **component decomposition** (PrizeRace → PrizeCard, LeaderCard, etc.) — sound; just align names to existing components (`StatCard`, `LeaderCard`, `StandingRow`, `PotCard`).

---

## D. Please revise your plan into TWO explicit tracks

**Track 1 — "Lean Prize Race" (no rule change, fits current data).** Design only this in detail:
- Top 4 cards: **Bote** (with collected/owed), **Premio Campeón** (% + live $ + who's winning it / "por definirse"), **Líder de puntos** (+ tie‑break note), **Líder de goles** (+ tie‑break note).
- A **"Premios en juego"** section with the **3 real prizes** as rows (Campeón / Puntos / Goles): %, live $, current leader, status chip.
- **Equipos vivos** on standings rows; tie‑break badges where relevant.
- Keep everything **percentage‑driven and pot‑scaling**.

**Track 2 — "Expanded Prize Game" (near‑term target — design this in detail too).** The organizer wants to run a wider payout this tournament and be able to dial it back. Design it as **configurable payout presets**:

- **Preset selector (organizer setting): 3 / 5 / 7 winners**, each a set of percentages **summing to 100%**. Switching preset must not require code — it's a config value (extend the existing `scoring.payout` object). Recommend the actual percentage splits for each preset (see questions).
- **Strongly prefer prizes that need NO new game mechanic**, so the expansion is buildable now and easy to run. We can reach **6 prizes using only ownership + data we already have**:
  1. **Campeón** — owns the World Cup winner.
  2. **Subcampeón** — owns the team that lost the final (derive from `stageReached` = reached final but not champion).
  3. **Tercer lugar** — owns the 3rd‑place match winner.
  4. **Cuarto lugar** — owns the 3rd‑place match loser.
  5. **Más puntos** — most accumulated points (exists).
  6. **Más goles** — most team‑pack goals (exists).
  - **Golden Boot pick is the ONLY proposed prize that needs a new feature** (a per‑player striker prediction + ingesting the official result). Treat it as **optional / last** — the 5‑ and 7‑prize presets should be achievable **without** it. Only include it if the organizer explicitly wants the extra pick game.
- **Suggested presets (you refine the exact %):**
  - **3 (current):** Campeón / Más puntos / Más goles.
  - **5:** Campeón / Subcampeón / Más puntos / Más goles / Tercer lugar.
  - **7:** the six ownership/stat prizes above + (optionally) Bota de Oro pick, OR split one prize (e.g. add Cuarto lugar) to avoid the pick.
- **Knockout‑dependent prizes show "por definirse"** until the bracket resolves (Subcampeón/3rd/4th aren't known until the final weekend). The dashboard must handle that gracefully.
- Note the one human dependency: **the 15 players should agree to the wider split** before it's switched on — but the *engine and dashboard* should be built and configurable now so the organizer can flip presets freely.

---

## E. Questions for you to answer in your revision

1. Recommend the exact **percentage splits for all three presets (3 / 5 / 7)**, each summing to 100%, designed so that across presets **Champion stays clearly the biggest** and **Más puntos still feels major** (it shouldn't shrink to a token). Show the live dollar value of each at a USD 2,350 pot. Favor splits that work **without** the Golden Boot pick.
2. For the **Premio Campeón** card *before* the final is decided, what's the best "who's winning it" proxy — owner of the highest‑seeded surviving team, owner with the most teams still alive, or simply "por definirse"? Argue the most motivating choice.
3. How should the **status chip** logic decide **activo vs por definirse vs empatado** for each prize, precisely?
4. For **movement arrows**, what snapshot cadence (per match? daily?) gives a meaningful "▲ since last update" without noise?
5. Anything in Track 1 you'd cut to keep it from feeling crowded on a phone?

Please return a revised plan structured as **Track 1 (detailed, build‑ready against the facts above)** and **Track 2 (epic outline + open decisions)**, keeping all money as **percentages of the live pot**.
