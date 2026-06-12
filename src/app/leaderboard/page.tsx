"use client";

import { useMemo } from "react";
import { Medal } from "lucide-react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { computeStandings, totalPot, ownedTeamIds } from "@/lib/scoring";
import { getTeam } from "@/lib/data/teams";
import { formatMoney, cn } from "@/lib/utils";

function LeaderboardInner() {
  const { state, me } = usePool();
  const { t } = useT();
  const standings = useMemo(() => computeStandings(state), [state]);
  const pot = totalPot(state);
  const playing = standings.filter(
    (s) => ownedTeamIds(s.participant, state).length > 0,
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("lb.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("lb.playersPot", {
              n: playing.length,
              pot: formatMoney(pot, state.settings.currency),
            })}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {playing.map((s) => {
          const teams = ownedTeamIds(s.participant, state);
          const isMe = s.participant.id === me?.id;
          return (
            <Card
              key={s.participant.id}
              className={cn(
                "overflow-hidden transition-colors",
                isMe && "ring-2 ring-primary",
              )}
            >
              <CardContent className="flex items-center gap-3 p-3 sm:p-4">
                <RankBadge rank={s.rank} active={s.totalPoints > 0} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold">
                      {s.participant.name}
                    </span>
                    {isMe && <Badge variant="secondary">{t("lb.you")}</Badge>}
                    {s.participant.isModerator && (
                      <Badge variant="muted">{t("lb.organizer")}</Badge>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                    {teams.map((tid) => (
                      <FlagDot key={tid} teamId={tid} state={state} />
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xl font-extrabold leading-none">
                    {s.totalPoints}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("lb.pts")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-primary">
                    {formatMoney(s.potShare, state.settings.currency)}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {playing.length === 0 && (
          <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            {t("lb.empty")}
          </p>
        )}
      </div>
    </div>
  );
}

function FlagDot({
  teamId,
  state,
}: {
  teamId: string;
  state: ReturnType<typeof usePool>["state"];
}) {
  const result = state.results[teamId];
  const team = getTeam(teamId);
  const out = result?.stageReached === "eliminated";
  return (
    <span
      title={team?.name}
      className={cn("transition-opacity", out && "opacity-30 grayscale")}
    >
      <TeamCrest teamId={teamId} size="sm" />
    </span>
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

export default function LeaderboardPage() {
  return (
    <PublicShell>
      <LeaderboardInner />
    </PublicShell>
  );
}
