"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Trophy, Users, Crown, ArrowRight, Target } from "lucide-react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { MatchdayToday } from "@/components/matchday-today";
import { StandingRow } from "@/components/standing-row";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import {
  computeStandings,
  totalPot,
  ownedTeamIds,
  rankStandings,
} from "@/lib/scoring";

function DashboardInner() {
  const { state, me } = usePool();
  const { t } = useT();
  const standings = useMemo(() => computeStandings(state), [state]);
  const pot = totalPot(state);
  const playing = standings.filter(
    (s) => ownedTeamIds(s.participant, state).length > 0,
  );
  // Standings on the home page only list players who have actually scored,
  // ranked with ties (1,1,3,…); top 10.
  const ranked = rankStandings(
    playing.filter((s) => s.totalPoints > 0),
  ).slice(0, 10);
  // Only crown a leader once someone has actually scored points.
  const leader = playing[0]?.totalPoints > 0 ? playing[0] : null;
  const goalsTop = [...playing].sort((a, b) => b.totalGoals - a.totalGoals)[0];
  const goalsLeader = goalsTop?.totalGoals > 0 ? goalsTop : null;

  return (
    <div className="space-y-6">
      <MatchdayToday />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
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
        <div className="flex items-center justify-between border-b bg-secondary/60 px-4 py-2.5">
          <span className="text-sm font-bold">{t("home.standings")}</span>
          <Link
            href="/leaderboard"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {t("home.fullTable")} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {ranked.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("home.noRanked")}
          </p>
        ) : (
          <div className="divide-y">
            {ranked.map(({ s, rank }) => (
              <StandingRow
                key={s.participant.id}
                s={s}
                rank={rank}
                isMe={s.participant.id === me?.id}
                bare
              />
            ))}
          </div>
        )}
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

export default function DashboardPage() {
  return (
    <PublicShell>
      <DashboardInner />
    </PublicShell>
  );
}
