"use client";

import { useMemo, useState } from "react";
import { Medal, ChevronDown } from "lucide-react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { StageBadge } from "@/components/stage-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  computeStandings,
  totalPot,
  ownedTeamIds,
  type ParticipantStanding,
} from "@/lib/scoring";
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
        {playing.map((s, i) => (
          <StandingRow
            key={s.participant.id}
            s={s}
            rank={i + 1}
            isMe={s.participant.id === me?.id}
          />
        ))}
        {playing.length === 0 && (
          <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
            {t("lb.empty")}
          </p>
        )}
      </div>
    </div>
  );
}

function StandingRow({
  s,
  rank,
  isMe,
}: {
  s: ParticipantStanding;
  rank: number;
  isMe: boolean;
}) {
  const { state } = usePool();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const teams = ownedTeamIds(s.participant, state);
  const cur = state.settings.currency;

  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        isMe && "ring-2 ring-primary",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 p-3 text-left hover:bg-secondary/40 sm:p-4"
      >
        <RankBadge rank={rank} active={s.totalPoints > 0} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-semibold">{s.participant.name}</span>
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
        <div className="shrink-0 text-right">
          <div className="text-xl font-extrabold leading-none">
            {s.totalPoints}
          </div>
          <div className="text-[11px] text-muted-foreground">{t("lb.pts")}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {t("home.goalsLeaderSub", { goals: s.totalGoals })}
          </div>
          <div className="mt-1 text-sm font-semibold text-primary">
            {formatMoney(s.potShare, cur)}
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="border-t bg-secondary/30 px-3 py-2 sm:px-4">
          {s.teamBreakdowns.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              {t("lb.empty")}
            </p>
          ) : (
            s.teamBreakdowns.map((b) => {
              const r = state.results[b.teamId];
              return (
                <div
                  key={b.teamId}
                  className="flex items-center gap-2 border-b py-2 last:border-0"
                >
                  <TeamCrest teamId={b.teamId} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {getTeam(b.teamId)?.name}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
                      <span className="font-mono tabular-nums">
                        {r.groupWins}-{r.groupDraws}-{r.groupLosses}
                      </span>
                      <span>
                        · {t("home.goalsLeaderSub", { goals: r.goalsFor ?? 0 })}
                      </span>
                      <StageBadge stage={r.stageReached} />
                      {b.multiplierApplied && (
                        <Badge variant="gold">×{state.scoring.underdogMultiplier}</Badge>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 text-right text-sm font-bold tabular-nums">
                    {b.total}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                      {t("lb.pts")}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
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
