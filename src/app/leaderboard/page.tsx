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
  KO_STAGES,
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

      <ColumnLegend />

      <div className="space-y-2">
        {rankStandings(playing).map(({ s, rank }) => (
          <StandingRow
            key={s.participant.id}
            s={s}
            rank={rank}
            isMe={s.participant.id === me?.id}
            alive={teamsAlive(s.participant, state)}
            owned={ownedTeamIds(s.participant, state).length}
            detailed
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

// Explains the full-detail columns: the group record (PJ/G/E/P/GF/GC/DG) then
// the points ledger (group points + each knockout round) — a subtle inline line.
function ColumnLegend() {
  const { t } = useT();
  const codes = ["mp", "w", "d", "l", "gf", "ga", "gd"] as const;
  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-1 text-[10px] leading-tight text-muted-foreground">
      {codes.map((c) => (
        <span key={c}>
          <span className="font-semibold text-foreground/70">{t(`tbl.${c}`)}</span>{" "}
          {t(`tbl.legend.${c}`)}
        </span>
      ))}
      <span>
        <span className="font-semibold text-foreground/70">{t("tbl.grp")}</span>{" "}
        {t("tbl.legend.grp")}
      </span>
      {KO_STAGES.map((st) => (
        <span key={st}>
          <span className="font-semibold text-foreground/70">
            {t(`stageShort.${st}`)}
          </span>{" "}
          {t(`stage.${st}`)}
        </span>
      ))}
      <span>
        <span className="font-semibold text-foreground/70">{t("tbl.pts")}</span>{" "}
        {t("tbl.legend.ptsTotal")}
      </span>
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
