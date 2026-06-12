import type {
  Participant,
  PoolState,
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
  // Three payouts (must sum to 1): champion 7/12, most points 5/24, most
  // goals 5/24 — i.e. the winner takes ~58.3%, and the remaining ~41.7% is
  // split evenly between the most-points and most-goals winners.
  payout: {
    champion: 7 / 12, // ≈ 0.5833 — owner of the World Cup winner
    points: 5 / 24, // ≈ 0.2083 — most points overall
    goals: 5 / 24, // ≈ 0.2083 — most goals scored overall
  },
};

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
 * Assign competition ranks (1,1,3,…) to an already points-sorted list, so tied
 * players share the same rank.
 */
export function rankStandings(
  list: ParticipantStanding[],
): { s: ParticipantStanding; rank: number }[] {
  let lastPts: number | null = null;
  let lastRank = 0;
  return list.map((s, i) => {
    const rank = lastPts !== null && s.totalPoints === lastPts ? lastRank : i + 1;
    lastPts = s.totalPoints;
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

/** The participant who owns the team that won the World Cup, if decided. */
export function championOwnerId(state: PoolState): string | null {
  const championTeamId = Object.values(state.results).find(
    (r) => r.stageReached === "champion",
  )?.teamId;
  if (!championTeamId) return null;
  const owner = state.participants.find((p) =>
    ownedTeamIds(p, state).includes(championTeamId),
  );
  return owner?.id ?? null;
}

/**
 * Two payouts: the champion's owner gets the champion share; the participant
 * with the most points gets the points share. (One person can win both.)
 */
export function computeStandings(state: PoolState): ParticipantStanding[] {
  const s = state.scoring;
  const pot = totalPot(state);

  const base = state.participants.map((participant) => {
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

  const sorted = [...base].sort((a, b) => b.totalPoints - a.totalPoints);
  const champId = championOwnerId(state);

  // Everyone tied for the top total splits that prize evenly.
  const leadersBy = (sel: (st: (typeof base)[number]) => number): string[] => {
    const top = Math.max(0, ...base.map(sel));
    return top > 0
      ? base.filter((st) => sel(st) === top).map((st) => st.participant.id)
      : [];
  };
  const pointsLeaders = leadersBy((st) => st.totalPoints);
  const goalsLeaders = leadersBy((st) => st.totalGoals);

  const shares: Record<string, number> = {};
  const award = (ids: string[], pool: number) => {
    if (!ids.length) return;
    const each = pool / ids.length;
    for (const id of ids) shares[id] = (shares[id] ?? 0) + each;
  };
  if (champId) shares[champId] = (shares[champId] ?? 0) + pot * s.payout.champion;
  award(pointsLeaders, pot * s.payout.points);
  award(goalsLeaders, pot * (s.payout.goals ?? 0));

  return sorted.map((st, i) => ({
    ...st,
    potShare: Math.round(shares[st.participant.id] ?? 0),
    rank: i + 1,
  }));
}
