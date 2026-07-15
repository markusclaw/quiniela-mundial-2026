import type {
  Participant,
  PayoutPresetId,
  PoolState,
  PrizeType,
  ScoringConfig,
  Stage,
  TeamResult,
} from "@/lib/types";
import { getTeam } from "@/lib/data/teams";

export const DEFAULT_SCORING: ScoringConfig = {
  groupWin: 3,
  groupDraw: 1,
  advance: 5, // reach Round of 32
  r16: 8,
  qf: 13,
  sf: 21,
  final: 34,
  champion: 55,
  underdogMultiplier: 1.5, // Pot 3 & 4 teams on knockout milestones
  // Legacy 3-way split, kept for back-compat. The live engine now reads
  // `payoutPreset` (below) via PAYOUT_PRESETS instead.
  payout: {
    champion: 7 / 12, // ≈ 0.5833 — owner of the World Cup winner
    points: 5 / 24, // ≈ 0.2083 — most points overall
    goals: 5 / 24, // ≈ 0.2083 — most goals scored overall
  },
  // How many winners share the pot. Default to the 5-prize preset; the
  // organizer can switch between 3 / 5 / 7 in Admin → Settings.
  payoutPreset: "five",
  // Champion takes a flat $1,200 off the top; the rest of the pot is split
  // among the other prizes by their relative weights. Set to 0 in Admin to
  // make the champion a pure percentage instead.
  championFixed: 1200,
};

/**
 * A single payable prize: which kind, and what fraction of the pot it takes.
 * Each preset's fractions sum to 1.
 */
export interface PrizeDef {
  type: PrizeType;
  pct: number; // fraction of the pot (0–1)
}

/**
 * Configurable payout presets. Every preset sums to 1 (100% of the pot).
 * - three: the original model (champion-heavy, points & goals).
 * - five  (default): adds Subcampeón + Tercer lugar — more winners, champion
 *   still clearly the biggest, points still a major prize.
 * - seven: adds Cuarto lugar + Mayor supervivencia for the widest spread.
 * All prizes here are derivable from data we already track (no picks).
 */
export const PAYOUT_PRESETS: Record<PayoutPresetId, PrizeDef[]> = {
  three: [
    { type: "champion", pct: 7 / 12 }, // 58.33%
    { type: "most_points", pct: 5 / 24 }, // 20.83%
    { type: "most_goals", pct: 5 / 24 }, // 20.83%
  ],
  // Official structure — at a $2,350 pot these resolve to:
  // Champion $1,200 · Most points $600 · Most goals $300 · 2nd points $150 ·
  // Bota de Oro $100. (Champion is the fixed prize; the rest scale with the pot.)
  five: [
    { type: "champion", pct: 1200 / 2350 }, // ≈ 51%
    { type: "most_points", pct: 600 / 2350 }, // ≈ 26%
    { type: "most_goals", pct: 300 / 2350 }, // ≈ 13%
    { type: "second_points", pct: 150 / 2350 }, // ≈ 6%
    { type: "golden_boot", pct: 100 / 2350 }, // ≈ 4%
  ],
  seven: [
    { type: "champion", pct: 0.4 },
    { type: "most_points", pct: 0.23 },
    { type: "most_goals", pct: 0.15 },
    { type: "runner_up", pct: 0.1 },
    { type: "third_place", pct: 0.05 },
    { type: "fourth_place", pct: 0.04 },
    { type: "survival", pct: 0.03 },
  ],
};

/** Which preset is active for this pool (default: five). */
export function activePresetId(state: PoolState): PayoutPresetId {
  return state.scoring.payoutPreset ?? "five";
}

/** The prize list for the pool's active preset. */
export function activePrizes(state: PoolState): PrizeDef[] {
  return PAYOUT_PRESETS[activePresetId(state)];
}

// Ordering of knockout stages for "did the team reach at least X" checks.
const STAGE_ORDER: Stage[] = [
  "group",
  "r32",
  "r16",
  "qf",
  "sf",
  "final",
  "champion",
];

function reachedAtLeast(reached: Stage, target: Stage): boolean {
  if (reached === "eliminated") return false;
  return STAGE_ORDER.indexOf(reached) >= STAGE_ORDER.indexOf(target);
}

export interface TeamPointsBreakdown {
  teamId: string;
  groupPoints: number;
  knockoutPoints: number;
  total: number;
  isUnderdog: boolean;
  multiplierApplied: boolean;
}

/** Points a single owned team has earned so far. */
export function teamPoints(
  result: TeamResult,
  scoring: ScoringConfig,
): TeamPointsBreakdown {
  const team = getTeam(result.teamId);
  const isUnderdog = team ? team.pot >= 3 : false;
  const mult = isUnderdog ? scoring.underdogMultiplier : 1;

  const groupPoints =
    result.groupWins * scoring.groupWin + result.groupDraws * scoring.groupDraw;

  let knockout = 0;
  if (reachedAtLeast(result.stageReached, "r32")) knockout += scoring.advance;
  if (reachedAtLeast(result.stageReached, "r16")) knockout += scoring.r16;
  if (reachedAtLeast(result.stageReached, "qf")) knockout += scoring.qf;
  if (reachedAtLeast(result.stageReached, "sf")) knockout += scoring.sf;
  if (reachedAtLeast(result.stageReached, "final")) knockout += scoring.final;
  if (reachedAtLeast(result.stageReached, "champion"))
    knockout += scoring.champion;

  const knockoutPoints = Math.round(knockout * mult);

  return {
    teamId: result.teamId,
    groupPoints,
    knockoutPoints,
    total: groupPoints + knockoutPoints,
    isUnderdog,
    multiplierApplied: isUnderdog && knockout > 0,
  };
}

/** Knockout stages that award points, in the order they're reached. */
export const KO_STAGES = ["r32", "r16", "qf", "sf", "final", "champion"] as const;
export type KoStage = (typeof KO_STAGES)[number];

/**
 * Points a team earned at each individual knockout stage, decomposed so the
 * values sum EXACTLY to its knockoutPoints.
 *
 * The underdog multiplier applies to the running knockout total and is rounded
 * once (see teamPoints), so each stage's share is the delta of the rounded
 * running total. Rounding each stage independently would not add up — e.g. a
 * Pot-3 team reaching the QF would render 8+12+20=40 against a real total of 39.
 * Stages the team never reached are null.
 */
export function knockoutStagePoints(
  result: TeamResult,
  scoring: ScoringConfig,
): Record<KoStage, number | null> {
  const team = getTeam(result.teamId);
  const mult = team && team.pot >= 3 ? scoring.underdogMultiplier : 1;
  const milestone: Record<KoStage, number> = {
    r32: scoring.advance,
    r16: scoring.r16,
    qf: scoring.qf,
    sf: scoring.sf,
    final: scoring.final,
    champion: scoring.champion,
  };
  const out = {} as Record<KoStage, number | null>;
  let raw = 0;
  let prevRounded = 0;
  KO_STAGES.forEach((st) => {
    if (!reachedAtLeast(result.stageReached, st)) {
      out[st] = null;
      return;
    }
    raw += milestone[st];
    const rounded = Math.round(raw * mult);
    out[st] = rounded - prevRounded;
    prevRounded = rounded;
  });
  return out;
}

export interface ParticipantStanding {
  participant: Participant;
  teamBreakdowns: TeamPointsBreakdown[];
  teamPointsTotal: number;
  totalPoints: number;
  totalGoals: number; // goals scored by all owned teams
  potShare: number; // currency owed so far
  rank: number;
}

/** Total goals scored by all teams a participant owns. */
export function participantGoals(p: Participant, state: PoolState): number {
  return ownedTeamIds(p, state).reduce(
    (sum, tid) => sum + (state.results[tid]?.goalsFor ?? 0),
    0,
  );
}

/**
 * Assign competition ranks (1,1,3,…) to an already-sorted list. Players are
 * only truly tied when both points AND goals match (goals break a points tie).
 */
export function rankStandings(
  list: ParticipantStanding[],
): { s: ParticipantStanding; rank: number }[] {
  let lastKey: string | null = null;
  let lastRank = 0;
  return list.map((s, i) => {
    const key = `${s.totalPoints}|${s.totalGoals}`;
    const rank = lastKey !== null && key === lastKey ? lastRank : i + 1;
    lastKey = key;
    lastRank = rank;
    return { s, rank };
  });
}

/** Team ids owned by a participant — works in every distribution mode. */
export function ownedTeamIds(p: Participant, state: PoolState): string[] {
  if (state.settings.distributionMode === "individual") {
    const owners = state.teamOwners ?? {};
    return Object.keys(owners).filter((tid) => owners[tid] === p.id);
  }
  const pkg = state.packages.find((k) => k.id === p.packageId);
  return pkg?.teamIds ?? [];
}

/** What a participant has paid in, per the active mode. */
export function participantBuyIn(p: Participant, state: PoolState): number {
  if (state.settings.distributionMode === "individual") {
    return ownedTeamIds(p, state).length * state.settings.teamPrice;
  }
  const pkg = state.packages.find((k) => k.id === p.packageId);
  return pkg ? pkg.buyIn : 0;
}

/** Map of teamId -> owner participant name (active mode aware). */
export function ownerMap(state: PoolState): Record<string, string> {
  const map: Record<string, string> = {};
  if (state.settings.distributionMode === "individual") {
    const owners = state.teamOwners ?? {};
    for (const tid of Object.keys(owners)) {
      const p = state.participants.find((x) => x.id === owners[tid]);
      if (p) map[tid] = p.name;
    }
    return map;
  }
  for (const p of state.participants) {
    if (!p.packageId) continue;
    const pkg = state.packages.find((k) => k.id === p.packageId);
    pkg?.teamIds.forEach((tid) => (map[tid] = p.name));
  }
  return map;
}

/** Total pot = sum of every participant's buy-in. */
export function totalPot(state: PoolState): number {
  return state.participants.reduce(
    (sum, p) => sum + participantBuyIn(p, state),
    0,
  );
}

/** How much money has actually been collected so far (paid buy-ins). */
export function amountCollected(state: PoolState): number {
  const individual = state.settings.distributionMode === "individual";
  const price = state.settings.teamPrice;
  return state.participants
    .filter((p) => !p.isModerator)
    .reduce((sum, p) => {
      if (individual) {
        const owned = new Set(ownedTeamIds(p, state));
        const paid =
          (p.paidTeams ?? []).filter((id) => owned.has(id)).length * price;
        return sum + paid;
      }
      return sum + (p.paid ? participantBuyIn(p, state) : 0);
    }, 0);
}

/** The participant who owns a given team, if any (active mode aware). */
export function ownerOfTeamId(state: PoolState, teamId: string): string | null {
  const owner = state.participants.find((p) =>
    ownedTeamIds(p, state).includes(teamId),
  );
  return owner?.id ?? null;
}

/** The participant who owns the team that won the World Cup, if decided. */
export function championOwnerId(state: PoolState): string | null {
  const teamId = Object.values(state.results).find(
    (r) => r.stageReached === "champion",
  )?.teamId;
  return teamId ? ownerOfTeamId(state, teamId) : null;
}

/** Owner of the team that reached the final but did NOT win (runner-up). */
function runnerUpOwnerId(state: PoolState): string | null {
  const teamId = Object.values(state.results).find(
    (r) => r.stageReached === "final",
  )?.teamId;
  return teamId ? ownerOfTeamId(state, teamId) : null;
}

/** Owner of the third-place-match winner / loser, once that match is played. */
function placeOwnerId(
  state: PoolState,
  key: "thirdPlace" | "fourthPlace",
): string | null {
  const teamId = Object.values(state.results).find((r) => r[key])?.teamId;
  return teamId ? ownerOfTeamId(state, teamId) : null;
}

/**
 * Whether a team is out of the tournament. `stageReached` always records the
 * FURTHEST round a team reached (so its points are preserved even after it
 * loses); this flag is what says it's actually been knocked out. Backwards
 * compatible with older data that only set stageReached === "eliminated".
 */
export function isTeamEliminated(r: TeamResult | undefined | null): boolean {
  if (!r) return false;
  if (r.stageReached === "champion") return false;
  return r.eliminated === true || r.stageReached === "eliminated";
}

/** How many of a participant's teams are still alive in the tournament. */
export function teamsAlive(p: Participant, state: PoolState): number {
  return ownedTeamIds(p, state).filter((tid) => {
    const r = state.results[tid];
    if (!r) return false;
    return reachedAtLeast(r.stageReached, "r32") && !isTeamEliminated(r);
  }).length;
}

export type PrizeStatus = "active" | "tied" | "pending";

export interface ResolvedPrize {
  type: PrizeType;
  pct: number;
  amount: number; // live currency value (round(pot * pct))
  winnerIds: string[];
  winnerNames: string[];
  status: PrizeStatus;
}

interface ParticipantTotal {
  participant: Participant;
  teamBreakdowns: TeamPointsBreakdown[];
  teamPointsTotal: number;
  totalPoints: number;
  totalGoals: number;
}

/** Per-participant points + goals (the common base for ranking & prizes). */
function participantTotals(state: PoolState): ParticipantTotal[] {
  return state.participants.map((participant) => {
    const teamBreakdowns = ownedTeamIds(participant, state)
      .map((tid) => state.results[tid])
      .filter(Boolean)
      .map((r) => teamPoints(r, state.scoring));
    const teamPointsTotal = teamBreakdowns.reduce((a, b) => a + b.total, 0);
    return {
      participant,
      teamBreakdowns,
      teamPointsTotal,
      totalPoints: teamPointsTotal,
      totalGoals: participantGoals(participant, state),
    };
  });
}

/** All participants tied at the (positive) top of a metric. */
function leadersByMetric(
  base: ParticipantTotal[],
  sel: (st: ParticipantTotal) => number,
): string[] {
  const top = Math.max(0, ...base.map(sel));
  return top > 0
    ? base.filter((st) => sel(st) === top).map((st) => st.participant.id)
    : [];
}

/**
 * Leaders of a metric with a secondary tiebreaker — e.g. most points, with
 * goals breaking ties (matching the standings sort). A player only ends up
 * sharing the prize when tied on BOTH the primary and secondary metric.
 */
function leadersWithTiebreak(
  base: ParticipantTotal[],
  primary: (st: ParticipantTotal) => number,
  secondary: (st: ParticipantTotal) => number,
): string[] {
  const top = Math.max(0, ...base.map(primary));
  if (top <= 0) return [];
  const pool = base.filter((st) => primary(st) === top);
  const sec = Math.max(...pool.map(secondary));
  return pool.filter((st) => secondary(st) === sec).map((st) => st.participant.id);
}

/**
 * The currency value of each active prize, before rounding.
 *
 * Normally every prize takes its preset percentage of the pot. But if a fixed
 * champion prize is configured (`scoring.championFixed > 0`), the champion
 * takes that flat amount off the top (capped at the pot) and the remaining pot
 * is split among the other prizes in proportion to their preset weights.
 */
function prizeAmounts(state: PoolState): { type: PrizeType; amount: number }[] {
  const pot = totalPot(state);
  const prizes = activePrizes(state);
  const fixed = state.scoring.championFixed ?? 0;
  const hasChampion = prizes.some((p) => p.type === "champion");

  if (fixed > 0 && hasChampion) {
    const champAmount = Math.min(fixed, pot);
    const remaining = Math.max(0, pot - champAmount);
    const others = prizes.filter((p) => p.type !== "champion");
    const weight = others.reduce((sum, p) => sum + p.pct, 0) || 1;
    return prizes.map((p) =>
      p.type === "champion"
        ? { type: p.type, amount: champAmount }
        : { type: p.type, amount: remaining * (p.pct / weight) },
    );
  }
  return prizes.map((p) => ({ type: p.type, amount: pot * p.pct }));
}

/**
 * Resolve the active preset's prizes into live winners + dollar amounts.
 * Knockout-dependent prizes (champion / runner-up / 3rd / 4th) are "pending"
 * until the bracket decides them; metric prizes (points / goals / survival)
 * are awarded provisionally to the current leader(s) and marked "tied" when
 * more than one player shares the top.
 */
export function resolvePrizes(state: PoolState): ResolvedPrize[] {
  const pot = totalPot(state);
  const base = participantTotals(state);
  const amounts = prizeAmounts(state);
  const nameOf = (id: string) =>
    state.participants.find((p) => p.id === id)?.name ?? "";

  const winnersFor = (type: PrizeType): string[] => {
    switch (type) {
      case "champion": {
        const id = championOwnerId(state);
        return id ? [id] : [];
      }
      case "runner_up": {
        const id = runnerUpOwnerId(state);
        return id ? [id] : [];
      }
      case "third_place": {
        const id = placeOwnerId(state, "thirdPlace");
        return id ? [id] : [];
      }
      case "fourth_place": {
        const id = placeOwnerId(state, "fourthPlace");
        return id ? [id] : [];
      }
      case "most_points":
        return leadersWithTiebreak(
          base,
          (st) => st.totalPoints,
          (st) => st.totalGoals,
        );
      case "second_points": {
        // The 2nd tier in the points standings (points, then goals). Ties at
        // 2nd split; only counts once someone is actually behind a positive
        // leader.
        const ranked = base
          .filter((st) => st.totalPoints > 0)
          .sort(
            (a, b) => b.totalPoints - a.totalPoints || b.totalGoals - a.totalGoals,
          );
        if (!ranked.length) return [];
        const key = (st: ParticipantTotal) => `${st.totalPoints}|${st.totalGoals}`;
        const topKey = key(ranked[0]);
        const second = ranked.find((st) => key(st) !== topKey);
        if (!second) return [];
        const secondKey = key(second);
        return ranked
          .filter((st) => key(st) === secondKey)
          .map((st) => st.participant.id);
      }
      case "golden_boot": {
        const teamId = state.goldenBootTeamId;
        const id = teamId ? ownerOfTeamId(state, teamId) : null;
        return id ? [id] : [];
      }
      case "most_goals":
        return leadersWithTiebreak(
          base,
          (st) => st.totalGoals,
          (st) => st.totalPoints,
        );
      case "survival":
        return leadersByMetric(base, (st) => teamsAlive(st.participant, state));
      default:
        return [];
    }
  };

  return amounts.map(({ type, amount }) => {
    const winnerIds = winnersFor(type);
    const status: PrizeStatus =
      winnerIds.length === 0
        ? "pending"
        : winnerIds.length > 1
          ? "tied"
          : "active";
    const rounded = Math.round(amount);
    return {
      type,
      // Effective share of the pot (so a fixed champion shows its real %).
      pct: pot > 0 ? amount / pot : 0,
      amount: rounded,
      winnerIds,
      winnerNames: winnerIds.map(nameOf),
      status,
    };
  });
}

/**
 * Standings + live pot shares. Each participant's `potShare` is the sum of
 * every active-preset prize they're currently winning (split evenly on ties).
 */
export function computeStandings(state: PoolState): ParticipantStanding[] {
  const base = participantTotals(state);

  // Rank by points, then break ties by goals scored.
  const sorted = [...base].sort(
    (a, b) => b.totalPoints - a.totalPoints || b.totalGoals - a.totalGoals,
  );

  const shares: Record<string, number> = {};
  for (const prize of resolvePrizes(state)) {
    if (!prize.winnerIds.length) continue;
    const each = prize.amount / prize.winnerIds.length;
    for (const id of prize.winnerIds) shares[id] = (shares[id] ?? 0) + each;
  }

  return sorted.map((st, i) => ({
    ...st,
    potShare: Math.round(shares[st.participant.id] ?? 0),
    rank: i + 1,
  }));
}
