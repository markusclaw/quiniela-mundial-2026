"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GROUP_IDS, teamsByGroup } from "@/lib/data/teams";
import { GROUP_STAGE_WINDOW, KNOCKOUT_INFO } from "@/lib/data/fixtures";
import type { GroupId } from "@/lib/types";

function FixturesInner() {
  const { state, me } = usePool();
  const { t } = useT();
  const [tab, setTab] = useState<"groups" | "schedule">("groups");

  const myTeams = new Set(
    state.packages.find((p) => p.id === me?.packageId)?.teamIds ?? [],
  );

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
            <GroupCard key={g} group={g} myTeams={myTeams} />
          ))}
        </div>
      ) : (
        <ScheduleView />
      )}
    </div>
  );
}

function GroupCard({
  group,
  myTeams,
}: {
  group: GroupId;
  myTeams: Set<string>;
}) {
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
          const owned = myTeams.has(tm.id);
          const out = r.stageReached === "eliminated";
          return (
            <div
              key={tm.id}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2",
                owned && "bg-primary/5",
                out && "opacity-50",
              )}
            >
              <span className="w-3 text-center text-[11px] font-semibold text-muted-foreground">
                {i + 1}
              </span>
              <TeamCrest teamId={tm.id} size="md" />
              <span className="flex-1 truncate text-sm font-medium">
                {tm.name}
              </span>
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

function ScheduleView() {
  const { t } = useT();
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <div className="flex items-center gap-2 rounded-md bg-primary/10 p-3 text-sm font-semibold text-primary">
          <CalendarDays className="h-4 w-4" />
          {t("fx.groupStage", { window: GROUP_STAGE_WINDOW })}
        </div>
        {KNOCKOUT_INFO.map((k) => (
          <div
            key={k.key}
            className="flex items-center justify-between border-b py-3 last:border-0"
          >
            <span className="font-medium">{t(`ko.${k.key}`)}</span>
            <span className="text-sm text-muted-foreground">{k.dates}</span>
          </div>
        ))}
        <p className="pt-2 text-xs text-muted-foreground">{t("fx.advanceNote")}</p>
      </CardContent>
    </Card>
  );
}

export default function FixturesPage() {
  return (
    <RequireAuth>
      <FixturesInner />
    </RequireAuth>
  );
}
