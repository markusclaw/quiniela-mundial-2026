"use client";

import { useEffect, useMemo, useState } from "react";
import { Network } from "lucide-react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamCrest } from "@/components/team-crest";
import { cn } from "@/lib/utils";
import { getTeam } from "@/lib/data/teams";
import { ownerMap, teamPoints } from "@/lib/scoring";
import { fetchFixtures, type FixtureLite } from "@/lib/results-sync";
import type { PoolState, ScoringConfig } from "@/lib/types";

type RoundKey = "r32" | "r16" | "qf" | "sf" | "final";
// Rounds that form the connected tree (third-place is shown on its own).
const TREE_ORDER: RoundKey[] = ["r32", "r16", "qf", "sf", "final"];

const COL_W = 184; // px — column width
const SLOT = 78; // px — vertical slot per first-round match (card + gap)

function roundOf(label: string): RoundKey | "third" | null {
  const r = label.toLowerCase();
  if (/3rd place|third place|play-?off for third/.test(r)) return "third";
  if (/round of 32/.test(r)) return "r32";
  if (/round of 16/.test(r)) return "r16";
  if (/quarter/.test(r)) return "qf";
  if (/semi/.test(r)) return "sf";
  if (/final/.test(r)) return "final";
  return null;
}

function roundPoints(round: RoundKey, s: ScoringConfig): number {
  switch (round) {
    case "r32":
      return s.advance;
    case "r16":
      return s.r16;
    case "qf":
      return s.qf;
    case "sf":
      return s.sf;
    case "final":
      return s.final;
  }
}

function teamName(side: { id: string | null; name: string }) {
  return side.id ? getTeam(side.id)?.name ?? side.name : side.name;
}

function BracketInner() {
  const { state } = usePool();
  const { t } = useT();
  const [fixtures, setFixtures] = useState<FixtureLite[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let on = true;
    fetchFixtures()
      .then((f) => on && setFixtures(f))
      .finally(() => on && setLoading(false));
    return () => {
      on = false;
    };
  }, []);

  const owners = useMemo(() => ownerMap(state), [state]);
  // A team's accumulated tournament points (same value as the standings table).
  const ptsFor = (id: string | null): number | null => {
    if (!id) return null;
    const r = state.results[id];
    return r ? teamPoints(r, state.scoring).total : null;
  };

  const { tree, third } = useMemo(() => {
    const byRound: Record<RoundKey, FixtureLite[]> = {
      r32: [],
      r16: [],
      qf: [],
      sf: [],
      final: [],
    };
    let thirdMatch: FixtureLite | null = null;
    for (const f of fixtures ?? []) {
      if (!f.isKnockout) continue;
      const r = roundOf(f.label);
      if (r === "third") thirdMatch = f;
      else if (r) byRound[r].push(f);
    }
    for (const k of TREE_ORDER) {
      byRound[k].sort((a, b) => (a.kickoff ?? 0) - (b.kickoff ?? 0));
    }
    return { tree: byRound, third: thirdMatch };
  }, [fixtures]);

  const treeRounds = TREE_ORDER.filter((k) => tree[k].length > 0);
  const boardHeight = treeRounds.length ? tree[treeRounds[0]].length * SLOT : 0;
  const isEmpty = treeRounds.length === 0 && !third;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Network className="h-6 w-6 text-primary" />
          {t("bracket.title")}
        </h1>
        <p className="text-sm text-muted-foreground">{t("bracket.subtitle")}</p>
      </div>

      {loading ? (
        <div className="h-40 animate-pulse rounded-xl bg-muted" />
      ) : isEmpty ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          {t("bracket.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto pb-3 no-scrollbar">
          <div className="w-max">
            {/* round headers, aligned to the columns below */}
            <div className="mb-2 flex gap-12">
              {treeRounds.map((round) => (
                <div
                  key={round}
                  className="flex shrink-0 items-center justify-between px-1"
                  style={{ width: COL_W }}
                >
                  <span className="text-sm font-bold">{t(`stage.${round}`)}</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary">
                    +{roundPoints(round, state.scoring)}
                  </span>
                </div>
              ))}
            </div>

            {/* the connected tree */}
            <div className="flex gap-12" style={{ height: boardHeight }}>
              {treeRounds.map((round) => (
                <div key={round} className="bk-col shrink-0" style={{ width: COL_W }}>
                  {tree[round].map((f, i) => (
                    <div key={i} className="bk-item">
                      <MatchupCard f={f} owners={owners} ptsFor={ptsFor} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* third-place match, shown separately */}
            {third && (
              <div className="mt-6" style={{ width: COL_W }}>
                <div className="mb-2 px-1 text-sm font-bold">
                  {t("bracket.third")}
                </div>
                <MatchupCard f={third} owners={owners} ptsFor={ptsFor} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchupCard({
  f,
  owners,
  ptsFor,
}: {
  f: FixtureLite;
  owners: Record<string, string>;
  ptsFor: (id: string | null) => number | null;
}) {
  const { t } = useT();
  const score = f.score;
  const homeWin = !!score && score[0] > score[1];
  const awayWin = !!score && score[1] > score[0];

  const label = score
    ? t("today.ft")
    : f.kickoff
      ? new Date(f.kickoff).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "";

  const side = (
    s: { id: string | null; name: string },
    goals: number | null,
    win: boolean,
  ) => {
    const owner = s.id ? owners[s.id] : undefined;
    const pts = ptsFor(s.id);
    return (
      <div className={cn("flex items-center gap-1.5", !win && score && "opacity-50")}>
        {s.id ? (
          <TeamCrest teamId={s.id} size="xs" />
        ) : (
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-muted text-[8px] font-bold">
            ?
          </span>
        )}
        <span className="min-w-0 flex-1 leading-none">
          <span className="block truncate text-xs font-semibold">
            {s.id ? teamName(s) : t("bracket.tbd")}
          </span>
          {owner && (
            <span className="mt-0.5 block truncate text-[9px] text-muted-foreground">
              {owner}
            </span>
          )}
        </span>
        {pts != null && (
          <span className="shrink-0 rounded bg-primary/10 px-1 text-[9px] font-bold tabular-nums text-primary">
            {pts}
            {t("bracket.ptsAbbr")}
          </span>
        )}
        <span className="w-3 shrink-0 text-right text-xs font-extrabold tabular-nums">
          {goals != null ? goals : ""}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full rounded-lg border bg-card px-2 py-1.5 shadow-sm">
      <div className="mb-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="space-y-1">
        {side(f.home, score ? score[0] : null, homeWin)}
        {side(f.away, score ? score[1] : null, awayWin)}
      </div>
    </div>
  );
}

export default function BracketPage() {
  return (
    <PublicShell>
      <BracketInner />
    </PublicShell>
  );
}
