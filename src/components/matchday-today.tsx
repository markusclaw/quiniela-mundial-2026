"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { CalendarDays, MapPin, Radio, User, BarChart3 } from "lucide-react";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTeam } from "@/lib/data/teams";
import { ownerMap } from "@/lib/scoring";
import { fetchFixtures, type FixtureLite } from "@/lib/results-sync";
import {
  fetchLive,
  fetchStats,
  findLiveFor,
  isLiveEnabled,
  type LiveMatch,
  type TeamStat,
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

function phaseOf(
  f: FixtureLite,
  live: LiveMatch[],
  now: number,
): "live" | "upcoming" | "done" {
  const lm = findLiveFor(live, f.home.id, f.away.id);
  if (lm?.inPlay) return "live";
  if (lm?.finished || f.played || f.score) return "done";
  if (f.kickoff != null && f.kickoff <= now) {
    const since = now - f.kickoff;
    const win = (f.isKnockout ? 3.25 : 2.5) * 3600 * 1000;
    return since <= win ? "live" : "done";
  }
  return "upcoming";
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

  const owners = useMemo(() => ownerMap(state), [state]);

  // Build a forward-looking feed: a live match headlines; otherwise the next
  // upcoming kickoff does. The "up next" list shows the matches that come
  // AFTER the hero (across days), so a finished game never sits up top.
  // Today's finished results get their own compact strip below.
  const { hero, rest, results, heroToday } = useMemo(() => {
    const empty = {
      hero: null as FixtureLite | null,
      rest: [] as FixtureLite[],
      results: [] as FixtureLite[],
      heroToday: false,
    };
    if (!fixtures || !fixtures.length) return empty;
    const now = Date.now();
    const today = new Date().toLocaleDateString("en-CA");
    const byTime = (a: FixtureLite, b: FixtureLite) =>
      (a.kickoff ?? Infinity) - (b.kickoff ?? Infinity);

    const liveOnes = fixtures.filter((f) => phaseOf(f, live, now) === "live");
    const upcoming = fixtures
      .filter((f) => phaseOf(f, live, now) === "upcoming")
      .sort(byTime);
    const finishedToday = fixtures
      .filter((f) => phaseOf(f, live, now) === "done" && f.date === today)
      .sort((a, b) => (b.kickoff ?? 0) - (a.kickoff ?? 0));

    let h: FixtureLite | null = null;
    if (liveOnes.length)
      h = [...liveOnes].sort((a, b) => prominence(b) - prominence(a))[0];
    else if (upcoming.length) h = upcoming[0];
    else h = finishedToday[0] ?? null;
    if (!h) return empty;

    const restLive = liveOnes.filter((f) => f !== h);
    const restUpcoming = upcoming.filter((f) => f !== h);
    return {
      hero: h,
      rest: [...restLive, ...restUpcoming].slice(0, 6),
      results: finishedToday.filter((f) => f !== h),
      heroToday: h.date === today,
    };
  }, [fixtures, live]);

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

  const heroLive = findLiveFor(live, hero.home.id, hero.away.id);

  return (
    <div className="space-y-4">
      <FeaturedMatch
        fixture={hero}
        isToday={heroToday}
        owners={owners}
        loc={loc}
        live={heroLive}
      />
      {heroLive && heroLive.fixtureId > 0 &&
        (heroLive.inPlay || heroLive.finished) && (
          <LiveStats match={heroLive} />
        )}
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
      {results.length > 0 && (
        <MiniCardRow
          title={t("today.results")}
          icon={<CalendarDays className="h-4 w-4 text-muted-foreground" />}
          matches={results}
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

function fmtCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function FeaturedMatch({
  fixture: f,
  isToday,
  owners,
  loc,
  live,
}: {
  fixture: FixtureLite;
  isToday: boolean;
  owners: Record<string, string>;
  loc: string;
  live?: LiveMatch | null;
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

  return (
    <div className="pitch-stripes relative overflow-hidden rounded-xl text-primary-foreground">
      <div className="relative z-10 p-5 sm:p-7">
        <div className="mb-5 flex flex-col items-center gap-1.5 text-center">
          {showLive ? (
            <Badge variant="gold" className="gap-1">
              <Radio className="h-3 w-3" /> {t("today.live")}
              {live!.minute != null ? ` ${live!.minute}'` : ""}
            </Badge>
          ) : showFinal || f.played || pending ? (
            <Badge variant="gold" className="gap-1">
              <Radio className="h-3 w-3" /> {t("today.ft")}
            </Badge>
          ) : (
            <span className="rounded-full bg-white/15 px-3 py-1 text-[11px] font-semibold">
              {isToday ? t("today.title") : dateLabel}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 items-start gap-2">
          <TeamSide id={f.home.id} name={teamName(f.home)} owner={f.home.id ? owners[f.home.id] : undefined} />

          <div className="flex flex-col items-center justify-center pt-2">
            {showLive ? (
              <div className="text-4xl font-extrabold tracking-tight sm:text-6xl">
                {liveHome}<span className="px-1 text-white/50">-</span>{liveAway}
              </div>
            ) : showFinal ? (
              <div className="text-4xl font-extrabold tracking-tight sm:text-6xl">
                {finalScore![0]}<span className="px-1 text-white/50">-</span>{finalScore![1]}
              </div>
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

          <TeamSide id={f.away.id} name={teamName(f.away)} owner={f.away.id ? owners[f.away.id] : undefined} />
        </div>

        <div className="mt-5 flex flex-col items-center gap-0.5 text-center text-xs text-white/75">
          {f.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {f.venue}
            </span>
          )}
          <span className="font-medium">
            {t("brand.event")} · {f.label}
          </span>
        </div>
      </div>
    </div>
  );
}

function LiveStats({ match }: { match: LiveMatch }) {
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState<TeamStat[] | null>(null);

  useEffect(() => {
    if (!open || stats) return;
    fetchStats(match.fixtureId).then(setStats);
  }, [open, stats, match.fixtureId]);

  const homeName = match.homeId
    ? getTeam(match.homeId)?.name ?? match.homeName
    : match.homeName;
  const awayName = match.awayId
    ? getTeam(match.awayId)?.name ?? match.awayName
    : match.awayName;

  return (
    <Card className="overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-5 py-3 text-left text-sm font-bold"
      >
        <BarChart3 className="h-4 w-4 text-primary" /> {t("stats.title")}
        <span className="ml-auto text-base text-muted-foreground">
          {open ? "−" : "+"}
        </span>
      </button>
      {open && (
        <CardContent className="space-y-2 pt-0">
          {!stats ? (
            <div className="h-16 animate-pulse rounded bg-muted" />
          ) : stats.length === 0 ? (
            <p className="py-3 text-center text-sm text-muted-foreground">
              {t("stats.none")}
            </p>
          ) : (
            <>
              <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
                <span className="truncate">{homeName}</span>
                <span className="truncate text-right">{awayName}</span>
              </div>
              {stats.map((srow) => (
                <div
                  key={srow.label}
                  className="flex items-center justify-between gap-2 border-b py-1.5 text-sm last:border-0"
                >
                  <span className="w-12 font-bold tabular-nums">{srow.home}</span>
                  <span className="flex-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t(STAT_LABEL_KEY[srow.label] ?? "") || srow.label}
                  </span>
                  <span className="w-12 text-right font-bold tabular-nums">
                    {srow.away}
                  </span>
                </div>
              ))}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function TeamSide({
  id,
  name,
  owner,
}: {
  id: string | null;
  name: string;
  owner?: string;
}) {
  const { t } = useT();
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      {id ? (
        <TeamCrest teamId={id} size="xl" className="ring-2 ring-white/30" />
      ) : (
        <span className="grid h-14 w-14 place-items-center rounded-full bg-white/15 text-lg font-bold">
          ?
        </span>
      )}
      <span className="text-sm font-bold leading-tight sm:text-base">{name}</span>
      <span className="flex items-center gap-1 text-[11px] text-white/70">
        <User className="h-3 w-3" />
        {owner ?? t("today.noOwner")}
      </span>
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

  const side = (
    s: { id: string | null; name: string },
    goals: number | null,
  ) => {
    const owner = s.id ? owners[s.id] : undefined;
    return (
      <div className="flex items-center gap-2">
        {s.id ? (
          <TeamCrest teamId={s.id} size="sm" />
        ) : (
          <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-xs">
            ?
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight">
            {teamName(s)}
          </span>
          {owner && (
            <span className="block truncate text-[10px] text-muted-foreground">
              {owner}
            </span>
          )}
        </span>
        <span className="ml-auto text-base font-extrabold tabular-nums">
          {goals != null ? goals : ""}
        </span>
      </div>
    );
  };

  return (
    <div className="w-[200px] shrink-0 rounded-xl border bg-card p-3 shadow-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {f.label}
        </span>
        {isLive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {live!.minute != null ? `${live!.minute}'` : t("today.live")}
          </span>
        ) : isDone ? (
          <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted-foreground">
            {t("today.ft")}
          </span>
        ) : (
          <span className="text-[11px] font-bold text-foreground">{time}</span>
        )}
      </div>
      <div className="space-y-1.5">
        {side(f.home, score ? score[0] : null)}
        {side(f.away, score ? score[1] : null)}
      </div>
    </div>
  );
}
