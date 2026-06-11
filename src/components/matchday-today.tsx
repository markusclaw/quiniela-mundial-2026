"use client";

import { useEffect, useMemo, useState } from "react";
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
    const load = () => fetchLive().then((l) => on && setLive(l));
    load();
    const id = setInterval(load, LIVE_MS);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);

  const owners = useMemo(() => ownerMap(state), [state]);

  const { list, isToday } = useMemo(() => {
    if (!fixtures) return { list: [] as FixtureLite[], isToday: false };
    const today = new Date().toLocaleDateString("en-CA");
    const todays = fixtures.filter((f) => f.date === today);
    if (todays.length) return { list: todays, isToday: true };
    const future = fixtures.filter((f) => f.date > today);
    const nextDate = future[0]?.date;
    return { list: future.filter((f) => f.date === nextDate), isToday: false };
  }, [fixtures]);

  // Pick the headline "main event" of the window.
  const featured = useMemo(() => {
    if (!list.length) return null;
    const score = (f: FixtureLite) => {
      const rank = getTeam(f.home.id ?? "")?.fifaRank ?? 999;
      const rank2 = getTeam(f.away.id ?? "")?.fifaRank ?? 999;
      const best = Math.min(rank, rank2);
      return ROUND_RANK(f) * 1000 + (200 - Math.min(best, 200));
    };
    return [...list].sort((a, b) => score(b) - score(a))[0];
  }, [list]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="h-28 animate-pulse rounded-lg bg-muted" />
        </CardContent>
      </Card>
    );
  }
  if (!fixtures || !featured) return null;

  const rest = list.filter((f) => f !== featured);
  const featuredLive = findLiveFor(live, featured.home.id, featured.away.id);

  return (
    <div className="space-y-4">
      <FeaturedMatch
        fixture={featured}
        isToday={isToday}
        owners={owners}
        loc={loc}
        live={featuredLive}
      />
      {featuredLive && featuredLive.fixtureId > 0 &&
        (featuredLive.inPlay || featuredLive.finished) && (
          <LiveStats match={featuredLive} />
        )}
      {rest.length > 0 && (
        <Card className="overflow-hidden">
          <div className="flex items-center gap-2 border-b bg-secondary/60 px-5 py-2.5">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span className="text-sm font-bold">
              {isToday ? t("today.title") : t("today.upNext")}
            </span>
          </div>
          <CardContent className="divide-y p-0">
            {rest.map((f, i) => (
              <MatchRow
                key={i}
                f={f}
                live={findLiveFor(live, f.home.id, f.away.id)}
                owners={owners}
                loc={loc}
                t={t}
              />
            ))}
          </CardContent>
        </Card>
      )}
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
  // waiting on a score source to publish the final.
  const MATCH_WINDOW = 2.5 * 3600 * 1000;
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
              <>
                <div className="text-4xl font-extrabold tracking-tight text-white/60 sm:text-6xl">
                  –<span className="px-1 text-white/30">·</span>–
                </div>
                <div className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-white/70">
                  {t("today.pending")}
                </div>
              </>
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

function MatchRow({
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
      : "";
  const homeOwner = f.home.id ? owners[f.home.id] : undefined;
  const awayOwner = f.away.id ? owners[f.away.id] : undefined;

  // Score source priority: live API (in-play or final) → free results feed.
  const sameOrient = live ? live.homeId === f.home.id : true;
  const apiHome = live ? (sameOrient ? live.homeGoals : live.awayGoals) : 0;
  const apiAway = live ? (sameOrient ? live.awayGoals : live.homeGoals) : 0;
  const showApi = !!live && (live.inPlay || live.finished);
  const score: [number, number] | null = showApi
    ? [apiHome, apiAway]
    : f.score ?? null;
  const isLive = !!live && live.inPlay;
  const isDone = (!!live && live.finished) || f.played;

  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <div className="w-14 shrink-0 text-center">
        {isLive ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase text-primary">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
            </span>
            {live!.minute != null ? `${live!.minute}'` : t("today.live")}
          </span>
        ) : isDone ? (
          <span className="text-[10px] font-bold uppercase text-muted-foreground">
            {t("today.ft")}
          </span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">{time}</span>
        )}
      </div>
      <div className="flex flex-1 items-center justify-end gap-2 text-right">
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{teamName(f.home)}</span>
          {homeOwner && (
            <span className="block truncate text-[10px] text-muted-foreground">
              {homeOwner}
            </span>
          )}
        </span>
        {f.home.id && <TeamCrest teamId={f.home.id} size="sm" />}
      </div>
      <div className="shrink-0 px-1 text-center">
        {score ? (
          <span className="font-mono text-sm font-bold tabular-nums">
            {score[0]}-{score[1]}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">vs</span>
        )}
      </div>
      <div className="flex flex-1 items-center gap-2">
        {f.away.id && <TeamCrest teamId={f.away.id} size="sm" />}
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{teamName(f.away)}</span>
          {awayOwner && (
            <span className="block truncate text-[10px] text-muted-foreground">
              {awayOwner}
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
