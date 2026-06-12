"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, ChevronDown, User, BarChart3 } from "lucide-react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GROUP_IDS, teamsByGroup, getTeam } from "@/lib/data/teams";
import { ownerMap, teamPoints } from "@/lib/scoring";
import { fetchFixtures, type FixtureLite } from "@/lib/results-sync";
import {
  fetchLive,
  fetchStats,
  findLiveFor,
  isLiveEnabled,
  type LiveMatch,
  type TeamStat,
} from "@/lib/live";
import type { GroupId, PoolState } from "@/lib/types";

type Tab = "upcoming" | "results" | "groups";

const STAT_LABEL_KEY: Record<string, string> = {
  "Ball Possession": "stat.possession",
  "Total Shots": "stat.shots",
  "Shots on Goal": "stat.shotsOn",
  "Corner Kicks": "stat.corners",
  Fouls: "stat.fouls",
  "Yellow Cards": "stat.yellow",
};

function teamName(side: { id: string | null; name: string }) {
  return side.id ? getTeam(side.id)?.name ?? side.name : side.name;
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

function FixturesInner() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("upcoming");
  const [fixtures, setFixtures] = useState<FixtureLite[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState<LiveMatch[]>([]);

  useEffect(() => {
    let on = true;
    fetchFixtures().then((f) => {
      if (!on) return;
      setFixtures(f);
      setLoading(false);
    });
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    if (!isLiveEnabled) return;
    let on = true;
    const load = () => fetchLive().then((l) => on && l && setLive(l));
    load();
    const id = setInterval(load, 30 * 1000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);

  const now = Date.now();
  const upcoming = useMemo(
    () =>
      (fixtures ?? [])
        .filter((f) => phaseOf(f, live, now) !== "done")
        .sort((a, b) => (a.kickoff ?? Infinity) - (b.kickoff ?? Infinity)),
    [fixtures, live, now],
  );
  const results = useMemo(
    () =>
      (fixtures ?? [])
        .filter((f) => phaseOf(f, live, now) === "done")
        .sort((a, b) => (b.kickoff ?? 0) - (a.kickoff ?? 0)),
    [fixtures, live, now],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("fx.title")}</h1>
        <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1 text-sm">
          {(["upcoming", "results", "groups"] as const).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={cn(
                "rounded-md px-3 py-1.5 font-semibold transition-colors",
                tab === tb ? "bg-background shadow-sm" : "text-muted-foreground",
              )}
            >
              {t(`fx.tab.${tb}`)}
            </button>
          ))}
        </div>
      </div>

      {tab === "groups" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GROUP_IDS.map((g) => (
            <GroupCard key={g} group={g} />
          ))}
        </div>
      ) : loading ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded bg-muted" />
            ))}
          </CardContent>
        </Card>
      ) : !fixtures ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {t("fx.calUnavailable")}
          </CardContent>
        </Card>
      ) : (
        <MatchList
          matches={tab === "upcoming" ? upcoming : results}
          live={live}
          recentFirst={tab === "results"}
          emptyKey={tab === "upcoming" ? "fx.noUpcoming" : "fx.noResults"}
        />
      )}
    </div>
  );
}

function MatchList({
  matches,
  live,
  recentFirst,
  emptyKey,
}: {
  matches: FixtureLite[];
  live: LiveMatch[];
  recentFirst: boolean;
  emptyKey: string;
}) {
  const { t, locale } = useT();
  const loc = locale === "es" ? "es-MX" : "en-US";

  const byDate = useMemo(() => {
    const order: string[] = [];
    const groups: Record<string, FixtureLite[]> = {};
    for (const f of matches) {
      if (!groups[f.date]) {
        groups[f.date] = [];
        order.push(f.date);
      }
      groups[f.date].push(f);
    }
    order.sort((a, b) => (recentFirst ? b.localeCompare(a) : a.localeCompare(b)));
    return order.map((date) => ({ date, matches: groups[date] }));
  }, [matches, recentFirst]);

  if (!matches.length) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          {t(emptyKey)}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {byDate.map(({ date, matches: ms }) => {
        const label = new Date(`${date}T12:00:00`).toLocaleDateString(loc, {
          weekday: "long",
          month: "long",
          day: "numeric",
        });
        return (
          <Card key={date} className="overflow-hidden">
            <div className="flex items-center gap-2 border-b bg-secondary/60 px-4 py-2.5">
              <CalendarDays className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold capitalize">{label}</span>
            </div>
            <div className="divide-y">
              {ms.map((f, i) => (
                <MatchHubRow
                  key={i}
                  f={f}
                  live={findLiveFor(live, f.home.id, f.away.id)}
                  loc={loc}
                  t={t}
                />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MatchHubRow({
  f,
  live,
  loc,
  t,
}: {
  f: FixtureLite;
  live: LiveMatch | null;
  loc: string;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const { state } = usePool();
  const [open, setOpen] = useState(false);
  const owners = ownerMap(state);
  const homeOwner = f.home.id ? owners[f.home.id] : undefined;
  const awayOwner = f.away.id ? owners[f.away.id] : undefined;

  const time =
    f.kickoff != null
      ? new Date(f.kickoff).toLocaleTimeString(loc, {
          hour: "numeric",
          minute: "2-digit",
        })
      : "";
  const sameOrient = live ? live.homeId === f.home.id : true;
  const apiHome = live ? (sameOrient ? live.homeGoals : live.awayGoals) : 0;
  const apiAway = live ? (sameOrient ? live.awayGoals : live.homeGoals) : 0;
  const showApi = !!live && (live.inPlay || live.finished);
  const score: [number, number] | null = showApi ? [apiHome, apiAway] : f.score ?? null;
  const isLive = !!live && live.inPlay;
  const isDone = (!!live && live.finished) || f.played || !!f.score;
  const expandable = isLive || isDone;

  return (
    <div>
      <button
        type="button"
        onClick={() => expandable && setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 px-4 py-2.5 text-left",
          expandable && "hover:bg-secondary/40",
        )}
      >
        <div className="w-12 shrink-0 text-center">
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
        {/* Teams stacked vertically — reads cleanly on mobile. */}
        <div className="min-w-0 flex-1 space-y-1">
          <HubTeamLine side={f.home} owner={homeOwner} goal={score ? score[0] : null} />
          <HubTeamLine side={f.away} owner={awayOwner} goal={score ? score[1] : null} />
        </div>
        <div className="hidden shrink-0 items-center gap-2 text-[11px] text-muted-foreground sm:flex">
          <Badge variant="muted">{f.label}</Badge>
        </div>
        {expandable && (
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-180",
            )}
          />
        )}
      </button>

      {open && (
        <MatchDetail
          f={f}
          live={live}
          state={state}
          loc={loc}
          t={t}
        />
      )}
    </div>
  );
}

function HubTeamLine({
  side,
  owner,
  goal,
}: {
  side: { id: string | null; name: string };
  owner?: string;
  goal: number | null;
}) {
  return (
    <div className="flex items-center gap-2">
      {side.id ? (
        <TeamCrest teamId={side.id} size="sm" />
      ) : (
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-muted text-xs">
          ?
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-tight">
          {teamName(side)}
        </span>
        {owner && (
          <span className="block truncate text-[10px] text-muted-foreground">
            {owner}
          </span>
        )}
      </span>
      {goal != null && (
        <span className="shrink-0 text-base font-extrabold tabular-nums">
          {goal}
        </span>
      )}
    </div>
  );
}

function MatchDetail({
  f,
  live,
  state,
  loc,
  t,
}: {
  f: FixtureLite;
  live: LiveMatch | null;
  state: PoolState;
  loc: string;
  t: (k: string, p?: Record<string, string | number>) => string;
}) {
  const owners = ownerMap(state);
  const fixtureId = live?.fixtureId ?? 0;
  const showStats = fixtureId > 0 && (live?.inPlay || live?.finished);

  const TeamLine = ({ side }: { side: { id: string | null; name: string } }) => {
    const owner = side.id ? owners[side.id] : undefined;
    const r = side.id ? state.results[side.id] : undefined;
    const pts = r ? teamPoints(r, state.scoring).total : 0;
    return (
      <div className="flex items-center gap-2 py-1.5">
        {side.id && <TeamCrest teamId={side.id} size="sm" />}
        <span className="flex-1 truncate text-sm font-medium">{teamName(side)}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <User className="h-3 w-3" />
          {owner ?? t("today.noOwner")}
        </span>
        <span className="w-14 text-right text-xs font-bold tabular-nums">
          {pts} {t("fx.pts")}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-3 border-t bg-secondary/30 px-4 py-3">
      <div className="divide-y rounded-lg border bg-card px-3">
        <TeamLine side={f.home} />
        <TeamLine side={f.away} />
      </div>
      {f.venue && (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" /> {f.venue}
        </div>
      )}
      {showStats && <StatsPanel fixtureId={fixtureId} t={t} loc={loc} />}
    </div>
  );
}

function StatsPanel({
  fixtureId,
  t,
}: {
  fixtureId: number;
  t: (k: string, p?: Record<string, string | number>) => string;
  loc: string;
}) {
  const [stats, setStats] = useState<TeamStat[] | null>(null);
  useEffect(() => {
    let on = true;
    fetchStats(fixtureId).then((s) => on && setStats(s));
    return () => {
      on = false;
    };
  }, [fixtureId]);

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-bold">
        <BarChart3 className="h-3.5 w-3.5 text-primary" /> {t("stats.title")}
      </div>
      {!stats ? (
        <div className="h-12 animate-pulse rounded bg-muted" />
      ) : stats.length === 0 ? (
        <p className="py-2 text-center text-xs text-muted-foreground">
          {t("stats.none")}
        </p>
      ) : (
        <div className="space-y-1">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex items-center justify-between gap-2 text-sm"
            >
              <span className="w-12 font-bold tabular-nums">{s.home}</span>
              <span className="flex-1 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
                {t(STAT_LABEL_KEY[s.label] ?? "") || s.label}
              </span>
              <span className="w-12 text-right font-bold tabular-nums">{s.away}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupCard({ group }: { group: GroupId }) {
  const { state } = usePool();
  const { t } = useT();
  const teams = teamsByGroup(group);
  const owners = ownerMap(state);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-primary px-3 py-2 text-primary-foreground">
        <span className="text-xs font-bold uppercase tracking-[0.18em]">
          {t("fx.group", { g: group })}
        </span>
        <span className="grid h-6 w-6 place-items-center rounded-md bg-white/20 text-sm font-extrabold">
          {group}
        </span>
      </div>
      <div className="divide-y">
        {teams.map((tm, i) => {
          const r = state.results[tm.id];
          const out = r.stageReached === "eliminated";
          return (
            <div
              key={tm.id}
              className={cn("flex items-center gap-2.5 px-3 py-2", out && "opacity-50")}
            >
              <span className="w-3 shrink-0 text-center text-[11px] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <TeamCrest teamId={tm.id} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{tm.name}</span>
                {owners[tm.id] && (
                  <span className="block truncate text-[10px] text-muted-foreground">
                    {owners[tm.id]}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {r.groupWins}-{r.groupDraws}-{r.groupLosses}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function FixturesPage() {
  return (
    <PublicShell>
      <FixturesInner />
    </PublicShell>
  );
}
