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

const DEFAULT_SETTINGS: PoolSettings = {
  name: "Quiniela Los Reyes Tires",
  currency: "MXN",
  joinCode: "GOL2026",
  buyIns: { premium: 600, mid: 400, value: 250 },
};

function freshResults(): Record<string, TeamResult> {
  const r: Record<string, TeamResult> = {};
  for (const t of TEAMS) {
    r[t.id] = {
      teamId: t.id,
      groupWins: 0,
      groupDraws: 0,
      groupLosses: 0,
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
        pin: "0000",
        packageId: null,
        isModerator: true,
        joinedAt: Date.now(),
        predChampionId: null,
        predTopScorer: null,
        predDarkHorseId: null,
      },
    ],
    packages: buildPackages(DEFAULT_SETTINGS.buyIns),
    results: freshResults(),
    actualChampionId: null,
    actualTopScorer: null,
  };
}

export function loadState(): PoolState {
  if (typeof window === "undefined") return createInitialState();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialState();
    return JSON.parse(raw) as PoolState;
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
    pin: String(1000 + i),
    packageId: pkgs[i % pkgs.length].id,
    isModerator: i === 0,
    joinedAt: Date.now() - i * 1000,
    predChampionId: ["ESP", "ARG", "FRA", "BRA"][i % 4],
    predTopScorer: ["Mbappé", "Lautaro Martínez", "Kane", "Vinícius Jr"][i % 4],
    predDarkHorseId: ["MAR", "CRO", "URU", "SEN"][i % 4],
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
