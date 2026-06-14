"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Trophy, Users, Crown, ArrowRight } from "lucide-react";
import { SoccerBall } from "@/components/ui/soccer-ball";
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
  amountCollected,
  ownedTeamIds,
  rankStandings,
  type ParticipantStanding,
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
  // Leaders — include everyone tied at the top (only once someone has scored).
  const topBy = (sel: (s: ParticipantStanding) => number): ParticipantStanding[] => {
    const max = Math.max(0, ...playing.map(sel));
    return max > 0 ? playing.filter((s) => sel(s) === max) : [];
  };
  const pointsLeaders = topBy((s) => s.totalPoints);
  const goalsLeaders = topBy((s) => s.totalGoals);

  const collected = amountCollected(state);
  const outstanding = Math.max(0, pot - collected);

  return (
    <div className="space-y-6">
      <MatchdayToday />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <PotCard
          pot={pot}
          collected={collected}
          outstanding={outstanding}
          cur={state.settings.currency}
        />
        <StatCard
          icon={Users}
          label={t("home.players")}
          value={String(playing.length)}
          sub={t("home.playersSub")}
        />
        <LeaderCard
          icon={Trophy}
          label={t("home.leader")}
          leaders={pointsLeaders.map((s) => s.participant.name)}
          sub={
            pointsLeaders.length
              ? t("home.leaderSub", { pts: pointsLeaders[0].totalPoints })
              : ""
          }
        />
        <LeaderCard
          icon={SoccerBall}
          label={t("home.goalsLeader")}
          leaders={goalsLeaders.map((s) => s.participant.name)}
          sub={
            goalsLeaders.length
              ? t("home.goalsLeaderSub", { goals: goalsLeaders[0].totalGoals })
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

function PotCard({
  pot,
  collected,
  outstanding,
  cur,
}: {
  pot: number;
  collected: number;
  outstanding: number;
  cur: string;
}) {
  const { t } = useT();
  const pct = pot > 0 ? Math.min(100, Math.round((collected / pot) * 100)) : 0;
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Crown className="h-4 w-4" /> {t("home.pot")}
        </div>
        <div className="mt-1 truncate text-2xl font-extrabold tracking-tight">
          {formatMoney(pot, cur)}
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground">
          {formatMoney(outstanding, cur)} {t("home.owed")}
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderCard({
  icon: Icon,
  label,
  leaders,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  leaders: string[];
  sub: string;
}) {
  const { t } = useT();
  const value =
    leaders.length === 0
      ? "—"
      : leaders.length <= 3
        ? leaders.join(" · ")
        : `${leaders.length} ${t("home.tied")}`;
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <div className="mt-1 line-clamp-2 text-lg font-extrabold leading-tight tracking-tight">
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
