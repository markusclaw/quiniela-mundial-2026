"use client";

import { useMemo } from "react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { StandingRow } from "@/components/standing-row";
import {
  computeStandings,
  totalPot,
  ownedTeamIds,
  rankStandings,
  teamsAlive,
} from "@/lib/scoring";
import { formatMoney } from "@/lib/utils";

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("lb.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("lb.playersPot", {
            n: playing.length,
            pot: formatMoney(pot, state.settings.currency),
          })}
        </p>
      </div>

      <div className="space-y-2">
        {rankStandings(playing).map(({ s, rank }) => (
          <StandingRow
            key={s.participant.id}
            s={s}
            rank={rank}
            isMe={s.participant.id === me?.id}
            alive={teamsAlive(s.participant, state)}
            owned={ownedTeamIds(s.participant, state).length}
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

export default function LeaderboardPage() {
  return (
    <PublicShell>
      <LeaderboardInner />
    </PublicShell>
  );
}
