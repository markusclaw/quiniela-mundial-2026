"use client";

import { Trophy, Flame, Crown } from "lucide-react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function RulesInner() {
  const { state } = usePool();
  const { t } = useT();
  const s = state.scoring;
  const championPct = Math.round(s.payout.champion * 100);
  const pointsPct = Math.round(s.payout.points * 100);

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

      <h2 className="text-lg font-bold">{t("rules.waysTitle")}</h2>

      {/* Payout 1: Champion */}
      <Card className="border-gold/40 bg-gold/5">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Crown className="h-5 w-5 text-gold-foreground" />
            {t("rules.champion.title")}
            <Badge variant="gold" className="ml-auto text-sm">
              {championPct}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-muted-foreground">
            {t("rules.champion.body")}
          </p>
        </CardContent>
      </Card>

      {/* Payout 2: Most points */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-5 w-5 text-primary" />
            {t("rules.points.title")}
            <Badge variant="default" className="ml-auto text-sm">
              {pointsPct}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="leading-relaxed text-muted-foreground">
            {t("rules.points.body")}
          </p>
        </CardContent>
      </Card>

      {/* How points work — plain */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("rules.how.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="leading-relaxed text-muted-foreground">
            {t("rules.how.body")}
          </p>

          <details className="rounded-lg border bg-muted/30">
            <summary className="cursor-pointer px-3 py-2 text-sm font-semibold text-muted-foreground">
              {t("rules.table.title")}
            </summary>
            <div className="px-3 pb-3">
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
          </details>
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
