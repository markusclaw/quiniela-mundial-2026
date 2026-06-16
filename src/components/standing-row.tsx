"use client";

import { useState } from "react";
import { Medal, ChevronDown } from "lucide-react";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ownedTeamIds, type ParticipantStanding } from "@/lib/scoring";
import { getTeam } from "@/lib/data/teams";
import { formatMoney, cn } from "@/lib/utils";

export function RankBadge({
  rank,
  active = true,
}: {
  rank: number;
  active?: boolean;
}) {
  if (rank <= 3 && active) {
    const colors = ["text-gold", "text-zinc-400", "text-amber-700"];
    return (
      <div className="grid h-8 w-8 shrink-0 place-items-center">
        <Medal className={cn("h-5 w-5", colors[rank - 1])} />
      </div>
    );
  }
  return (
    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
      {rank}
    </div>
  );
}

/** Expandable standings row: tap to reveal a per-team stats table. */
export function StandingRow({
  s,
  rank,
  isMe,
  bare = false,
  alive,
  owned,
}: {
  s: ParticipantStanding;
  rank: number;
  isMe: boolean;
  bare?: boolean; // render without a Card wrapper (for a shared single card)
  alive?: number; // teams still in the knockouts
  owned?: number; // total teams owned
}) {
  const { state } = usePool();
  const { t } = useT();
  const [open, setOpen] = useState(false);
  const teams = ownedTeamIds(s.participant, state);
  const cur = state.settings.currency;

  // Fixed widths so every expanded table lines its columns up identically.
  const numTh = "w-8 px-0.5 py-1 text-center font-semibold";
  const numTd = "w-8 px-0.5 py-1.5 text-center tabular-nums";

  const inner = (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 px-2.5 py-2 text-left hover:bg-secondary/40"
      >
        <RankBadge rank={rank} active={s.totalPoints > 0} />
        {/* Name + crests on a single row for compactness. */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <span className="max-w-[42%] shrink-0 truncate text-[13px] font-semibold leading-tight sm:max-w-[55%]">
            {s.participant.name}
          </span>
          {isMe && <Badge variant="secondary">{t("lb.you")}</Badge>}
          <div className="flex min-w-0 items-center gap-0.5 overflow-x-auto no-scrollbar">
            {teams.map((tid) => {
              const out = state.results[tid]?.stageReached === "eliminated";
              return (
                <span
                  key={tid}
                  title={getTeam(tid)?.name}
                  className={cn("shrink-0", out && "opacity-30 grayscale")}
                >
                  <TeamCrest teamId={tid} size="xs" />
                </span>
              );
            })}
          </div>
        </div>
        <div className="shrink-0 text-right leading-tight">
          <div className="text-sm font-extrabold">
            {s.totalPoints}
            <span className="ml-0.5 text-[10px] font-normal text-muted-foreground">
              {t("lb.pts")}
            </span>
          </div>
          <div className="text-[11px] font-semibold text-primary">
            {formatMoney(s.potShare, cur)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {t("home.goalsLeaderSub", { goals: s.totalGoals })}
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
        <div className="border-t bg-secondary/30">
          {alive !== undefined && alive > 0 && (
            <div className="flex items-center gap-1.5 px-3 pt-2 text-[11px] font-medium text-primary">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary" />
              {t("home.alive", { n: alive })}
              {owned !== undefined && (
                <span className="text-muted-foreground">/ {owned}</span>
              )}
            </div>
          )}
          {s.teamBreakdowns.length === 0 ? (
            <p className="py-3 text-center text-xs text-muted-foreground">
              {t("lb.empty")}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-fixed text-sm">
                <thead>
                  <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-1.5 text-left font-semibold">
                      {t("tbl.team")}
                    </th>
                    <th className={numTh}>{t("tbl.mp")}</th>
                    <th className={numTh}>{t("tbl.w")}</th>
                    <th className={numTh}>{t("tbl.d")}</th>
                    <th className={numTh}>{t("tbl.l")}</th>
                    <th className={cn(numTh, "hidden sm:table-cell")}>
                      {t("tbl.gf")}
                    </th>
                    <th className={cn(numTh, "hidden sm:table-cell")}>
                      {t("tbl.ga")}
                    </th>
                    <th className={numTh}>{t("tbl.gd")}</th>
                    <th className="w-10 px-1 py-1.5 text-center font-bold">
                      {t("tbl.pts")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {s.teamBreakdowns.map((b) => {
                    const r = state.results[b.teamId];
                    const w = r?.groupWins ?? 0;
                    const d = r?.groupDraws ?? 0;
                    const l = r?.groupLosses ?? 0;
                    const gf = r?.groupGoalsFor ?? 0;
                    const ga = r?.groupGoalsAgainst ?? 0;
                    const gd = gf - ga;
                    const out = r?.stageReached === "eliminated";
                    return (
                      <tr
                        key={b.teamId}
                        className={cn(
                          "border-b last:border-0",
                          out && "opacity-50",
                        )}
                      >
                        <td className="py-1.5 pl-3 pr-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <TeamCrest teamId={b.teamId} size="xs" />
                            <span className="truncate text-sm font-medium">
                              {getTeam(b.teamId)?.name}
                            </span>
                          </div>
                        </td>
                        <td className={numTd}>{w + d + l}</td>
                        <td className={numTd}>{w}</td>
                        <td className={numTd}>{d}</td>
                        <td className={numTd}>{l}</td>
                        <td className={cn(numTd, "hidden sm:table-cell")}>{gf}</td>
                        <td className={cn(numTd, "hidden sm:table-cell")}>{ga}</td>
                        <td className={cn(numTd, gd > 0 && "text-primary")}>
                          {gd > 0 ? `+${gd}` : gd}
                        </td>
                        <td className="w-10 px-1 py-1.5 text-center font-extrabold tabular-nums">
                          {b.total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (bare) {
    return (
      <div className={cn("transition-colors", isMe && "bg-primary/5")}>
        {inner}
      </div>
    );
  }
  return (
    <Card
      className={cn(
        "overflow-hidden transition-colors",
        isMe && "ring-2 ring-primary",
      )}
    >
      {inner}
    </Card>
  );
}
