# Dashboard "Prize Race" — Audit of the Proposed Plan

_Reviewing the ChatGPT brief to turn the dashboard command center into a live Prize Race Dashboard, against the real codebase and the prize rules your group is already using. Direct and critical, as requested._

---

## Verdict up front

The **strategic intent is excellent and on-brand**: multiple prize paths, transparency ("why is this person leading"), a "Premios en juego" race, and tie‑break clarity. That's exactly the non‑winner‑takes‑all feel we've been building toward, and several pieces are cheap wins.

**But the brief quietly contradicts itself.** It says "do not redesign the whole app, only the dashboard," yet the core of it — a **7‑prize structure with Golden Boot picks and runner‑up/3rd/4th team prizes** — is *not* a dashboard change. It's a rewrite of your **payout engine**, plus **two brand‑new game mechanics** (a per‑player Golden Boot pick, and finalist/3rd/4th prizes), plus the **money agreement among your 15 players**. You can't render prize cards for prizes the game doesn't actually award.

So the real decision isn't "how should the dashboard look" — it's **"are we changing the prize rules from 3 prizes to 7?"** Everything else follows from that. My recommendation: **keep your current 3‑prize model** (it's live, your players know it, and it scales with the pot), and build a **lean Prize Race section around the prizes that actually exist** — which delivers ~80% of the excitement with ~20% of the work and zero rule renegotiation. Details below.

---

## Reality check: plan vs. your actual app

| Plan element | Status in your app | Verdict |
|---|---|---|
| Champion prize | ✅ Exists (owner of the winning team, 7/12 ≈ 58.3%) | Keep |
| Most points prize | ✅ Exists (5/24 ≈ 20.8%) | Keep |
| Most goals prize | ✅ Exists (team‑pack goals, 5/24 ≈ 20.8%) | Keep |
| Points→goals tie‑break, show one unless tied on both | ✅ **Already implemented** (`rankStandings`, leader cards) | Done; just add the badges |
| `teamsAlive` / `teamsEliminated` | ✅ Derivable now from `stageReached` | Cheap win |
| Tie‑break labels ("Desempate por goles" / "Empate total") | ❌ Not shown yet | Cheap win |
| **Golden Boot pick** prize ($150) | ❌ No such mechanic — we reward *team‑pack* goals, not a predicted top scorer | New feature: needs a pick UI + the real Golden Boot result |
| **Runner‑up / 3rd / 4th** team prizes | ⚠️ Partially derivable from `stageReached` (lost final = runner‑up; 3rd‑place match) | New payout rules + admin |
| Fixed dollar prizes ($1200/500/…) | ❌ Your pot is **percentage‑based and scales** with players/payments | Keep percentages, not fixed $ |
| `maxPossiblePoints` | ❌ Requires simulating every remaining match per owned team | Heavy + easy to mislead; skip or approximate |
| `previousRank` / movement arrows | ❌ No history stored | Medium: needs a periodic rank snapshot |
| `championPick` / `championPickStatus` | ❌ There's no "pick" — it's whoever **owns** the eventual champion | Reframe: "tu equipo campeón" = your highest‑seeded alive team, not a pick |

**Two things the plan double‑counts / invents:**
- It lists **"Most goals" ($300)** *and* **"Golden Boot pick" ($150)** as separate prizes. Those are different games (accumulated team goals vs. predict‑the‑top‑scorer). You only have the first. Adding the second is a real feature, not a card.
- **"Champion pick"** implies players choose a champion. In your model nobody picks a champion — they own teams, and whoever owns the team that wins the cup takes the champion prize. The dashboard should say *"va ganando: [owner of the best‑placed alive team]"*, not treat it as a submitted pick.

---

## 1. UX audit of the current dashboard

**Working:** clean 4‑card row (Bote / Jugadores / Líder de puntos / Líder de goles), tie‑aware leaders, a pot progress bar with amount owed, and an expandable standings table with per‑team stats. It's already more honest than most pools.

**Missing (the plan is right here):**
- The dashboard shows *who's on top* but not **what's being contested**. A newcomer can't see "there are 3 ways to win and here's who's winning each."
- No **"still alive"** context — how many of my teams survive.
- No **"why"** on the leader (tie‑break reason).
- No sense of the **pot split** (how the money is divided).

**What users must grasp in 3 seconds:** (1) the pot and how it's split, (2) who's winning each prize right now, (3) am I still in it. That's the whole job.

## 2. Recommended card structure (lean)

Keep it to **4 cards**, don't grow to 9. Replace the generic pair with prize‑framed cards:
- **Bote** (with collected/owed bar) — keep.
- **Premio Campeón** — amount + "va ganando: [owner of best‑placed alive team]" (or "por definirse").
- **Líder de puntos** — leader(s) + pts + tie‑break badge.
- **Líder de goles** — leader(s) + goals + tie‑break badge.

Drop "Jugadores" from the top row (move the count into the standings header) to make room for **Premio Campeón**, which is the headline prize and currently invisible.

## 3. Prize Race section ("Premios en juego")

A compact section *below* the cards: one row per **real** prize. For the 3‑prize model:

```
PREMIOS EN JUEGO
🏆 Campeón        58%  ~USD 1,371   va ganando: —            [por definirse]
🎯 Más puntos     21%  ~USD 490     GREG · 5 pts             [activo]
⚽ Más goles      21%  ~USD 490     GREG · 6 goles           [activo]
```

Each `PrizeCard`: name, % of pot (and live $ amount), current leader/eligible, and a status chip: **activo** (being contested with a clear leader), **empatado** (tie), **por definirse** (not decided yet, e.g. champion before the final). This is the single most valuable addition and it's mostly presentational — no rule changes.

*(If you later expand to 7 prizes, this same grid just gets more rows — but only after the payout engine + picks exist.)*

## 4. Tie‑breaker logic (you already have most of this)

Your `computeStandings` already sorts by points then goals, and `rankStandings` only ties people when **both** match. The plan's rule == your code. What's missing is the **label**:

```ts
function leaderCardModel(standings) {
  const sorted = [...standings].sort((a,b) =>
    b.points - a.points || b.goals - a.goals);
  if (!sorted.length || sorted[0].points === 0) return { names: [], note: null };
  const top = sorted[0];
  const tiedPts = sorted.filter(s => s.points === top.points);
  if (tiedPts.length === 1) return { names: [top.name], note: null };
  const tiedBoth = tiedPts.filter(s => s.goals === top.goals);
  return tiedBoth.length === 1
    ? { names: [tiedBoth[0].name], note: "Desempate por goles" } // one wins on goals
    : { names: tiedBoth.map(s => s.name), note: "Empate total" };  // truly tied
}
```
- **Goals leader card:** same idea, tie‑break by total points (or just show all tied — goals is the terminal metric).
- **Table ordering:** points → goals → (stable). Already done.
- **Display:** show the tie‑break note as a small caption/badge under the value.

## 5. Classification table improvements (keep it calm)

You already expand each row to a full MP/W/D/L/GF/GA/GD/Pts table. Add only:
- **Equipos vivos**: "3 vivos · 1 eliminado" (free from `stageReached`).
- **Tie‑break note** on tied rows ("desempate por goles").
- **Movement arrow** (▲▼–) *if* we add a rank snapshot (medium effort).

Skip `maxPossiblePoints` on the table — it's speculative and clutters. If you want a "potential" signal, a lighter proxy is "equipos vivos" (more alive = more upside).

## 6. Spanish labels (polished)

Bote actual · Premio Campeón · Líder de puntos · Líder de goles · Más goles · Bota de Oro¹ · Subcampeón¹ · Tercer lugar¹ · Cuarto lugar¹ · Equipos vivos · Equipos eliminados · Desempate por goles · Empate total · Premios en juego · Carrera por premios · Mejor posicionado · Máximo potencial · Por definirse · Activo · Empatado.
_¹ only if you adopt the 7‑prize model._

## 7. Component plan (aligned to what exists)

- `PrizeRace` (section) → maps over real prizes → `PrizeCard`.
- `PrizeCard` props: `{ key, label, pct, amount, leaderName | null, status: 'active'|'tied'|'pending', icon }`.
- Keep existing `LeaderCard` (extend with a `note` prop for the tie‑break badge), `PotCard`, `StandingRow`.
- `TieBreakerBadge` props: `{ kind: 'goals' | 'tie' }`.
- Reuse `ownerMap`, `computeStandings`, `rankStandings`, `amountCollected`, `teamColor`. No new infra for the lean version.

## 8. Data model (map to reality)

You already have: `points`, `goals` (per standing), `stageReached` per team → `teamsAlive/eliminated`, `ownerMap`, pot/collected.
**Add only if expanding:** `goldenBootPick` (+ result), finalist/3rd/4th derivation from `stageReached`, and a stored `rankSnapshot` (for movement). **Avoid** `maxPossiblePoints` unless you accept it's an estimate.
For prizes, your config is already `scoring.payout = { champion, points, goals }` (percentages). Keep that shape; if expanding, extend it to `{ champion, points, goals, goldenBoot, runnerUp, third, fourth }` summing to 1 — **not fixed dollars.**

## 9. Visual hierarchy

- **Most prominent:** Bote + Premio Campeón (the money).
- **Secondary:** points/goals leaders with tie‑break notes.
- **Expandable:** the full standings table (already is) and per‑prize eligibility detail.
- **Color/badges:** gold for champion, primary for active leaders, muted for "por definirse"; status chips, not walls of text.
- **Mobile:** 2‑col card grid (already), prize race as stacked rows, everything scales — no horizontal overflow.

## 10. Final recommendation

**Build the lean Prize Race now; defer the 7‑prize expansion as a separate, explicit project.**

Do now (1 pass, no rule change, fits the data):
1. Swap "Jugadores" card → **Premio Campeón** (amount + who's winning it / "por definirse").
2. Add **tie‑break badges** to the leader cards ("Desempate por goles" / "Empate total").
3. Add a **"Premios en juego"** section: 3 prize rows (Campeón / Puntos / Goles) with %, live $, leader, and status chip.
4. Add **"equipos vivos"** to standings rows.

Decide separately (because it changes the money + needs new features + player buy‑in):
- Expanding to **7 prizes** (Golden Boot pick, runner‑up/3rd/4th). This needs: a payout‑percentage redesign, a Golden Boot **pick** mechanic (UI + result entry), finalist/3rd/4th derivation, and — most importantly — **your 15 players agreeing to the new split.** It's a good direction, but it's a feature epic, not a dashboard tweak.

The lean version makes the dashboard feel like a live prize race **today**, honestly reflects the rules everyone already agreed to, and scales with the pot. If you want the full 7‑prize game, let's scope it as its own build with the money rules locked first.
