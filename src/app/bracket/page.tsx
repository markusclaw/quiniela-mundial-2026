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
import type { ScoringConfig } from "@/lib/types";

type RoundKey = "r32" | "r16" | "qf" | "sf" | "final";

// Fixed WC2026 bracket topology (openfootball match numbers). Each round's
// matches are listed in tree order so adjacent pairs feed the next round in
// order — which is what makes the connector lines line up.
const ROUND_NUMS: Record<RoundKey, number[]> = {
  r32: [74, 77, 73, 75, 76, 78, 79, 80, 83, 84, 81, 82, 86, 88, 85, 87],
  r16: [89, 90, 91, 92, 93, 94, 95, 96],
  qf: [97, 98, 99, 100],
  sf: [101, 102],
  final: [], // the final has no match number; resolved from its W101/W102 slots
};
const TREE_ORDER: RoundKey[] = ["r32", "r16", "qf", "sf", "final"];

const COL_W = 184;
const SLOT = 96;

type Side = { id: string | null; name: string | null };
const TBD: Side = { id: null, name: null };

function roundPoints(round: RoundKey, s: ScoringConfig): number {
  return round === "r32"
    ? s.advance
    : round === "r16"
      ? s.r16
      : round === "qf"
        ? s.qf
        : round === "sf"
          ? s.sf
          : s.final;
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
  const ptsFor = (id: string | null): number | null => {
    if (!id) return null;
    const r = state.results[id];
    return r ? teamPoints(r, state.scoring).total : null;
  };

  // Resolve the whole bracket: every "W{n}" / "L{n}" slot is replaced by the
  // actual winner/loser we compute from match results — so a team advances the
  // instant its match is decided, without waiting for the data feed to relabel.
  const resolver = useMemo(() => {
    const ko = (fixtures ?? []).filter((f) => f.isKnockout);
    const byNum = new Map<number, FixtureLite>();
    for (const f of ko) if (f.num != null) byNum.set(f.num, f);
    const finalMatch = ko.find((f) => /final/i.test(f.label) && !/3rd|third/i.test(f.label) && f.num == null) ?? null;
    const thirdMatch = ko.find((f) => /3rd place|third place|play-?off for third/i.test(f.label)) ?? null;

    const wCache = new Map<number, Side | null>();
    const lCache = new Map<number, Side | null>();

    const decisive = (f: FixtureLite): "home" | "away" | null => {
      if (f.pens) return f.pens[0] > f.pens[1] ? "home" : f.pens[1] > f.pens[0] ? "away" : null;
      if (f.score) return f.score[0] > f.score[1] ? "home" : f.score[1] > f.score[0] ? "away" : null;
      return null;
    };
    const resolveSide = (raw: { id: string | null; name: string }): Side => {
      if (raw.id) return { id: raw.id, name: getTeam(raw.id)?.name ?? raw.name };
      const w = /^W(\d+)$/i.exec(raw.name);
      if (w) return winnerOf(Number(w[1])) ?? TBD;
      const l = /^L(\d+)$/i.exec(raw.name);
      if (l) return loserOf(Number(l[1])) ?? TBD;
      // Group-position slot like "2A" / "3A/B/C/D/F" — show the raw hint.
      return { id: null, name: raw.name || null };
    };
    function endsOf(num: number): { home: Side; away: Side; f: FixtureLite } | null {
      const f = byNum.get(num);
      if (!f) return null;
      return { home: resolveSide(f.home), away: resolveSide(f.away), f };
    }
    function winnerOf(num: number): Side | null {
      if (wCache.has(num)) return wCache.get(num)!;
      wCache.set(num, null); // cycle guard
      const e = endsOf(num);
      let res: Side | null = null;
      if (e) {
        const d = decisive(e.f);
        if (d) res = d === "home" ? e.home : e.away;
        if (res && res.id == null) res = null;
      }
      wCache.set(num, res);
      return res;
    }
    function loserOf(num: number): Side | null {
      if (lCache.has(num)) return lCache.get(num)!;
      lCache.set(num, null);
      const e = endsOf(num);
      let res: Side | null = null;
      if (e) {
        const d = decisive(e.f);
        if (d) res = d === "home" ? e.away : e.home;
        if (res && res.id == null) res = null;
      }
      lCache.set(num, res);
      return res;
    }

    type Box = { home: Side; away: Side; f: FixtureLite | null };
    const boxesFor = (round: RoundKey): Box[] => {
      if (round === "final") {
        if (!finalMatch) return [];
        return [
          {
            home: resolveSide(finalMatch.home),
            away: resolveSide(finalMatch.away),
            f: finalMatch,
          },
        ];
      }
      return ROUND_NUMS[round].map((num) => {
        const f = byNum.get(num) ?? null;
        return {
          home: f ? resolveSide(f.home) : TBD,
          away: f ? resolveSide(f.away) : TBD,
          f,
        };
      });
    };

    const third: Box | null = thirdMatch
      ? {
          home: resolveSide(thirdMatch.home),
          away: resolveSide(thirdMatch.away),
          f: thirdMatch,
        }
      : null;

    const hasAny = ko.length > 0;
    return { boxesFor, third, hasAny };
  }, [fixtures]);

  const treeRounds = resolver.hasAny ? TREE_ORDER.filter((r) => resolver.boxesFor(r).length > 0) : [];
  const boardHeight = treeRounds.length
    ? resolver.boxesFor(treeRounds[0]).length * SLOT
    : 0;

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
      ) : !resolver.hasAny ? (
        <p className="rounded-lg border border-dashed py-12 text-center text-sm text-muted-foreground">
          {t("bracket.empty")}
        </p>
      ) : (
        <div className="overflow-x-auto pb-3 no-scrollbar">
          <div className="w-max">
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

            <div className="flex gap-12" style={{ height: boardHeight }}>
              {treeRounds.map((round) => (
                <div key={round} className="bk-col shrink-0" style={{ width: COL_W }}>
                  {resolver.boxesFor(round).map((box, i) => (
                    <div key={i} className="bk-item">
                      <MatchupCard box={box} ptsFor={ptsFor} owners={owners} />
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {resolver.third && (
              <div className="mt-6" style={{ width: COL_W }}>
                <div className="mb-2 px-1 text-sm font-bold">{t("bracket.third")}</div>
                <MatchupCard box={resolver.third} ptsFor={ptsFor} owners={owners} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MatchupCard({
  box,
  ptsFor,
  owners,
}: {
  box: { home: Side; away: Side; f: FixtureLite | null };
  ptsFor: (id: string | null) => number | null;
  owners: Record<string, string>;
}) {
  const { t } = useT();
  const f = box.f;
  const score = f?.score ?? null;
  const homeWin = !!score && score[0] > score[1];
  const awayWin = !!score && score[1] > score[0];

  const label = score
    ? t("today.ft")
    : f?.kickoff
      ? new Date(f.kickoff).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : t("bracket.tbd");

  const row = (s: Side, goals: number | null, win: boolean) => {
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
          <span
            className={cn(
              "block truncate text-xs font-semibold",
              !s.id && "text-muted-foreground",
            )}
          >
            {s.id ? getTeam(s.id)?.name ?? s.name : s.name ?? t("bracket.tbd")}
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
        {row(box.home, score ? score[0] : null, homeWin)}
        {row(box.away, score ? score[1] : null, awayWin)}
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
