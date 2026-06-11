import type { Stage, TeamResult } from "@/lib/types";

/**
 * ───────────────────────────────────────────────────────────────────────────
 *  AUTO RESULTS — openfootball (public-domain, no API key)
 * ───────────────────────────────────────────────────────────────────────────
 *  Reads the free public-domain World Cup 2026 dataset and derives each team's
 *  group W-D-L and furthest stage reached straight from match scores. Served
 *  via the jsDelivr CDN (permissive CORS), so the browser can fetch it
 *  directly — no backend, no key. Match scores/standings are factual data.
 */

const SOURCE_URLS = [
  "https://cdn.jsdelivr.net/gh/openfootball/worldcup.json@master/2026/worldcup.json",
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",
];

// openfootball team strings (incl. playoff placeholders) → our team ids.
const NAME_TO_ID: Record<string, string> = {
  mexico: "MEX",
  "south africa": "RSA",
  "south korea": "KOR",
  "korea republic": "KOR",
  "czech republic": "CZE",
  czechia: "CZE",
  "uefa path d winner": "CZE",
  canada: "CAN",
  "bosnia and herzegovina": "BIH",
  "bosnia & herzegovina": "BIH",
  "bosnia-herzegovina": "BIH",
  "uefa path a winner": "BIH",
  qatar: "QAT",
  switzerland: "SUI",
  brazil: "BRA",
  morocco: "MAR",
  haiti: "HAI",
  scotland: "SCO",
  usa: "USA",
  "united states": "USA",
  paraguay: "PAR",
  australia: "AUS",
  turkey: "TUR",
  "türkiye": "TUR",
  "turkiye": "TUR",
  "uefa path c winner": "TUR",
  germany: "GER",
  "curaçao": "CUW",
  "curacao": "CUW",
  "ivory coast": "CIV",
  "côte d'ivoire": "CIV",
  "cote d'ivoire": "CIV",
  ecuador: "ECU",
  netherlands: "NED",
  japan: "JPN",
  sweden: "SWE",
  "uefa path b winner": "SWE",
  tunisia: "TUN",
  belgium: "BEL",
  egypt: "EGY",
  iran: "IRN",
  "ir iran": "IRN",
  "new zealand": "NZL",
  spain: "ESP",
  "cape verde": "CPV",
  "cabo verde": "CPV",
  "saudi arabia": "KSA",
  uruguay: "URU",
  france: "FRA",
  senegal: "SEN",
  iraq: "IRQ",
  "ic path 2 winner": "IRQ",
  norway: "NOR",
  argentina: "ARG",
  algeria: "ALG",
  austria: "AUT",
  jordan: "JOR",
  portugal: "POR",
  "dr congo": "COD",
  "congo dr": "COD",
  "democratic republic of the congo": "COD",
  "ic path 1 winner": "COD",
  uzbekistan: "UZB",
  colombia: "COL",
  england: "ENG",
  croatia: "CRO",
  ghana: "GHA",
  panama: "PAN",
};

function toId(name: unknown): string | null {
  if (typeof name !== "string") return null;
  return NAME_TO_ID[name.trim().toLowerCase()] ?? null;
}

/** Public: resolve a team name (from any feed) to our internal team id. */
export function teamIdFromName(name: string): string | null {
  return toId(name);
}

interface RawMatch {
  round?: string;
  group?: string;
  team1?: string;
  team2?: string;
  date?: string;
  time?: string;
  num?: number;
  ground?: string;
  score1?: number;
  score2?: number;
  score?: { ft?: [number, number] };
}

// Returns [home, away] goals if the match has been played, else null.
function getScore(m: RawMatch): [number, number] | null {
  if (typeof m.score1 === "number" && typeof m.score2 === "number")
    return [m.score1, m.score2];
  const ft = m.score?.ft;
  if (Array.isArray(ft) && ft.length === 2) return [ft[0], ft[1]];
  return null;
}

// Knockout round label → ordered stage.
const ROUND_STAGE: { test: (r: string) => boolean; stage: Stage; rank: number }[] = [
  { test: (r) => /round of 32/i.test(r), stage: "r32", rank: 1 },
  { test: (r) => /round of 16/i.test(r), stage: "r16", rank: 2 },
  { test: (r) => /quarter/i.test(r), stage: "qf", rank: 3 },
  { test: (r) => /semi/i.test(r), stage: "sf", rank: 4 },
  { test: (r) => /^final$|^final\b/i.test(r), stage: "final", rank: 5 },
];

function knockoutStage(round: string): { stage: Stage; rank: number } | null {
  if (/third place/i.test(round)) return null; // 3rd-place game adds nothing
  return ROUND_STAGE.find((r) => r.test(round)) ?? null;
}

export interface SyncedResults {
  results: Record<string, Partial<TeamResult>>;
  playedGroupMatches: number;
  knockoutResolved: boolean;
}

/** Pure: turn a raw match list into per-team results. */
export function computeResults(matches: RawMatch[]): SyncedResults {
  const out: Record<string, TeamResult> = {};
  const ensure = (id: string): TeamResult =>
    (out[id] ??= {
      teamId: id,
      groupWins: 0,
      groupDraws: 0,
      groupLosses: 0,
      stageReached: "group",
    });

  let playedGroupMatches = 0;
  let knockoutResolved = false;
  const stageRank: Record<string, number> = {};
  let championId: string | null = null;

  for (const m of matches) {
    const id1 = toId(m.team1);
    const id2 = toId(m.team2);
    const score = getScore(m);
    const isGroup = !!m.group;

    if (isGroup) {
      if (!id1 || !id2 || !score) continue;
      playedGroupMatches++;
      const [a, b] = score;
      const t1 = ensure(id1);
      const t2 = ensure(id2);
      if (a > b) {
        t1.groupWins++;
        t2.groupLosses++;
      } else if (a < b) {
        t2.groupWins++;
        t1.groupLosses++;
      } else {
        t1.groupDraws++;
        t2.groupDraws++;
      }
      continue;
    }

    // Knockout match
    const ks = m.round ? knockoutStage(m.round) : null;
    if (!ks) continue;
    // A team appearing with a real (mapped) name in a knockout slot has
    // reached that round — even before the match is played.
    for (const id of [id1, id2]) {
      if (!id) continue;
      knockoutResolved = true;
      const cur = stageRank[id] ?? 0;
      if (ks.rank > cur) {
        stageRank[id] = ks.rank;
        ensure(id).stageReached = ks.stage;
      }
    }
    // Champion = winner of the Final.
    if (ks.stage === "final" && score && id1 && id2) {
      championId = score[0] >= score[1] ? id1 : id2;
    }
  }

  if (championId) ensure(championId).stageReached = "champion";

  // Mark group-stage drop-outs as eliminated, but only once the knockout
  // bracket has real names (so we don't prematurely eliminate advancers).
  if (knockoutResolved) {
    for (const t of Object.values(out)) {
      const played = t.groupWins + t.groupDraws + t.groupLosses;
      if (t.stageReached === "group" && played >= 3) t.stageReached = "eliminated";
    }
  }

  // Only return fields the sync should set.
  const results: Record<string, Partial<TeamResult>> = {};
  for (const [id, t] of Object.entries(out)) {
    results[id] = {
      groupWins: t.groupWins,
      groupDraws: t.groupDraws,
      groupLosses: t.groupLosses,
      stageReached: t.stageReached,
    };
  }
  return { results, playedGroupMatches, knockoutResolved };
}

async function fetchMatches(): Promise<RawMatch[] | null> {
  for (const url of SOURCE_URLS) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const json = (await res.json()) as { matches?: RawMatch[] };
      if (json?.matches) return json.matches;
    } catch {
      // try next source
    }
  }
  return null;
}

/** Fetch the dataset (trying CDN then raw) and compute results. */
export async function fetchResults(): Promise<SyncedResults | null> {
  const matches = await fetchMatches();
  return matches ? computeResults(matches) : null;
}

// ── Fixtures (for the "Today" dashboard card) ────────────────────────────────

export interface FixtureLite {
  date: string; // YYYY-MM-DD (venue calendar date)
  kickoff: number | null; // epoch ms, or null if time unparseable
  label: string; // group ("Group A") or knockout round
  isKnockout: boolean;
  venue: string;
  home: { id: string | null; name: string };
  away: { id: string | null; name: string };
  score: [number, number] | null;
  played: boolean;
}

// Build an epoch from "2026-06-11" + "13:00 UTC-6".
function parseKickoff(date?: string, time?: string): number | null {
  if (!date) return null;
  const m = (time || "").match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})?/i);
  if (!m) {
    const d = Date.parse(`${date}T12:00:00Z`);
    return Number.isNaN(d) ? null : d;
  }
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  const offset = m[3] ? Number(m[3]) : 0;
  const [y, mo, d] = date.split("-").map(Number);
  const utc = Date.UTC(y, mo - 1, d, hh, mm) - offset * 3600000;
  return Number.isNaN(utc) ? null : utc;
}

/** A readable team name even when openfootball still uses a placeholder. */
function displayName(raw?: string): string {
  if (!raw) return "TBD";
  return raw;
}

export function parseFixtures(matches: RawMatch[]): FixtureLite[] {
  return matches
    .map((m): FixtureLite => {
      const score = getScore(m);
      return {
        date: m.date ?? "",
        kickoff: parseKickoff(m.date, m.time),
        label: m.group ?? m.round ?? "",
        isKnockout: !m.group,
        venue: m.ground ?? "",
        home: { id: toId(m.team1), name: displayName(m.team1) },
        away: { id: toId(m.team2), name: displayName(m.team2) },
        score,
        played: !!score,
      };
    })
    .filter((f) => f.date)
    .sort((a, b) => (a.kickoff ?? 0) - (b.kickoff ?? 0));
}

export async function fetchFixtures(): Promise<FixtureLite[] | null> {
  const matches = await fetchMatches();
  return matches ? parseFixtures(matches) : null;
}
