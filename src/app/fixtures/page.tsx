"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { GROUP_IDS, teamsByGroup, getTeam } from "@/lib/data/teams";
import { fetchFixtures, type FixtureLite } from "@/lib/results-sync";
import type { GroupId } from "@/lib/types";

function teamName(side: { id: string | null; name: string }) {
  return side.id ? getTeam(side.id)?.name ?? side.name : side.name;
}

function FixturesInner() {
  const { t } = useT();
  const [tab, setTab] = useState<"groups" | "schedule">("groups");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">{t("fx.title")}</h1>
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 text-sm">
          {(["groups", "schedule"] as const).map((tb) => (
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
      ) : (
        <CalendarView />
      )}
    </div>
  );
}

function GroupCard({ group }: { group: GroupId }) {
  const { state } = usePool();
  const { t } = useT();
  const teams = teamsByGroup(group);

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
              <span className="w-3 text-center text-[11px] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <TeamCrest teamId={tm.id} size="md" />
              <span className="flex-1 truncate text-sm font-medium">{tm.name}</span>
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {r.groupWins}-{r.groupDraws}-{r.groupLosses}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function CalendarView() {
  const { t, locale } = useT();
  const loc = locale === "es" ? "es-MX" : "en-US";
  const [fixtures, setFixtures] = useState<FixtureLite[] | null>(null);
  const [loading, setLoading] = useState(true);

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

  const byDate = useMemo(() => {
    const groups: { date: string; matches: FixtureLite[] }[] = [];
    for (const f of fixtures ?? []) {
      const last = groups[groups.length - 1];
      if (last && last.date === f.date) last.matches.push(f);
      else groups.push({ date: f.date, matches: [f] });
    }
    return groups;
  }, [fixtures]);

  if (loading) {
    return (
      <Card>
        <CardContent className="space-y-3 p-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded bg-muted" />
          ))}
        </CardContent>
      </Card>
    );
  }
  if (!fixtures) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          {t("fx.calUnavailable")}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {byDate.map(({ date, matches }) => {
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
              {matches.map((f, i) => (
                <MatchRow key={i} f={f} loc={loc} t={t} />
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MatchRow({
  f,
  loc,
  t,
}: {
  f: FixtureLite;
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
  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <div className="w-16 shrink-0 text-center">
        {f.played ? (
          <span className="text-[10px] font-bold uppercase text-muted-foreground">
            {t("today.ft")}
          </span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground">{time}</span>
        )}
      </div>
      <div className="flex flex-1 items-center justify-end gap-2 text-right">
        <span className="truncate text-sm font-medium">{teamName(f.home)}</span>
        {f.home.id && <TeamCrest teamId={f.home.id} size="sm" />}
      </div>
      <div className="w-12 shrink-0 text-center">
        {f.score ? (
          <span className="font-mono text-sm font-bold tabular-nums">
            {f.score[0]}-{f.score[1]}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">vs</span>
        )}
      </div>
      <div className="flex flex-1 items-center gap-2">
        {f.away.id && <TeamCrest teamId={f.away.id} size="sm" />}
        <span className="truncate text-sm font-medium">{teamName(f.away)}</span>
      </div>
      <div className="hidden w-40 shrink-0 text-right text-[11px] text-muted-foreground sm:block">
        <div className="flex items-center justify-end gap-1">
          <MapPin className="h-3 w-3" /> <span className="truncate">{f.venue}</span>
        </div>
        <Badge variant="muted" className="mt-0.5">{f.label}</Badge>
      </div>
    </div>
  );
}

export default function FixturesPage() {
  return (
    <PublicShell>
      <FixturesInner />
    </PublicShell>
  );
}
