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

// Per-team live result (auto-synced from the web, or set by the moderator)
export interface TeamResult {
  teamId: string;
  groupWins: number;
  groupDraws: number;
  groupLosses: number;
  goalsFor?: number; // total goals the team has scored (all stages)
  stageReached: Stage; // furthest stage reached / eliminated
  manual?: boolean; // true = moderator-edited; auto-sync won't overwrite it
}

export interface Participant {
  id: string;
  name: string;
  pin?: string;          // only the organizer uses a PIN; participants don't log in
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
}
