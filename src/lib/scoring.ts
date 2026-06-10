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
  predChampion: 40,
  predTopScorer: 25,
  predDarkHorse: 20,
  pool: {
    group: 0.15,
    r16: 0.1,
    qf: 0.15,
    sf: 0.15,
    final: 0.1,
    champion: 0.25,
    predictions: 0.1,
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

export interface PredictionBreakdown {
  championHit: boolean;
  topScorerHit: boolean;
  // dark horse: team reached at least QF
  darkHorseHit: boolean;
  points: number;
}

export function predictionPoints(
  p: Participant,
  state: PoolState,
): PredictionBreakdown {
  const s = state.scoring;
  const championHit =
    !!p.predChampionId &&
    !!state.actualChampionId &&
    p.predChampionId === state.actualChampionId;

  const topScorerHit =
    !!p.predTopScorer &&
    !!state.actualTopScorer &&
    p.predTopScorer.trim().toLowerCase() ===
      state.actualTopScorer.trim().toLowerCase();

  let darkHorseHit = false;
  if (p.predDarkHorseId) {
    const r = state.results[p.predDarkHorseId];
    if (r) darkHorseHit = reachedAtLeast(r.stageReached, "qf");
  }

  const points =
    (championHit ? s.predChampion : 0) +
    (topScorerHit ? s.predTopScorer : 0) +
    (darkHorseHit ? s.predDarkHorse : 0);

  return { championHit, topScorerHit, darkHorseHit, points };
}

export interface ParticipantStanding {
  participant: Participant;
  teamBreakdowns: TeamPointsBreakdown[];
  teamPointsTotal: number;
  prediction: PredictionBreakdown;
  totalPoints: number;
  potShare: number; // currency owed so far
  rank: number;
}

/** Total pot = sum of every participant's package buy-in. */
export function totalPot(state: PoolState): number {
  return state.participants.reduce((sum, p) => {
    const pkg = state.packages.find((k) => k.id === p.packageId);
    return sum + (pkg ? pkg.buyIn : 0);
  }, 0);
}

/**
 * Distributes each pool proportionally to the points each participant earned in
 * that phase. Phase pools: group, r16, qf, sf, final, champion, predictions.
 */
function distributePot(
  state: PoolState,
  standings: Omit<ParticipantStanding, "potShare" | "rank">[],
): Record<string, number> {
  const pot = totalPot(state);
  const s = state.scoring;
  const share: Record<string, number> = {};
  standings.forEach((st) => (share[st.participant.id] = 0));

  // Helper: split a pool by a points selector.
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
  // Each knockout pool — by knockout points earned at that depth.
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
  // Predictions pool — by prediction points.
  splitPool(s.pool.predictions, (st) => st.prediction.points);

  return share;
}

/** Full leaderboard, sorted, with pot shares. */
export function computeStandings(state: PoolState): ParticipantStanding[] {
  const base = state.participants.map((participant) => {
    const pkg = state.packages.find((k) => k.id === participant.packageId);
    const teamBreakdowns = (pkg?.teamIds ?? [])
      .map((tid) => state.results[tid])
      .filter(Boolean)
      .map((r) => teamPoints(r, state.scoring));
    const teamPointsTotal = teamBreakdowns.reduce((a, b) => a + b.total, 0);
    const prediction = predictionPoints(participant, state);
    return {
      participant,
      teamBreakdowns,
      teamPointsTotal,
      prediction,
      totalPoints: teamPointsTotal + prediction.points,
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
