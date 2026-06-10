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
  // Pot pools by phase — must sum to 1. Paid out as teams advance.
  pool: {
    group: 0.15,
    r16: 0.12,
    qf: 0.17,
    sf: 0.16,
    final: 0.12,
    champion: 0.28,
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
  potShare: number; // currency owed so far
  rank: number;
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

/**
 * Distributes each phase pool proportionally to the points each participant
 * earned in that phase (group, r16, qf, sf, final, champion).
 */
function distributePot(
  state: PoolState,
  standings: Omit<ParticipantStanding, "potShare" | "rank">[],
): Record<string, number> {
  const pot = totalPot(state);
  const s = state.scoring;
  const share: Record<string, number> = {};
  standings.forEach((st) => (share[st.participant.id] = 0));

  const splitPool = (
    fraction: number,
    selector: (st: Omit<ParticipantStanding, "potShare" | "rank">) => number,
  ) => {
    const amount = pot * fraction;
    const totals = standings.map(selector);
    const sum = totals.reduce((a, b) => a + b, 0);
    if (sum <= 0) return;
    standings.forEach((st, i) => {
      share[st.participant.id] += (totals[i] / sum) * amount;
    });
  };

  // Group pool — by group points.
  splitPool(s.pool.group, (st) =>
    st.teamBreakdowns.reduce((a, b) => a + b.groupPoints, 0),
  );
  // Each knockout pool — by number of owned teams that reached that depth.
  const knockoutSelector =
    (depth: Stage) =>
    (st: Omit<ParticipantStanding, "potShare" | "rank">) =>
      st.teamBreakdowns.reduce((a, b) => {
        const r = state.results[b.teamId];
        return a + (r && reachedAtLeast(r.stageReached, depth) ? 1 : 0);
      }, 0);

  splitPool(s.pool.r16, knockoutSelector("r16"));
  splitPool(s.pool.qf, knockoutSelector("qf"));
  splitPool(s.pool.sf, knockoutSelector("sf"));
  splitPool(s.pool.final, knockoutSelector("final"));
  splitPool(s.pool.champion, knockoutSelector("champion"));

  return share;
}

/** Full leaderboard, sorted, with pot shares. */
export function computeStandings(state: PoolState): ParticipantStanding[] {
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
    };
  });

  const shares = distributePot(state, base);

  return base
    .sort((a, b) => b.totalPoints - a.totalPoints)
    .map((st, i) => ({
      ...st,
      potShare: Math.round(shares[st.participant.id] ?? 0),
      rank: i + 1,
    }));
}
