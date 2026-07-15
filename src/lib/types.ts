// ---- Core domain types ----

export type Pot = 1 | 2 | 3 | 4;
export type GroupId =
  | "A" | "B" | "C" | "D" | "E" | "F"
  | "G" | "H" | "I" | "J" | "K" | "L";

export interface Team {
  id: string;        // e.g. "ARG"
  name: string;
  flag: string;      // emoji
  pot: Pot;
  group: GroupId;
  confederation: string;
  fifaRank: number;
}

export type Tier = "premium" | "mid" | "value";

export interface Package {
  id: string;          // "PKG-01"
  label: string;       // headline team name, e.g. "Spain Pack"
  tier: Tier;
  buyIn: number;       // price in pool currency
  teamIds: string[];   // 4 team ids
}

// Tournament stages a team can reach
export type Stage =
  | "group"      // still in group stage
  | "r32"        // advanced from group (Round of 32)
  | "r16"
  | "qf"
  | "sf"
  | "final"
  | "champion"
  | "eliminated";

// Configurable payout: how many winners share the pot.
export type PayoutPresetId = "three" | "five" | "seven";
export type PrizeType =
  | "champion"
  | "runner_up"
  | "third_place"
  | "fourth_place"
  | "most_points"
  | "second_points" // 2nd place in the points standings
  | "most_goals"
  | "survival"
  | "golden_boot"; // owner of the tournament top scorer's team

// Per-team live result (auto-synced from the web, or set by the moderator)
export interface TeamResult {
  teamId: string;
  groupWins: number;
  groupDraws: number;
  groupLosses: number;
  goalsFor?: number; // total goals the team has scored (all stages) — for the metric
  groupGoalsFor?: number; // group-stage goals for (standings table)
  groupGoalsAgainst?: number; // group-stage goals against (standings table)
  thirdPlace?: boolean; // won the third-place match
  fourthPlace?: boolean; // lost the third-place match
  stageReached: Stage; // furthest stage reached (kept for points, even once out)
  eliminated?: boolean; // true once out of the tournament (group non-qualifier OR lost a knockout tie)
  manual?: boolean; // true = moderator-edited; auto-sync won't overwrite it
}

export interface Participant {
  id: string;
  name: string;
  pin?: string;          // only the organizer uses a PIN; participants don't log in
  email?: string;        // optional contact info (organizer-managed)
  phone?: string;
  packageId: string | null;
  isModerator: boolean;
  joinedAt: number;
  paid?: boolean;        // package modes: organizer marks the buy-in as paid
  paidTeams?: string[];  // individual mode: team ids the player has paid for
}

export interface ScoringConfig {
  // points per owned-team milestone
  groupWin: number;
  groupDraw: number;
  advance: number; // reach R32
  r16: number;
  qf: number;
  sf: number;
  final: number;
  champion: number;
  underdogMultiplier: number; // applied to knockout milestones for Pot 3/4 teams
  // Three payouts (must sum to 1): the World Cup champion's owner, the
  // participant whose teams earned the most points, and the participant whose
  // teams scored the most goals overall.
  payout: {
    champion: number;
    points: number;
    goals: number;
  };
  // Active payout preset (how many winners share the pot). Defaults to "five"
  // when absent. See PAYOUT_PRESETS in scoring.ts for the splits.
  payoutPreset?: PayoutPresetId;
  // Optional fixed prize (currency) for the champion. When > 0, the champion
  // takes this flat amount off the top and the rest of the pot is split among
  // the remaining prizes by their relative weights. 0/undefined = pure %.
  championFixed?: number;
}

export type DistributionMode = "balanced" | "tiered" | "individual";

export interface PoolSettings {
  name: string;
  currency: string;
  joinCode: string;
  distributionMode: DistributionMode;
  buyIn: number; // flat per-package buy-in (balanced mode)
  teamPrice: number; // per-team price (individual mode)
  tierBuyIns: { premium: number; mid: number; value: number }; // tiered mode
}

export interface PoolState {
  settings: PoolSettings;
  scoring: ScoringConfig;
  participants: Participant[];
  packages: Package[];
  results: Record<string, TeamResult>; // by teamId
  teamOwners: Record<string, string>; // teamId -> participantId (individual mode)
  goldenBootTeamId?: string | null; // national team of the current top scorer
}
