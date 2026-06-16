"use client";

import { Trophy, Flame, Crown, Medal, ShieldCheck } from "lucide-react";
import { SoccerBall } from "@/components/ui/soccer-ball";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { PrizeRace } from "@/components/prize-race";
import { useT } from "@/lib/i18n";
import { resolvePrizes } from "@/lib/scoring";
import type { PrizeType } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const PRIZE_ICON: Record<PrizeType, React.ElementType> = {
  champion: Crown,
  runner_up: Medal,
  third_place: Medal,
  fourth_place: Medal,
  most_points: Flame,
  most_goals: SoccerBall,
  survival: ShieldCheck,
};

function RulesInner() {
  const { state } = usePool();
  const { t } = useT();
  const s = state.scoring;
  const prizes = resolvePrizes(state);

  const pointRows: { label: string; value: string }[] = [
    { label: t("rules.pt.groupWin"), value: `+${s.groupWin}` },
    { label: t("rules.pt.groupDraw"), value: `+${s.groupDraw}` },
    { label: t("rules.pt.advance"), value: `+${s.advance}` },
    { label: t("stage.r16"), value: `+${s.r16}` },
    { label: t("stage.qf"), value: `+${s.qf}` },
    { label: t("stage.sf"), value: `+${s.sf}` },
    { label: t("stage.final"), value: `+${s.final}` },
    { label: t("stage.champion"), value: `+${s.champion}` },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("rules.title")}</h1>
        <p className="mt-2 leading-relaxed text-muted-foreground">
          {t("rules.intro")}
        </p>
      </div>

      {/* Live prize race — current $ value + who's winning each prize. */}
      <PrizeRace />

      <h2 className="text-lg font-bold">{t("rules.waysTitle")}</h2>

      {/* Payout cards — driven by the active preset (3 / 5 / 7 prizes). */}
      {prizes.map((p) => {
        const Icon = PRIZE_ICON[p.type];
        const champion = p.type === "champion";
        return (
          <Card
            key={p.type}
            className={champion ? "border-gold/40 bg-gold/5" : ""}
          >
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon
                  className={cn(
                    "h-5 w-5",
                    champion ? "text-gold-foreground" : "text-primary",
                  )}
                />
                {t(`prize.${p.type}`)}
                <Badge
                  variant={champion ? "gold" : "default"}
                  className="ml-auto text-sm"
                >
                  {Math.round(p.pct * 100)}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="leading-relaxed text-muted-foreground">
                {t(`rules.prize.${p.type}`)}
              </p>
            </CardContent>
          </Card>
        );
      })}

      {/* How points work — plain */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("rules.how.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="leading-relaxed text-muted-foreground">
            {t("rules.how.body")}
          </p>

          <div className="rounded-lg border bg-muted/30 px-3 py-2">
            <div className="pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("rules.table.title")}
            </div>
            {pointRows.map((r) => (
              <div
                key={r.label}
                className="flex items-center justify-between border-b py-1.5 text-sm last:border-0"
              >
                <span>{r.label}</span>
                <span className="font-mono font-bold tabular-nums">
                  {r.value}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-2 pt-2 text-xs text-muted-foreground">
              <Badge variant="gold">×{s.underdogMultiplier}</Badge>
              {t("rules.pt.underdog")}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Own more teams */}
      <Card>
        <CardContent className="flex items-start gap-3 p-4">
          <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <p className="leading-relaxed text-muted-foreground">
            {t("rules.more.body")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function RulesPage() {
  return (
    <PublicShell>
      <RulesInner />
    </PublicShell>
  );
}
