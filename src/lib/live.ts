import {
  computeResults,
  teamIdFromName,
  type RawMatch,
  type SyncedResults,
} from "@/lib/results-sync";

/**
 * Live scores + match stats via the Cloudflare Worker proxy
 * (NEXT_PUBLIC_LIVE_API_URL). If that env var isn't set, everything here is a
 * no-op and the app falls back to the "En vivo" indicator + final scores.
 */
const BASE = process.env.NEXT_PUBLIC_LIVE_API_URL;
export const isLiveEnabled = Boolean(BASE);

const IN_PLAY = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"]);
const FINISHED = new Set(["FT", "AET", "PEN"]);

export interface LiveMatch {
  fixtureId: number;
  homeId: string | null;
  awayId: string | null;
  homeName: string;
  awayName: string;
  homeGoals: number;
  awayGoals: number;
  minute: number | null;
  status: string; // short code: 1H, HT, 2H, FT…
  inPlay: boolean;
  finished: boolean;
}

interface AfFixture {
  fixture?: { id?: number; status?: { short?: string; elapsed?: number } };
  league?: { round?: string };
  teams?: { home?: { name?: string }; away?: { name?: string } };
  goals?: { home?: number | null; away?: number | null };
  score?: {
    extratime?: { home?: number | null; away?: number | null };
    penalty?: { home?: number | null; away?: number | null };
  };
}

// True only when the payload is a real error response (so callers can tell a
// transient failure from a genuinely empty result set).
function hasApiError(json: unknown): boolean {
  const e = (json as { errors?: unknown })?.errors;
  if (!e) return false;
  return Array.isArray(e) ? e.length > 0 : Object.keys(e as object).length > 0;
}

/**
 * Today's World Cup fixtures (upcoming, in-play, and finished w/ final score).
 * Returns `null` on any failure (network error, rate-limit, error payload) so
 * the UI can KEEP the last good data instead of blanking the score out.
 * An empty array means "successfully fetched, nothing scheduled."
 */
export async function fetchLive(): Promise<LiveMatch[] | null> {
  if (!BASE) return null;
  try {
    const url = new URL(BASE);
    // Ask the worker for the full local day so finished matches (and their
    // final scores) come back too — not just whatever is in-play this second.
    url.searchParams.set("date", new Date().toLocaleDateString("en-CA"));
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) url.searchParams.set("tz", tz);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { response?: AfFixture[] };
    if (hasApiError(json)) return null;
    const rows = json.response ?? [];
    return rows.map((m): LiveMatch => {
      const homeName = m.teams?.home?.name ?? "";
      const awayName = m.teams?.away?.name ?? "";
      const status = m.fixture?.status?.short ?? "NS";
      return {
        fixtureId: m.fixture?.id ?? 0,
        homeId: teamIdFromName(homeName),
        awayId: teamIdFromName(awayName),
        homeName,
        awayName,
        homeGoals: m.goals?.home ?? 0,
        awayGoals: m.goals?.away ?? 0,
        minute: m.fixture?.status?.elapsed ?? null,
        status,
        inPlay: IN_PLAY.has(status),
        finished: FINISHED.has(status),
      };
    });
  } catch {
    return null;
  }
}

/** Find the live match for a given pair of our team ids (either orientation). */
export function findLiveFor(
  live: LiveMatch[],
  homeId: string | null,
  awayId: string | null,
): LiveMatch | null {
  // Both sides must be known, or we could false-match on a shared `null`
  // (e.g. a half-resolved knockout fixture) and show the wrong score.
  if (!homeId || !awayId) return null;
  return (
    live.find(
      (m) =>
        (m.homeId === homeId && m.awayId === awayId) ||
        (m.homeId === awayId && m.awayId === homeId),
    ) ?? null
  );
}

/**
 * Full-season results straight from API-Football (the paid, authoritative,
 * fast feed) — so standings/points update the moment a match ends, instead of
 * waiting on the slower free results feed. Returns null on any failure so the
 * caller can fall back. Reuses the same results engine as openfootball.
 */
export async function fetchSeasonResults(): Promise<SyncedResults | null> {
  if (!BASE) return null;
  try {
    const url = new URL(BASE);
    url.searchParams.set("all", "1");
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    const json = (await res.json()) as { response?: AfFixture[] };
    if (hasApiError(json)) return null;
    const rows = json.response ?? [];
    if (!rows.length) return null;
    const matches = rows.map(apiToRaw);
    return computeResults(matches);
  } catch {
    return null;
  }
}

function num(v: number | null | undefined): number | undefined {
  return typeof v === "number" ? v : undefined;
}

// Map an API-Football fixture to the shared RawMatch shape the results engine
// understands (group vs knockout by round name; ft/et/penalty scores).
function apiToRaw(f: AfFixture): RawMatch {
  const round = f.league?.round ?? "";
  const isGroup = /group/i.test(round);
  const status = f.fixture?.status?.short ?? "NS";
  const done = FINISHED.has(status);
  const gh = num(f.goals?.home);
  const ga = num(f.goals?.away);
  const eh = num(f.score?.extratime?.home);
  const ea = num(f.score?.extratime?.away);
  const ph = num(f.score?.penalty?.home);
  const pa = num(f.score?.penalty?.away);
  const score =
    done && gh !== undefined && ga !== undefined
      ? {
          ft: [gh, ga] as [number, number],
          ...(eh !== undefined && ea !== undefined
            ? { et: [eh, ea] as [number, number] }
            : {}),
          ...(ph !== undefined && pa !== undefined
            ? { p: [ph, pa] as [number, number] }
            : {}),
        }
      : undefined;
  return {
    round: isGroup ? undefined : round,
    group: isGroup ? round : undefined,
    team1: f.teams?.home?.name,
    team2: f.teams?.away?.name,
    score,
  };
}

export interface TeamStat {
  label: string;
  home: string | number;
  away: string | number;
}

interface AfStatTeam {
  team?: { name?: string };
  statistics?: { type?: string; value?: number | string | null }[];
}

// Stats we surface, in order. (API-Football "type" strings.)
const STAT_TYPES = [
  "Ball Possession",
  "Total Shots",
  "Shots on Goal",
  "Corner Kicks",
  "Fouls",
  "Yellow Cards",
];

export async function fetchStats(fixtureId: number): Promise<TeamStat[]> {
  if (!BASE) return [];
  try {
    const res = await fetch(`${BASE.replace(/\/$/, "")}/stats?fixture=${fixtureId}`, {
      cache: "no-store",
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { response?: AfStatTeam[] };
    const teams = json.response ?? [];
    if (teams.length < 2) return [];
    const get = (t: AfStatTeam, type: string) =>
      t.statistics?.find((x) => x.type === type)?.value ?? "—";
    return STAT_TYPES.map((type) => ({
      label: type,
      home: get(teams[0], type) ?? "—",
      away: get(teams[1], type) ?? "—",
    }));
  } catch {
    return [];
  }
}
