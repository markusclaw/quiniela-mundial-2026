"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CalendarDays, MapPin, User, BarChart3 } from "lucide-react";
import { SoccerBall } from "@/components/ui/soccer-ball";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getTeam, teamColor } from "@/lib/data/teams";
import {
  ownerMap,
  computeStandings,
  rankStandings,
  ownedTeamIds,
} from "@/lib/scoring";
import { SilkBackground } from "@/components/ui/silk-background";
import { fetchFixtures, type FixtureLite } from "@/lib/results-sync";
import {
  fetchLive,
  fetchStats,
  fetchEvents,
  findLiveFor,
  isLiveEnabled,
  LIVE_PERIOD_KEY,
  SHOW_MINUTE,
  type LiveMatch,
  type TeamStat,
  type MatchEvent,
} from "@/lib/live";

const REFRESH_MS = 2 * 60 * 1000;
const LIVE_MS = 20 * 1000; // paid plan budget → refresh scores/minute every 20s

const STAT_LABEL_KEY: Record<string, string> = {
  "Ball Possession": "stat.possession",
  "Total Shots": "stat.shots",
  "Shots on Goal": "stat.shotsOn",
  "Corner Kicks": "stat.corners",
  Fouls: "stat.fouls",
  "Yellow Cards": "stat.yellow",
};

const ROUND_RANK = (f: FixtureLite): number => {
  if (!f.isKnockout) return 0;
  const r = f.label.toLowerCase();
  if (/final/.test(r) && !/semi|quarter/.test(r)) return 5;
  if (/semi/.test(r)) return 4;
  if (/quarter/.test(r)) return 3;
  if (/round of 16/.test(r)) return 2;
  return 1;
};

function teamName(side: { id: string | null; name: string }): string {
  return side.id ? getTeam(side.id)?.name ?? side.name : side.name;
}

// Headline prominence: later rounds and higher-ranked teams rank higher.
function prominence(f: FixtureLite): number {
  const rank = getTeam(f.home.id ?? "")?.fifaRank ?? 999;
  const rank2 = getTeam(f.away.id ?? "")?.fifaRank ?? 999;
  const best = Math.min(rank, rank2);
  return ROUND_RANK(f) * 1000 + (200 - Math.min(best, 200));
}

// How long a match can plausibly run (regulation + half-time + stoppage; wider
// for knockouts that can go to extra time + penalties).
function matchWindowMs(f: FixtureLite): number {
  return (f.isKnockout ? 3.25 : 2.5) * 3600 * 1000;
}

function phaseOf(
  f: FixtureLite,
  live: LiveMatch[],
  now: number,
): "live" | "upcoming" | "done" {
  const lm = findLiveFor(live, f.home.id, f.away.id);
  if (lm?.inPlay) return "live";
  if (lm?.finished || f.played || f.score) return "done";
  if (f.kickoff != null && f.kickoff <= now) {
    return now - f.kickoff <= matchWindowMs(f) ? "live" : "done";
  }
  return "upcoming";
}

// Stable key for a fixture (used to remember when a match finished).
function fxKey(f: FixtureLite): string {
  return `${f.date}|${f.home.name}|${f.away.name}`;
}

// Keep a just-finished match featured (as a recap) for this long after it ends.
const RECAP_GRACE_MS = 5 * 60 * 1000;
// Forget finish stamps older than this so localStorage stays tidy.
const STAMP_TTL_MS = 6 * 60 * 60 * 1000;
const FINISH_STORE_KEY = "qm:finishedAt";

// Finish stamps persist across refreshes so the recap is deterministic (no
// flicker) and survives a reload within the grace window.
function loadFinishStamps(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(FINISH_STORE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveFinishStamps(m: Record<string, number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FINISH_STORE_KEY, JSON.stringify(m));
  } catch {
    /* storage disabled / over quota — recap just won't persist */
  }
}

export function MatchdayToday() {
  const { state } = usePool();
  const { t, locale } = useT();
  const loc = locale === "es" ? "es-MX" : "en-US";
  const [fixtures, setFixtures] = useState<FixtureLite[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    const load = () =>
      fetchFixtures().then((f) => {
        if (on && f) setFixtures(f);
        if (on) setLoading(false);
      });
    load();
    const id = setInterval(load, REFRESH_MS);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);

  const [live, setLive] = useState<LiveMatch[]>([]);
  useEffect(() => {
    if (!isLiveEnabled) return;
    let on = true;
    // Only adopt a successful fetch; a null (transient failure / rate-limit)
    // keeps the last good data so scores don't flicker in and out.
    const load = () => fetchLive().then((l) => on && l && setLive(l));
    load();
    const id = setInterval(load, LIVE_MS);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);

  // Persistent finish stamps (loaded once from localStorage), so the post-match
  // recap is deterministic and survives a refresh within the grace window.
  const finishedAtRef = useRef<Record<string, number> | null>(null);
  if (finishedAtRef.current === null) finishedAtRef.current = loadFinishStamps();

  // Low-frequency tick so the recap expires (and the hero advances) on time
  // even when the live feed isn't polling.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30 * 1000);
    return () => clearInterval(id);
  }, []);

  const owners = useMemo(() => ownerMap(state), [state]);

  // Live "stake" per team: the owner's current points and rank — so the hero
  // connects the match to the standings.
  const stakeFor = useMemo(() => {
    const byId: Record<string, { points: number; rank: number }> = {};
    rankStandings(computeStandings(state)).forEach(({ s, rank }) => {
      byId[s.participant.id] = { points: s.totalPoints, rank };
    });
    const ownerId: Record<string, string> = {};
    for (const p of state.participants)
      for (const tid of ownedTeamIds(p, state)) ownerId[tid] = p.id;
    return (teamId: string | null) => {
      const pid = teamId ? ownerId[teamId] : undefined;
      return pid ? byId[pid] : undefined;
    };
  }, [state]);

  // Build a forward-looking feed: a live match headlines; otherwise the next
  // upcoming kickoff does. The "up next" list shows the matches that come
  // AFTER the hero (across days), so a finished game never sits up top.
  // Today's finished results get their own compact strip below.
  const { hero, concurrent, rest, heroToday, heroRecap } = useMemo(() => {
    const empty = {
      hero: null as FixtureLite | null,
      concurrent: [] as FixtureLite[],
      rest: [] as FixtureLite[],
      results: [] as FixtureLite[],
      heroToday: false,
      heroRecap: false,
    };
    if (!fixtures || !fixtures.length) return empty;
    const now = Date.now();
    const today = new Date().toLocaleDateString("en-CA");
    const byTime = (a: FixtureLite, b: FixtureLite) =>
      (a.kickoff ?? Infinity) - (b.kickoff ?? Infinity);

    // Stamp the moment a match looks done AND plausibly just ended, then prune
    // old stamps. The "just ended" bound stops an old finished match from
    // resurfacing as a recap on a fresh page load.
    const stamps = finishedAtRef.current!;
    let changed = false;
    for (const f of fixtures) {
      const key = fxKey(f);
      if (stamps[key] != null) continue;
      const justEnded =
        f.kickoff != null &&
        now - f.kickoff >= 0 &&
        now - f.kickoff <= matchWindowMs(f) + RECAP_GRACE_MS;
      if (justEnded && phaseOf(f, live, now) === "done") {
        stamps[key] = now;
        changed = true;
      }
    }
    for (const key of Object.keys(stamps)) {
      if (now - stamps[key] > STAMP_TTL_MS) {
        delete stamps[key];
        changed = true;
      }
    }
    if (changed) saveFinishStamps(stamps);

    // Once stamped finished, a match stays "done" — this kills the live↔done
    // flicker in the gap between the live feed dropping a finished match and
    // the free results feed publishing its final score.
    const phaseFor = (f: FixtureLite): "live" | "upcoming" | "done" =>
      stamps[fxKey(f)] != null ? "done" : phaseOf(f, live, now);

    const liveOnes = fixtures.filter((f) => phaseFor(f) === "live");
    const upcoming = fixtures
      .filter((f) => phaseFor(f) === "upcoming")
      .sort(byTime);
    const finishedToday = fixtures
      .filter((f) => phaseFor(f) === "done" && f.date === today)
      .sort((a, b) => (b.kickoff ?? 0) - (a.kickoff ?? 0));

    // Matches that finished within the recap window (most recent first) — kept
    // featured so people can read the result before the hero moves on.
    const recentlyFinished = fixtures
      .filter((f) => {
        const at = stamps[fxKey(f)];
        return at != null && now - at < RECAP_GRACE_MS;
      })
      .sort((a, b) => (stamps[fxKey(b)] ?? 0) - (stamps[fxKey(a)] ?? 0));

    let h: FixtureLite | null = null;
    if (liveOnes.length)
      h = [...liveOnes].sort((a, b) => prominence(b) - prominence(a))[0];
    else if (recentlyFinished.length) h = recentlyFinished[0];
    else if (upcoming.length) h = upcoming[0];
    else h = finishedToday[0] ?? null;
    if (!h) return empty;

    // Matches happening at the same time as the hero — surfaced as switcher
    // chips so you can flip the hero between them. When two+ games are live,
    // that's the whole live set; for an upcoming hero, it's everything sharing
    // its exact kickoff (the simultaneous final round of group play).
    let concurrent: FixtureLite[];
    if (liveOnes.length && liveOnes.includes(h)) {
      concurrent = [...liveOnes].sort((a, b) => prominence(b) - prominence(a));
    } else if (upcoming.includes(h) && h.kickoff != null) {
      concurrent = upcoming
        .filter((f) => f.kickoff === h!.kickoff)
        .sort((a, b) => prominence(b) - prominence(a));
    } else {
      concurrent = [h];
    }

    const concKeys = new Set(concurrent.map(fxKey));
    const rest = [...liveOnes, ...upcoming].filter(
      (f) => !concKeys.has(fxKey(f)),
    );
    return {
      hero: h,
      concurrent,
      // Keep the home screen focused: just the next 5 upcoming/live matches.
      rest: rest.slice(0, 5),
      results: finishedToday.filter((f) => f !== h),
      heroToday: h.date === today,
      heroRecap: recentlyFinished.includes(h),
    };
  }, [fixtures, live, tick]);

  // Which concurrent match the user has flipped the hero to (null = default).
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-28 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }
  if (!fixtures || !hero) return null;

  // Featured = the user's chosen concurrent match if still valid, else the
  // default hero. The switcher only appears when 2+ matches are concurrent.
  const featured =
    concurrent.find((f) => fxKey(f) === selectedKey) ?? hero;
  const todayStr = new Date().toLocaleDateString("en-CA");
  const heroLive = findLiveFor(live, featured.home.id, featured.away.id);

  return (
    <div className="space-y-4">
      <FeaturedMatch
        fixture={featured}
        isToday={featured.date === todayStr}
        recap={heroRecap && featured === hero}
        owners={owners}
        loc={loc}
        live={heroLive}
        stakeFor={stakeFor}
        switcher={
          concurrent.length >= 2
            ? {
                matches: concurrent,
                live,
                selectedKey: fxKey(featured),
                onSelect: setSelectedKey,
              }
            : undefined
        }
      />
      {rest.length > 0 && (
        <MiniCardRow
          title={t("today.upNext")}
          icon={<CalendarDays className="h-4 w-4 text-primary" />}
          matches={rest}
          live={live}
          owners={owners}
          loc={loc}
          t={t}
        />
      )}
    </div>
  );
}

function MiniCardRow({
  title,
  icon,
  matches,
  live,
  owners,
  loc,
  t,
}: {
  title: string;
  icon: ReactNode;
  matches: FixtureLite[];
  live: LiveMatch[];
  owners: Record<string, string>;
  loc: string;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 px-1">
        {icon}
        <span className="text-sm font-bold">{title}</span>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar pb-1">
        {matches.map((f, i) => (
          <MatchMiniCard
            key={i}
            f={f}
            live={findLiveFor(live, f.home.id, f.away.id)}
            owners={owners}
            loc={loc}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/**
 * A broadcast-style running clock. The live feed only gives whole elapsed
 * minutes (and refreshes every ~20s), so we anchor on each new minute value
 * and tick the seconds locally — re-syncing whenever the feed advances.
 *
 * `cap` is the regulation end of the current half (45 / 90 / 105 / 120). Past
 * that we switch to stoppage notation — e.g. "45+2:13" — like a TV clock.
 * Returns the formatted string while active, or null when there's nothing to
 * show. (The feed has no authoritative added-time, so "+X" is derived.)
 */
function useLiveClock(
  minute: number | null,
  active: boolean,
  cap: number,
): string | null {
  const anchor = useRef<{ min: number; at: number } | null>(null);
  const now = useNow(active);
  if (minute == null || !active) {
    anchor.current = null;
    return null;
  }
  if (!anchor.current || anchor.current.min !== minute) {
    anchor.current = { min: minute, at: now };
  }
  const secs = minute * 60 + Math.max(0, Math.floor((now - anchor.current.at) / 1000));
  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  if (cap > 0 && secs > cap * 60) {
    return `${cap}+${fmt(secs - cap * 60)}`;
  }
  return fmt(secs);
}

function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

interface HeroSwitcher {
  matches: FixtureLite[];
  live: LiveMatch[];
  selectedKey: string;
  onSelect: (key: string) => void;
}

/** Tappable chips to flip the hero between simultaneous matches. */
function SwitcherChips({
  matches,
  live,
  selectedKey,
  onSelect,
  loc,
}: HeroSwitcher & { loc: string }) {
  const { t } = useT();
  const crest = (id: string | null) =>
    id ? (
      <TeamCrest teamId={id} size="xs" />
    ) : (
      <span className="grid h-5 w-5 place-items-center rounded-full bg-white/20 text-[9px] font-bold">
        ?
      </span>
    );

  return (
    <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
      {matches.map((f) => {
        const key = fxKey(f);
        const active = key === selectedKey;
        const lm = findLiveFor(live, f.home.id, f.away.id);
        const same = lm ? lm.homeId === f.home.id : true;
        const isLive = !!lm && lm.inPlay;
        const mid = isLive
          ? `${same ? lm!.homeGoals : lm!.awayGoals}-${same ? lm!.awayGoals : lm!.homeGoals}`
          : f.score
            ? `${f.score[0]}-${f.score[1]}`
            : f.kickoff != null
              ? new Date(f.kickoff).toLocaleTimeString(loc, {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : t("today.vs");
        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            aria-pressed={active}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm transition-colors",
              active
                ? "border-white bg-white text-foreground shadow-md"
                : "border-white/30 bg-black/25 text-white/90 hover:bg-black/40",
            )}
          >
            {crest(f.home.id)}
            <span className="tabular-nums">{mid}</span>
            {crest(f.away.id)}
            {isLive && (
              <span className="relative ml-0.5 flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function FeaturedMatch({
  fixture: f,
  isToday,
  recap = false,
  owners,
  loc,
  live,
  stakeFor,
  switcher,
}: {
  fixture: FixtureLite;
  isToday: boolean;
  recap?: boolean; // shown as a just-finished match recap
  owners: Record<string, string>;
  loc: string;
  live?: LiveMatch | null;
  stakeFor?: (teamId: string | null) => { points: number; rank: number } | undefined;
  switcher?: HeroSwitcher;
}) {
  const { t } = useT();
  const dateLabel = new Date(`${f.date}T12:00:00`).toLocaleDateString(loc, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  // Score orientation (the live feed may list our home team as its away team).
  const sameOrient = live ? live.homeId === f.home.id : true;
  const liveHome = live ? (sameOrient ? live.homeGoals : live.awayGoals) : 0;
  const liveAway = live ? (sameOrient ? live.awayGoals : live.homeGoals) : 0;

  // In-play score takes priority over everything else.
  const showLive = !!live && live.inPlay;

  // Final score: prefer the paid API (instant), fall back to the free results
  // feed (openfootball, slower). Two sources so we're never stuck in limbo.
  const finalScore: [number, number] | null =
    !showLive && live && live.finished
      ? [liveHome, liveAway]
      : f.score ?? null;
  const showFinal = !showLive && finalScore != null;

  // Tick every second only when we're near kickoff (or it just started).
  const near =
    !f.played && f.kickoff != null && f.kickoff - Date.now() < 2 * 3600 * 1000;
  const now = useNow(near && !showLive && !showFinal);
  const diff = f.kickoff != null ? f.kickoff - now : null;
  const counting =
    !showLive && !showFinal && diff != null && diff > 0 && diff <= 3600 * 1000; // ≤ 1h out
  // A real match lasts ~2h (90' + half-time + stoppage). Only treat it as
  // "in progress" inside that window — otherwise it's finished and we're just
  // waiting on a score source to publish the final. Knockouts can run to extra
  // time + penalties, so give them a wider window.
  const MATCH_WINDOW = (f.isKnockout ? 3.25 : 2.5) * 3600 * 1000;
  const sinceKickoff = diff != null ? -diff : null; // ms since kickoff
  const liveNow =
    !showLive &&
    !showFinal &&
    sinceKickoff != null &&
    sinceKickoff >= 0 &&
    sinceKickoff <= MATCH_WINDOW;
  // Kickoff was long ago, no live feed, no final score from either source yet.
  const pending =
    !showLive &&
    !showFinal &&
    sinceKickoff != null &&
    sinceKickoff > MATCH_WINDOW;

  const time =
    f.kickoff != null
      ? new Date(f.kickoff).toLocaleTimeString(loc, {
          hour: "numeric",
          minute: "2-digit",
        })
      : t("today.vs");

  // Live detail: period label, goal scorers, and nested stats.
  const fixtureId = live?.fixtureId ?? 0;
  const hasDetail = !!live && fixtureId > 0 && (live.inPlay || live.finished);
  const periodKey = live ? LIVE_PERIOD_KEY[live.status] ?? "today.live" : "today.live";
  const showMin = !!live && SHOW_MINUTE.has(live.status) && live.minute != null;
  // Regulation end of the current half → drives the "45+2" stoppage notation.
  const halfCap =
    live?.status === "1H"
      ? 45
      : live?.status === "2H"
        ? 90
        : live?.status === "ET"
          ? (live.minute ?? 0) > 105
            ? 120
            : 105
          : 0;
  // Broadcast-style running clock during play (ticks between feed updates).
  const liveClock = useLiveClock(live?.minute ?? null, showMin, halfCap);

  const [events, setEvents] = useState<MatchEvent[]>([]);
  useEffect(() => {
    if (!hasDetail) {
      setEvents([]);
      return;
    }
    let on = true;
    fetchEvents(fixtureId).then((e) => on && setEvents(e));
    return () => {
      on = false;
    };
    // refetch when the score changes (a new goal happened)
  }, [hasDetail, fixtureId, liveHome, liveAway]);
  const shownEvents = events;

  const [statsOpen, setStatsOpen] = useState(false);
  // A finished match is a recap — surface the details by default.
  useEffect(() => {
    if (recap) setStatsOpen(true);
  }, [recap]);
  const [stats, setStats] = useState<TeamStat[] | null>(null);
  // Fetch stats whenever there's a live/finished match (not just when expanded)
  // so the always-on possession bar has data.
  useEffect(() => {
    if (!hasDetail) {
      setStats(null);
      return;
    }
    let on = true;
    fetchStats(fixtureId).then((s) => on && setStats(s));
    return () => {
      on = false;
    };
  }, [hasDetail, fixtureId, liveHome, liveAway]);
  const shownStats = stats;
  const statHome = live
    ? (live.homeId ? getTeam(live.homeId)?.name ?? live.homeName : live.homeName)
    : "";
  const statAway = live
    ? (live.awayId ? getTeam(live.awayId)?.name ?? live.awayName : live.awayName)
    : "";

  // Possession for the always-on momentum bar (in live-feed orientation).
  const possRow = shownStats?.find((s) => s.label === "Ball Possession");
  const homePoss = possRow ? parseInt(String(possRow.home), 10) : NaN;
  const awayPoss = possRow ? parseInt(String(possRow.away), 10) : NaN;
  const hasPoss =
    Number.isFinite(homePoss) && Number.isFinite(awayPoss) && homePoss + awayPoss > 0;
  const rgb = (c: [number, number, number]) => `rgb(${c[0]},${c[1]},${c[2]})`;
  const homeRGB = rgb(teamColor(live?.homeId));
  const awayRGB = rgb(teamColor(live?.awayId));

  // Penalty shootout (oriented to the displayed home/away).
  const penH = sameOrient ? live?.penaltyHome ?? null : live?.penaltyAway ?? null;
  const penA = sameOrient ? live?.penaltyAway ?? null : live?.penaltyHome ?? null;
  const hasPens =
    penH != null && penA != null && (penH > 0 || penA > 0 || live?.status === "P");

  // Recap: who won (goals, then penalties for knockouts) — drives the winner
  // headline + crest hierarchy.
  const fa = finalScore?.[0] ?? 0;
  const fb = finalScore?.[1] ?? 0;
  let winSide: "home" | "away" | "draw" = "draw";
  if (showFinal) {
    if (fa > fb) winSide = "home";
    else if (fb > fa) winSide = "away";
    else if (penH != null && penA != null && penH !== penA)
      winSide = penH > penA ? "home" : "away";
  }
  const winnerName = winSide === "home" ? teamName(f.home) : teamName(f.away);

  // Flash the score briefly when it changes during a live match (a goal!).
  const prevScoreRef = useRef<string>("");
  const [flash, setFlash] = useState(false);
  useEffect(() => {
    const key = showLive ? `${liveHome}-${liveAway}` : "";
    const prev = prevScoreRef.current;
    prevScoreRef.current = key;
    if (showLive && prev && prev !== key) {
      setFlash(true);
      const id = setTimeout(() => setFlash(false), 1200);
      return () => clearTimeout(id);
    }
  }, [liveHome, liveAway, showLive]);

  return (
    <div className="relative overflow-hidden rounded-xl bg-primary text-primary-foreground">
      <SilkBackground
        className="absolute inset-0 h-full w-full"
        homeColor={teamColor(f.home.id)}
        awayColor={teamColor(f.away.id)}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/20 to-black/55" />
      <div className="relative z-10 p-5 sm:p-7">
        {switcher && (
          <SwitcherChips
            matches={switcher.matches}
            live={switcher.live}
            selectedKey={switcher.selectedKey}
            onSelect={switcher.onSelect}
            loc={loc}
          />
        )}
        <div className="mb-5 flex flex-col items-center gap-1.5 text-center">
          {showLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground shadow-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500/70" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
              {t(periodKey)}
              {liveClock ? (
                <span className="ml-1 tabular-nums">{liveClock}</span>
              ) : (
                ""
              )}
            </span>
          ) : showFinal || f.played || pending ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-foreground shadow-md">
              {recap ? t("today.recap") : t("today.ft")}
            </span>
          ) : (
            <span className="rounded-full bg-black/40 px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-sm backdrop-blur-sm">
              {isToday ? t("today.title") : dateLabel}
            </span>
          )}
        </div>

        {showFinal && (
          <div className="mb-4 text-center">
            <span
              className={cn(
                "inline-block text-2xl font-black uppercase leading-none tracking-tight drop-shadow-sm sm:text-3xl",
                winSide === "draw" ? "text-white" : "text-gold",
              )}
            >
              {winSide === "draw"
                ? t("today.drawResult")
                : t("today.winsResult", { team: winnerName })}
            </span>
          </div>
        )}

        <div className="grid grid-cols-3 items-start gap-2">
          <TeamSide
            id={f.home.id}
            name={teamName(f.home)}
            owner={f.home.id ? owners[f.home.id] : undefined}
            stake={stakeFor?.(f.home.id)}
            winner={showFinal && winSide === "home"}
            dim={showFinal && winSide === "away"}
          />

          <div className="flex flex-col items-center justify-center pt-2">
            {showLive ? (
              <div
                className={cn(
                  "text-4xl font-extrabold tracking-tight transition-transform duration-300 sm:text-6xl",
                  flash && "scale-110 drop-shadow-[0_0_24px_rgba(255,255,255,0.6)]",
                )}
              >
                {liveHome}<span className="px-1 text-white/50">-</span>{liveAway}
              </div>
            ) : showFinal ? (
              <>
                <div className="text-4xl font-extrabold tracking-tight sm:text-6xl">
                  {finalScore![0]}<span className="px-1 text-white/50">-</span>{finalScore![1]}
                </div>
                <div className="mt-1 text-[11px] font-medium text-white/70">
                  {isToday ? t("today.fullTime") : dateLabel}
                </div>
              </>
            ) : counting ? (
              <>
                <div className="text-4xl font-extrabold tabular-nums tracking-tight sm:text-6xl">
                  {fmtCountdown(diff!)}
                </div>
                <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  {t("today.startsIn")}
                </div>
              </>
            ) : liveNow ? (
              <div className="flex items-center gap-2 text-2xl font-extrabold sm:text-4xl">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/70" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-white" />
                </span>
                {t("today.live")}
              </div>
            ) : pending ? (
              <div className="flex flex-col items-center gap-1.5 py-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-center text-[11px] font-semibold leading-tight">
                  {t("today.pending")}
                </span>
              </div>
            ) : (
              <div className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                {time}
              </div>
            )}
            {!showLive && !showFinal && !f.played && !counting && !liveNow && !pending && f.kickoff != null && (
              <div className="mt-1 text-[11px] text-white/70">{dateLabel}</div>
            )}
          </div>

          <TeamSide
            id={f.away.id}
            name={teamName(f.away)}
            owner={f.away.id ? owners[f.away.id] : undefined}
            stake={stakeFor?.(f.away.id)}
            winner={showFinal && winSide === "away"}
            dim={showFinal && winSide === "home"}
          />
        </div>

        {/* Penalty shootout */}
        {hasPens && (
          <div className="mt-3 flex items-center justify-center gap-2 text-sm font-bold">
            <span className="tabular-nums">{penH}</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              {t("live.penalties")}
            </span>
            <span className="tabular-nums">{penA}</span>
          </div>
        )}

        {/* Key events — goals, cards, VAR */}
        {hasDetail && <HeroEvents events={shownEvents} live={live ?? null} />}

        <div className="mt-4 flex flex-col items-center gap-0.5 text-center text-xs text-white/75">
          {(f.stadium || f.venue) && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              {f.stadium ? (
                <span>
                  <span className="font-semibold text-white/90">
                    {f.stadium}
                  </span>
                  {f.venue ? ` · ${f.venue}` : ""}
                </span>
              ) : (
                f.venue
              )}
            </span>
          )}
          <span className="font-medium">
            {t("brand.event")} · {f.label}
          </span>
        </div>

        {/* Nested live stats — part of the hero, expandable */}
        {hasDetail && (
          <div className="mt-5 overflow-hidden rounded-lg bg-black/15">
            {/* Always-on momentum (possession) bar */}
            {hasPoss && (
              <div className="space-y-1 px-4 pt-3">
                <div className="flex h-2 overflow-hidden rounded-full bg-white/15">
                  <div style={{ width: `${homePoss}%`, backgroundColor: homeRGB }} />
                  <div style={{ width: `${awayPoss}%`, backgroundColor: awayRGB }} />
                </div>
                <div className="flex items-center justify-between text-[10px] font-semibold text-white/80">
                  <span className="tabular-nums">{homePoss}%</span>
                  <span className="uppercase tracking-wide text-white/55">
                    {t("stat.possession")}
                  </span>
                  <span className="tabular-nums">{awayPoss}%</span>
                </div>
              </div>
            )}
            {showFinal ? (
              <div className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white">
                <BarChart3 className="h-4 w-4" /> {t("stats.final")}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setStatsOpen((o) => !o)}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-semibold text-white"
              >
                <BarChart3 className="h-4 w-4" /> {t("stats.title")}
                <span className="ml-auto text-base text-white/70">
                  {statsOpen ? "−" : "+"}
                </span>
              </button>
            )}
            {(statsOpen || showFinal) && (
              <div className="space-y-2 px-4 pb-3">
                {!shownStats ? (
                  <div className="h-16 animate-pulse rounded bg-white/10" />
                ) : shownStats.length === 0 ? (
                  <p className="py-2 text-center text-sm text-white/70">
                    {t("stats.none")}
                  </p>
                ) : (
                  <>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-white/70">
                      <span className="truncate">{statHome}</span>
                      <span className="truncate text-right">{statAway}</span>
                    </div>
                    {shownStats.map((srow) => (
                      <div
                        key={srow.label}
                        className="flex items-center justify-between gap-2 border-b border-white/10 py-1.5 text-sm last:border-0"
                      >
                        <span className="w-12 font-bold tabular-nums">
                          {srow.home}
                        </span>
                        <span className="flex-1 text-center text-[11px] uppercase tracking-wide text-white/70">
                          {t(STAT_LABEL_KEY[srow.label] ?? "") || srow.label}
                        </span>
                        <span className="w-12 text-right font-bold tabular-nums">
                          {srow.away}
                        </span>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Key-events list (FotMob-style): each goal / card / VAR as a row, aligned to
// its team's side — home on the left, away on the right.
function HeroEvents({
  events,
  live,
}: {
  events: MatchEvent[];
  live: LiveMatch | null;
}) {
  const items = events.filter((e) => {
    const ty = e.type?.toLowerCase();
    if (ty === "goal") return e.detail !== "Missed Penalty";
    return ty === "card" || ty === "var";
  });
  if (!items.length) return null;

  const isHome = (e: MatchEvent) => !!live && e.teamName === live.homeName;
  const icon = (e: MatchEvent) => {
    const ty = e.type?.toLowerCase();
    if (ty === "goal") return <SoccerBall className="h-3.5 w-3.5 shrink-0" />;
    if (ty === "var")
      return (
        <span className="shrink-0 rounded bg-white/85 px-1 text-[8px] font-bold leading-tight text-black">
          VAR
        </span>
      );
    const red = /red/i.test(e.detail);
    return (
      <span
        className={cn(
          "inline-block h-3 w-2 shrink-0 rounded-[1px]",
          red ? "bg-red-500" : "bg-yellow-400",
        )}
      />
    );
  };
  const suffix = (e: MatchEvent) =>
    e.detail === "Penalty" ? " (P)" : e.detail === "Own Goal" ? " (OG)" : "";

  return (
    <div className="mx-auto mt-4 max-w-[460px] space-y-1">
      {items.slice(-12).map((e, i) => {
        const home = isHome(e);
        return (
          <div
            key={i}
            className={cn(
              "flex w-full items-center gap-1.5 text-sm",
              !home && "flex-row-reverse text-right",
            )}
          >
            <span className="shrink-0 tabular-nums font-bold text-white/80">
              {e.minute}
              {e.extra ? `+${e.extra}` : ""}&apos;
            </span>
            {icon(e)}
            <span className="min-w-0 flex-1 truncate text-white/90">
              {e.player}
              {suffix(e)}
              {e.assist ? (
                <span className="text-white/55"> · {e.assist}</span>
              ) : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function TeamSide({
  id,
  name,
  owner,
  stake,
  winner = false,
  dim = false,
}: {
  id: string | null;
  name: string;
  owner?: string;
  stake?: { points: number; rank: number };
  winner?: boolean; // emphasise the winning team in a recap
  dim?: boolean; // de-emphasise the losing team in a recap
}) {
  const { t } = useT();
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 text-center transition-opacity",
        dim && "opacity-55",
      )}
    >
      {id ? (
        <TeamCrest
          teamId={id}
          size="xl"
          className={cn(
            "ring-2",
            winner ? "ring-gold shadow-[0_0_20px_rgba(212,175,55,0.5)]" : "ring-white/30",
          )}
        />
      ) : (
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15 text-lg font-bold">
          ?
        </span>
      )}
      <span className="text-sm font-bold leading-tight drop-shadow-sm sm:text-base">
        {name}
      </span>
      <span
        className={cn(
          "inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-semibold",
          owner ? "bg-white/20 text-white" : "text-white/60",
        )}
      >
        <User className="h-3 w-3 shrink-0" />
        <span className="truncate">{owner ?? t("today.noOwner")}</span>
      </span>
      {owner && stake && stake.points > 0 && (
        <span className="text-[10px] font-semibold tabular-nums text-white/75">
          {stake.points} {t("lb.pts")} · #{stake.rank}
        </span>
      )}
    </div>
  );
}

// Compact match card for the horizontal "up next" / "results" rows.
function MatchMiniCard({
  f,
  live,
  owners,
  loc,
  t,
}: {
  f: FixtureLite;
  live?: LiveMatch | null;
  owners: Record<string, string>;
  loc: string;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const time =
    f.kickoff != null
      ? new Date(f.kickoff).toLocaleTimeString(loc, {
          hour: "numeric",
          minute: "2-digit",
        })
      : t("today.vs");

  // Score source priority: live API (in-play or final) → free results feed.
  const sameOrient = live ? live.homeId === f.home.id : true;
  const apiHome = live ? (sameOrient ? live.homeGoals : live.awayGoals) : 0;
  const apiAway = live ? (sameOrient ? live.awayGoals : live.homeGoals) : 0;
  const showApi = !!live && (live.inPlay || live.finished);
  const score: [number, number] | null = showApi
    ? [apiHome, apiAway]
    : f.score ?? null;
  const isLive = !!live && live.inPlay;
  const isDone = (!!live && live.finished) || f.played || !!f.score;

  const isTodayMatch = f.date === new Date().toLocaleDateString("en-CA");
  const dayLabel = isTodayMatch
    ? t("today.title")
    : new Date(`${f.date}T12:00:00`).toLocaleDateString(loc, {
        weekday: "short",
        day: "numeric",
        month: "short",
      });

  const homeOwner = f.home.id ? owners[f.home.id] : undefined;
  const awayOwner = f.away.id ? owners[f.away.id] : undefined;
  const flag = (s: { id: string | null }) =>
    s.id ? (
      <TeamCrest teamId={s.id} size="xs" />
    ) : (
      <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[9px] font-bold">
        ?
      </span>
    );

  return (
    <div className="w-[200px] shrink-0 rounded-xl border bg-card p-2.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {f.label}
          </div>
          <div
            className={
              "text-[10px] font-semibold " +
              (isTodayMatch ? "text-primary" : "text-muted-foreground")
            }
          >
            {dayLabel}
          </div>
        </div>
        {isLive ? (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {live!.minute != null ? `${live!.minute}'` : t("today.live")}
          </span>
        ) : isDone ? (
          <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
            {t("today.ft")}
          </span>
        ) : (
          <span className="shrink-0 text-[11px] font-bold text-foreground">
            {time}
          </span>
        )}
      </div>

      {/* one compact row: flag · HOME · vs/score · AWAY · flag */}
      <div className="flex items-center gap-1.5">
        {flag(f.home)}
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold">
          {teamName(f.home)}
        </span>
        <span className="shrink-0 px-0.5 text-[10px] font-bold tabular-nums text-muted-foreground">
          {score ? `${score[0]}-${score[1]}` : t("today.vs")}
        </span>
        <span className="min-w-0 flex-1 truncate text-right text-[12px] font-semibold">
          {teamName(f.away)}
        </span>
        {flag(f.away)}
      </div>

      {/* owners under each side */}
      {(homeOwner || awayOwner) && (
        <div className="mt-1 flex items-center justify-between gap-2 text-[9px] uppercase tracking-wide text-muted-foreground">
          <span className="min-w-0 truncate">{homeOwner ?? "—"}</span>
          <span className="min-w-0 truncate text-right">{awayOwner ?? "—"}</span>
        </div>
      )}
    </div>
  );
}
