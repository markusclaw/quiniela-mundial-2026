import type {
  Participant,
  PoolSettings,
  PoolState,
  ScoringConfig,
  Stage,
  TeamResult,
} from "@/lib/types";
import { TEAMS } from "@/lib/data/teams";
import { buildPackages } from "@/lib/packages";
import { DEFAULT_SCORING } from "@/lib/scoring";

/**
 * ───────────────────────────────────────────────────────────────────────────
 *  DATA LAYER  (the Supabase seam)
 * ───────────────────────────────────────────────────────────────────────────
 *  Everything reads/writes through `loadState` / `saveState`. Today they use
 *  localStorage so the app is fully working with zero backend. To go
 *  multi-device, replace the bodies of these two functions with Supabase
 *  queries (see /supabase/schema.sql and README). Nothing else changes.
 */

const STORAGE_KEY = "quiniela-mundial-2026:v1";

// The organizer's PIN. Hardwired in code (there's no UI to change it) and
// re-applied on every load so it always works, even on older saved pools.
export const ORGANIZER_PIN = "3389";

const DEFAULT_SETTINGS: PoolSettings = {
  name: "Quiniela Mundial 2026",
  currency: "MXN",
  joinCode: "GOL2026",
  distributionMode: "balanced",
  buyIn: 400, // flat per-package price (balanced)
  teamPrice: 100, // per-team price (individual)
  tierBuyIns: { premium: 600, mid: 400, value: 250 }, // tiered
};

export function buildPackagesFor(settings: PoolSettings) {
  return buildPackages({
    mode: settings.distributionMode,
    buyIn: settings.buyIn,
    tierBuyIns: settings.tierBuyIns,
  });
}

function freshResults(): Record<string, TeamResult> {
  const r: Record<string, TeamResult> = {};
  for (const t of TEAMS) {
    r[t.id] = {
      teamId: t.id,
      groupWins: 0,
      groupDraws: 0,
      groupLosses: 0,
      goalsFor: 0,
      stageReached: "group",
    };
  }
  return r;
}

export function createInitialState(): PoolState {
  return {
    settings: DEFAULT_SETTINGS,
    scoring: DEFAULT_SCORING,
    participants: [
      {
        id: "mod",
        name: "Organizer",
        pin: ORGANIZER_PIN,
        packageId: null,
        isModerator: true,
        joinedAt: Date.now(),
      },
    ],
    packages: buildPackagesFor(DEFAULT_SETTINGS),
    results: freshResults(),
    teamOwners: {},
  };
}

/**
 * Upgrade older saved state to the current shape. Notably: migrate the old
 * per-tier `buyIns` object to a single flat `buyIn`, and flatten any package
 * prices to it. Safe to run on already-current state.
 */
export function migrateState(s: PoolState): PoolState {
  const settings = s.settings as PoolSettings & {
    buyIns?: { premium?: number; mid?: number; value?: number };
  };
  if (typeof settings.buyIn !== "number") {
    settings.buyIn = settings.buyIns?.mid ?? settings.buyIns?.premium ?? 400;
  }
  if (!settings.distributionMode) settings.distributionMode = "balanced";
  if (typeof settings.teamPrice !== "number") settings.teamPrice = 100;
  if (!settings.tierBuyIns) {
    settings.tierBuyIns = settings.buyIns
      ? {
          premium: settings.buyIns.premium ?? 600,
          mid: settings.buyIns.mid ?? 400,
          value: settings.buyIns.value ?? 250,
        }
      : { premium: 600, mid: 400, value: 250 };
  }
  delete settings.buyIns;
  if (!s.teamOwners) s.teamOwners = {};
  // Ensure every team has a results entry (older/overwritten blobs may be
  // missing some) so auto-sync can always record scores. Existing records win.
  s.results = { ...freshResults(), ...(s.results ?? {}) };
  // Migrate scoring to the three-payout model (champion / points / goals).
  const scoring = s.scoring as ScoringConfig & { pool?: unknown };
  if (scoring && (!scoring.payout || typeof scoring.payout.goals !== "number")) {
    scoring.payout = { champion: 7 / 12, points: 5 / 24, goals: 5 / 24 };
  }
  if (scoring) delete scoring.pool;
  // Always re-assert the organizer PIN so login works on any saved pool.
  const mod = s.participants?.find((p) => p.isModerator);
  if (mod) mod.pin = ORGANIZER_PIN;
  // Rebuild packages so composition/prices match the current mode.
  // PKG ids stay stable (PKG-01..12), so package assignments survive.
  s.packages = buildPackagesFor(settings);
  return s;
}

export function loadState(): PoolState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return migrateState(JSON.parse(raw) as PoolState);
  } catch {
    return createInitialState();
  }
}

export function saveState(state: PoolState) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function resetState(): PoolState {
  const s = createInitialState();
  saveState(s);
  return s;
}

// ── id helper ──
export function uid(prefix = "p"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

// ───────────────────────────────────────────────────────────────────────────
//  DEMO DATA — lets the organizer see a populated pool instantly.
// ───────────────────────────────────────────────────────────────────────────
const DEMO_NAMES = [
  "Greg", "Lucía", "Mateo", "Sofía", "Diego", "Camila",
  "Tío Beto", "Abuela Rosa", "Pablo", "Ana", "Javi", "Renata",
];

export function seedDemo(): PoolState {
  const state = createInitialState();
  const pkgs = state.packages;

  state.participants = DEMO_NAMES.map((name, i) => ({
    id: i === 0 ? "mod" : uid(),
    name,
    pin: i === 0 ? ORGANIZER_PIN : undefined,
    packageId: pkgs[i % pkgs.length].id,
    isModerator: i === 0,
    joinedAt: Date.now() - i * 1000,
  }));

  // A plausible partial set of results (group stage played, R32 set).
  const advanced: Record<string, Stage> = {
    ESP: "r16", ARG: "qf", FRA: "r16", BRA: "qf", ENG: "r32",
    POR: "r16", NED: "r32", GER: "r32", MAR: "qf", CRO: "r16",
    URU: "r32", MEX: "r32", USA: "r32", JPN: "r16", SEN: "r32",
  };
  const sampleGroup: Record<string, [number, number, number]> = {
    ESP: [3, 0, 0], ARG: [3, 0, 0], FRA: [2, 1, 0], BRA: [2, 1, 0],
    ENG: [2, 0, 1], POR: [2, 1, 0], NED: [2, 0, 1], GER: [1, 2, 0],
    MAR: [2, 1, 0], CRO: [2, 0, 1], URU: [1, 1, 1], MEX: [1, 2, 0],
    USA: [1, 1, 1], JPN: [2, 0, 1], SEN: [1, 1, 1],
  };
  for (const [tid, [w, d, l]] of Object.entries(sampleGroup)) {
    state.results[tid] = {
      teamId: tid,
      groupWins: w,
      groupDraws: d,
      groupLosses: l,
      stageReached: advanced[tid] ?? "eliminated",
    };
  }
  saveState(state);
  return state;
}
