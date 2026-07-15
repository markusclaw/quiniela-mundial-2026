"use client";

import { useState } from "react";
import { Medal, ChevronDown } from "lucide-react";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ownedTeamIds,
  isTeamEliminated,
  knockoutStagePoints,
  KO_STAGES,
  type ParticipantStanding,
} from "@/lib/scoring";
import { getTeam } from "@/lib/data/teams";
import { formatMoney, cn } from "@/lib/utils";
import type { TeamResult } from "@/lib/types";

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

/** Small chip showing a team's furthest stage — muted once it's out. */
function StageChip({ r }: { r?: TeamResult }) {
  const { t } = useT();
  if (!r) return null;
  const out = isTeamEliminated(r);
  const champ = r.stageReached === "champion";
  const key = r.stageReached === "eliminated" ? "eliminated" : r.stageReached;
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide",
        champ
          ? "bg-gold/20 text-gold"
          : out
            ? "bg-muted text-muted-foreground"
            : "bg-primary/10 text-primary",
      )}
    >
      {t(`stageShort.${key}`)}
    </span>
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
  detailed = false,
}: {
  s: ParticipantStanding;
  rank: number;
  isMe: boolean;
  bare?: boolean; // render without a Card wrapper (for a shared single card)
  alive?: number; // teams still in the knockouts
  owned?: number; // total teams owned
  detailed?: boolean; // full view: group record + goals alongside the points ledger
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
              const out = isTeamEliminated(state.results[tid]);
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
              {/* Points ledger: group points + the points won at each knockout
                  round, always adding up to the Pts total. `detailed` (the
                  leaderboard) also shows the group record + goals. */}
              <table
                className={cn(
                  "w-full text-sm",
                  detailed ? "min-w-[760px]" : "min-w-[520px]",
                )}
              >
                <thead>
                  <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
                    <th className="px-3 py-1.5 text-left font-semibold">
                      {t("tbl.team")}
                    </th>
                    <th className="px-1 py-1.5 text-center font-semibold">
                      {t("tbl.stage")}
                    </th>
                    {detailed && (
                      <>
                        <th className={numTh}>{t("tbl.mp")}</th>
                        <th className={numTh}>{t("tbl.w")}</th>
                        <th className={numTh}>{t("tbl.d")}</th>
                        <th className={numTh}>{t("tbl.l")}</th>
                        <th className={numTh}>{t("tbl.gf")}</th>
                        <th className={numTh}>{t("tbl.ga")}</th>
                        <th className={numTh}>{t("tbl.gd")}</th>
                      </>
                    )}
                    <th className={cn(numTh, detailed && "border-l")}>
                      {t("tbl.grp")}
                    </th>
                    {KO_STAGES.map((st) => (
                      <th key={st} className={numTh}>
                        {t(`stageShort.${st}`)}
                      </th>
                    ))}
                    <th className="w-10 px-1 py-1.5 text-center font-bold">
                      {t("tbl.pts")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {s.teamBreakdowns.map((b) => {
                    const r = state.results[b.teamId];
                    const out = isTeamEliminated(r);
                    const ko = r ? knockoutStagePoints(r, state.scoring) : null;
                    const w = r?.groupWins ?? 0;
                    const d = r?.groupDraws ?? 0;
                    const l = r?.groupLosses ?? 0;
                    const gf = r?.groupGoalsFor ?? 0;
                    const ga = r?.groupGoalsAgainst ?? 0;
                    const gd = gf - ga;
                    return (
                      <tr
                        key={b.teamId}
                        className={cn(
                          "border-b last:border-0",
                          out && "opacity-50",
                        )}
                      >
                        <td className="py-1.5 pl-3 pr-2">
                          <div className="flex min-w-0 items-center gap-1.5">
                            <TeamCrest teamId={b.teamId} size="xs" />
                            <span className="truncate text-sm font-medium">
                              {getTeam(b.teamId)?.name}
                            </span>
                            {b.multiplierApplied && (
                              <span
                                title={t("lb.underdogTip")}
                                className="shrink-0 rounded bg-amber-500/15 px-1 text-[9px] font-bold text-amber-600"
                              >
                                ×{state.scoring.underdogMultiplier}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <StageChip r={r} />
                        </td>
                        {detailed && (
                          <>
                            <td className={numTd}>{w + d + l}</td>
                            <td className={numTd}>{w}</td>
                            <td className={numTd}>{d}</td>
                            <td className={numTd}>{l}</td>
                            <td className={numTd}>{gf}</td>
                            <td className={numTd}>{ga}</td>
                            <td className={cn(numTd, gd > 0 && "text-primary")}>
                              {gd > 0 ? `+${gd}` : gd}
                            </td>
                          </>
                        )}
                        <td className={cn(numTd, detailed && "border-l")}>
                          {b.groupPoints}
                        </td>
                        {KO_STAGES.map((st) => {
                          const v = ko ? ko[st] : null;
                          return (
                            <td key={st} className={numTd}>
                              {v == null ? (
                                <span className="text-muted-foreground/40">—</span>
                              ) : (
                                <span className="font-semibold text-primary">
                                  {v}
                                </span>
                              )}
                            </td>
                          );
                        })}
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
