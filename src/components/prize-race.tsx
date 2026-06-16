"use client";

import { useMemo } from "react";
import { Crown, Flame, Medal, ShieldCheck } from "lucide-react";
import { SoccerBall } from "@/components/ui/soccer-ball";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { Card } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { resolvePrizes, type ResolvedPrize } from "@/lib/scoring";
import type { PrizeType } from "@/lib/types";

// Icon per prize type for the prize-race rows.
const PRIZE_ICON: Record<PrizeType, React.ElementType> = {
  champion: Crown,
  runner_up: Medal,
  third_place: Medal,
  fourth_place: Medal,
  most_points: Flame,
  most_goals: SoccerBall,
  survival: ShieldCheck,
};

/** Live "Premios en juego" — one row per active-preset prize. */
export function PrizeRace() {
  const { state } = usePool();
  const { t } = useT();
  const prizes = useMemo(() => resolvePrizes(state), [state]);
  const cur = state.settings.currency;

  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-secondary/60 px-4 py-2.5">
        <span className="text-sm font-bold">{t("prize.section")}</span>
      </div>
      <div className="divide-y">
        {prizes.map((p) => (
          <PrizeRow key={p.type} prize={p} cur={cur} />
        ))}
      </div>
    </Card>
  );
}

function PrizeRow({ prize, cur }: { prize: ResolvedPrize; cur: string }) {
  const { t } = useT();
  const Icon = PRIZE_ICON[prize.type];
  const pct = Math.round(prize.pct * 100);
  const champion = prize.type === "champion";
  const who =
    prize.winnerNames.length === 0
      ? t("prize.tbd")
      : prize.winnerNames.length <= 2
        ? prize.winnerNames.join(" · ")
        : `${prize.winnerNames.length} ${t("home.tied")}`;

  return (
    <div className="flex items-center gap-3 px-4 py-2.5">
      <Icon
        className={`h-4 w-4 shrink-0 ${champion ? "text-gold-foreground" : "text-primary"}`}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold">
            {t(`prize.${prize.type}`)}
          </span>
          <span className="text-xs text-muted-foreground">{pct}%</span>
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {prize.status === "pending" ? (
            t("prize.tbd")
          ) : (
            <>
              <span className="text-foreground/70">{t("prize.winning")}: </span>
              <span className="font-medium text-foreground">{who}</span>
            </>
          )}
        </div>
      </div>
      <div className="shrink-0 text-right">
        <div className="text-sm font-bold tabular-nums">
          {formatMoney(prize.amount, cur)}
        </div>
        <StatusChip status={prize.status} />
      </div>
    </div>
  );
}

function StatusChip({ status }: { status: ResolvedPrize["status"] }) {
  const { t } = useT();
  const styles: Record<ResolvedPrize["status"], string> = {
    active: "bg-primary/10 text-primary",
    tied: "bg-gold/20 text-gold-foreground",
    pending: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${styles[status]}`}
    >
      {t(`prize.status.${status}`)}
    </span>
  );
}
