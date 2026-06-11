import { teamIdFromName } from "@/lib/results-sync";

/**
 * Live scores + match stats via the Cloudflare Worker proxy
 * (NEXT_PUBLIC_LIVE_API_URL). If that env var isn't set, everything here is a
 * no-op and the app falls back to the "En vivo" indicator + final scores.
 */
const BASE = process.env.NEXT_PUBLIC_LIVE_API_URL;
export const isLiveEnabled = Boolean(BASE);

const IN_PLAY = new Set(["1H", "2H", "HT", "ET", "BT", "P", "LIVE", "INT"]);

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
}

interface AfFixture {
  fixture?: { id?: number; status?: { short?: string; elapsed?: number } };
  teams?: { home?: { name?: string }; away?: { name?: string } };
  goals?: { home?: number | null; away?: number | null };
}

export async function fetchLive(): Promise<LiveMatch[]> {
  if (!BASE) return [];
  try {
    const res = await fetch(BASE, { cache: "no-store" });
    if (!res.ok) return [];
    const json = (await res.json()) as { response?: AfFixture[] };
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
      };
    });
  } catch {
    return [];
  }
}

/** Find the live match for a given pair of our team ids (either orientation). */
export function findLiveFor(
  live: LiveMatch[],
  homeId: string | null,
  awayId: string | null,
): LiveMatch | null {
  if (!homeId && !awayId) return null;
  return (
    live.find(
      (m) =>
        (m.homeId === homeId && m.awayId === awayId) ||
        (m.homeId === awayId && m.awayId === homeId),
    ) ?? null
  );
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
