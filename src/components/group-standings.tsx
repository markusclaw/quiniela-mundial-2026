"use client";

import { useEffect, useState } from "react";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { GROUP_IDS, teamsByGroup } from "@/lib/data/teams";
import { ownerMap, isTeamEliminated } from "@/lib/scoring";
import { fetchFixtures, type FixtureLite } from "@/lib/results-sync";
import {
  fetchLive,
  findLiveFor,
  isLiveEnabled,
  type LiveMatch,
} from "@/lib/live";
import type { GroupId } from "@/lib/types";

// Last group-stage result for a team, score from its own perspective.
function latestResult(
  teamId: string,
  fixtures: FixtureLite[],
  live: LiveMatch[],
): { score: string; kind: "w" | "l" | "d" } | null {
  let best: { kickoff: number; sc: [number, number]; home: boolean } | null = null;
  for (const f of fixtures) {
    if (f.isKnockout) continue;
    const isHome = f.home.id === teamId;
    if (!isHome && f.away.id !== teamId) continue;
    const lm = findLiveFor(live, f.home.id, f.away.id);
    let sc: [number, number] | null = null;
    if (lm && (lm.inPlay || lm.finished)) {
      const same = lm.homeId === f.home.id;
      sc = [same ? lm.homeGoals : lm.awayGoals, same ? lm.awayGoals : lm.homeGoals];
    } else if (f.score) sc = f.score;
    if (!sc) continue;
    const k = f.kickoff ?? 0;
    if (!best || k > best.kickoff) best = { kickoff: k, sc, home: isHome };
  }
  if (!best) return null;
  const own = best.home ? best.sc[0] : best.sc[1];
  const opp = best.home ? best.sc[1] : best.sc[0];
  return { score: `${own}-${opp}`, kind: own > opp ? "w" : own < opp ? "l" : "d" };
}

function ResultChip({ res }: { res: { score: string; kind: "w" | "l" | "d" } }) {
  const color =
    res.kind === "w"
      ? "bg-primary text-primary-foreground"
      : res.kind === "l"
        ? "bg-red-600 text-white"
        : "bg-muted text-muted-foreground";
  return (
    <span
      className={cn(
        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
        color,
      )}
    >
      {res.score}
    </span>
  );
}

function GroupCard({
  group,
  fixtures,
  live,
}: {
  group: GroupId;
  fixtures: FixtureLite[];
  live: LiveMatch[];
}) {
  const { state } = usePool();
  const { t } = useT();
  const owners = ownerMap(state);

  const teamIds = teamsByGroup(group).map((tm) => tm.id);
  const rows = teamsByGroup(group)
    .map((tm) => {
      const r = state.results[tm.id];
      const w = r?.groupWins ?? 0;
      const d = r?.groupDraws ?? 0;
      const l = r?.groupLosses ?? 0;
      const gf = r?.groupGoalsFor ?? 0;
      const ga = r?.groupGoalsAgainst ?? 0;
      return {
        tm,
        eliminated: isTeamEliminated(r),
        w,
        d,
        l,
        mp: w + d + l,
        gf,
        ga,
        gd: gf - ga,
        pts: w * 3 + d,
      };
    })
    .sort(
      (a, b) =>
        b.pts - a.pts ||
        b.gd - a.gd ||
        b.gf - a.gf ||
        a.tm.name.localeCompare(b.tm.name),
    );

  const groupLive = live.some(
    (m) =>
      m.inPlay &&
      ((m.homeId && teamIds.includes(m.homeId)) ||
        (m.awayId && teamIds.includes(m.awayId))),
  );

  const numTh = "px-1 py-1.5 text-center font-semibold";
  const numTd = "px-1 py-2 text-center tabular-nums";

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-primary px-3 py-2 text-primary-foreground">
        <span className="text-xs font-bold uppercase tracking-[0.18em]">
          {t("fx.group", { g: group })}
        </span>
        {groupLive ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-bold">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white/80" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            {t("today.live")}
          </span>
        ) : (
          <span className="grid h-6 w-6 place-items-center rounded-md bg-white/20 text-sm font-extrabold">
            {group}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="px-2 py-1.5 text-left font-semibold" colSpan={2}>
                {t("tbl.team")}
              </th>
              <th className={numTh}>{t("tbl.mp")}</th>
              <th className={numTh}>{t("tbl.w")}</th>
              <th className={numTh}>{t("tbl.d")}</th>
              <th className={numTh}>{t("tbl.l")}</th>
              <th className={cn(numTh, "hidden sm:table-cell")}>{t("tbl.gf")}</th>
              <th className={cn(numTh, "hidden sm:table-cell")}>{t("tbl.ga")}</th>
              <th className={numTh}>{t("tbl.gd")}</th>
              <th className="px-2 py-1.5 text-center font-bold">{t("tbl.pts")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const res = latestResult(row.tm.id, fixtures, live);
              return (
                <tr
                  key={row.tm.id}
                  className={cn(
                    "border-b last:border-0",
                    i < 2 && "bg-primary/5",
                    row.eliminated && "opacity-50",
                  )}
                >
                  <td className="w-5 px-2 py-2 text-center text-[11px] font-semibold text-muted-foreground">
                    {i + 1}
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex items-center gap-2">
                      <TeamCrest teamId={row.tm.id} size="sm" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-medium">
                            {row.tm.name}
                          </span>
                          {res && <ResultChip res={res} />}
                        </div>
                        {owners[row.tm.id] && (
                          <span className="block truncate text-[10px] text-muted-foreground">
                            {owners[row.tm.id]}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className={numTd}>{row.mp}</td>
                  <td className={numTd}>{row.w}</td>
                  <td className={numTd}>{row.d}</td>
                  <td className={numTd}>{row.l}</td>
                  <td className={cn(numTd, "hidden sm:table-cell")}>{row.gf}</td>
                  <td className={cn(numTd, "hidden sm:table-cell")}>{row.ga}</td>
                  <td className={cn(numTd, row.gd > 0 && "text-primary")}>
                    {row.gd > 0 ? `+${row.gd}` : row.gd}
                  </td>
                  <td className="px-2 py-2 text-center text-base font-extrabold tabular-nums">
                    {row.pts}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function GroupStandings() {
  const [fixtures, setFixtures] = useState<FixtureLite[]>([]);
  const [live, setLive] = useState<LiveMatch[]>([]);

  useEffect(() => {
    let on = true;
    fetchFixtures().then((f) => on && f && setFixtures(f));
    return () => {
      on = false;
    };
  }, []);

  useEffect(() => {
    if (!isLiveEnabled) return;
    let on = true;
    const load = () => fetchLive().then((l) => on && l && setLive(l));
    load();
    const id = setInterval(load, 30 * 1000);
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {GROUP_IDS.map((g) => (
        <GroupCard key={g} group={g} fixtures={fixtures} live={live} />
      ))}
    </div>
  );
}
