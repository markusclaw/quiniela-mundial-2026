"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Trophy, Users, Crown, Medal, ArrowRight, Target } from "lucide-react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { MatchdayToday } from "@/components/matchday-today";
import { TeamCrest } from "@/components/team-crest";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";
import { computeStandings, totalPot, ownedTeamIds } from "@/lib/scoring";
import { getTeam } from "@/lib/data/teams";

function DashboardInner() {
  const { state } = usePool();
  const { t } = useT();
  const standings = useMemo(() => computeStandings(state), [state]);
  const pot = totalPot(state);
  const playing = standings.filter(
    (s) => ownedTeamIds(s.participant, state).length > 0,
  );
  // Only crown a leader once someone has actually scored points.
  const leader = playing[0]?.totalPoints > 0 ? playing[0] : null;
  const goalsTop = [...playing].sort((a, b) => b.totalGoals - a.totalGoals)[0];
  const goalsLeader = goalsTop?.totalGoals > 0 ? goalsTop : null;

  return (
    <div className="space-y-6">
      <MatchdayToday />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Crown}
          label={t("home.pot")}
          value={formatMoney(pot, state.settings.currency)}
          sub={t("home.potSub")}
          highlight
        />
        <StatCard
          icon={Users}
          label={t("home.players")}
          value={String(playing.length)}
          sub={t("home.playersSub")}
        />
        <StatCard
          icon={Trophy}
          label={t("home.leader")}
          value={leader?.participant.name ?? "—"}
          sub={leader ? t("home.leaderSub", { pts: leader.totalPoints }) : ""}
        />
        <StatCard
          icon={Target}
          label={t("home.goalsLeader")}
          value={goalsLeader?.participant.name ?? "—"}
          sub={
            goalsLeader
              ? t("home.goalsLeaderSub", { goals: goalsLeader.totalGoals })
              : ""
          }
        />
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-secondary/60 px-5 py-3">
          <span className="text-sm font-bold">{t("home.standings")}</span>
          <Link
            href="/leaderboard"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {t("home.fullTable")} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <CardContent className="divide-y p-0">
          {playing.slice(0, 5).map((s, i) => {
            const teams = ownedTeamIds(s.participant, state);
            return (
              <div key={s.participant.id} className="flex items-center gap-3 px-5 py-3">
                <RankBadge rank={i + 1} active={s.totalPoints > 0} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{s.participant.name}</div>
                  <div className="mt-1 flex items-center gap-1.5">
                    {teams.map((tid) => {
                      const out = state.results[tid]?.stageReached === "eliminated";
                      return (
                        <span
                          key={tid}
                          title={getTeam(tid)?.name}
                          className={cn(out && "opacity-30 grayscale")}
                        >
                          <TeamCrest teamId={tid} size="sm" />
                        </span>
                      );
                    })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold leading-none">
                    {s.totalPoints}
                  </div>
                  <div className="text-sm font-semibold text-primary">
                    {formatMoney(s.potShare, state.settings.currency)}
                  </div>
                </div>
              </div>
            );
          })}
          {playing.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-muted-foreground">
              {t("lb.empty")}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <div className="mt-1 truncate text-2xl font-extrabold tracking-tight">
          {value}
        </div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function RankBadge({ rank, active = true }: { rank: number; active?: boolean }) {
  if (rank <= 3 && active) {
    const colors = ["text-gold", "text-zinc-400", "text-amber-700"];
    return (
      <div className="grid h-9 w-9 shrink-0 place-items-center">
        <Medal className={cn("h-6 w-6", colors[rank - 1])} />
      </div>
    );
  }
  return (
    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
      {rank}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <PublicShell>
      <DashboardInner />
    </PublicShell>
  );
}
