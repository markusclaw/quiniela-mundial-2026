"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Lock, Sparkles, TrendingUp } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamChip } from "@/components/team-chip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { getTeam } from "@/lib/data/teams";
import type { Package, Tier } from "@/lib/types";

const TIER_ORDER: Tier[] = ["premium", "mid", "value"];

function PotBadge({ teamId }: { teamId: string }) {
  const { t } = useT();
  const team = getTeam(teamId);
  if (!team) return null;
  return (
    <Badge variant={team.pot >= 3 ? "gold" : "muted"}>
      {t("common.pot", { n: team.pot })}
    </Badge>
  );
}

function DrawInner() {
  const router = useRouter();
  const { state, me, choosePackage } = usePool();
  const { t } = useT();
  const [confirming, setConfirming] = useState<string | null>(null);

  const ownerByPkg: Record<string, string> = {};
  for (const p of state.participants) {
    if (p.packageId) ownerByPkg[p.packageId] = p.name;
  }

  const myPkg = me?.packageId ?? null;

  const pick = (pkgId: string) => {
    if (!me) return;
    choosePackage(me.id, pkgId);
    setConfirming(null);
    router.push("/dashboard");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("draw.title")}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          {t("draw.desc1")}
          <span className="font-medium text-foreground">{t("draw.descBold")}</span>
          {t("draw.desc2")}
        </p>
      </div>

      {TIER_ORDER.map((tier) => {
        const packs = state.packages.filter((p) => p.tier === tier);
        return (
          <section key={tier} className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                {t(`tier.${tier}`)}
              </h2>
              {tier === "value" && (
                <Badge variant="gold">
                  <TrendingUp className="mr-1 h-3 w-3" /> {t("draw.underdogBonus")}
                </Badge>
              )}
            </div>
            <p className="-mt-2 text-xs text-muted-foreground">
              {t(`tier.${tier}.blurb`)}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {packs.map((pkg) => (
                <PackageCard
                  key={pkg.id}
                  pkg={pkg}
                  owner={ownerByPkg[pkg.id]}
                  isMine={myPkg === pkg.id}
                  currency={state.settings.currency}
                  confirming={confirming === pkg.id}
                  onConfirm={() => setConfirming(pkg.id)}
                  onCancel={() => setConfirming(null)}
                  onPick={() => pick(pkg.id)}
                />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function PackageCard({
  pkg,
  owner,
  isMine,
  currency,
  confirming,
  onConfirm,
  onCancel,
  onPick,
}: {
  pkg: Package;
  owner?: string;
  isMine: boolean;
  currency: string;
  confirming: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onPick: () => void;
}) {
  const { t } = useT();
  const taken = !!owner && !isMine;
  return (
    <Card
      className={`relative overflow-hidden transition-shadow ${
        isMine ? "ring-2 ring-primary" : taken ? "opacity-60" : "hover:shadow-md"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-bold">{pkg.label}</div>
            <Badge
              variant={pkg.tier === "value" ? "gold" : "secondary"}
              className="mt-1"
            >
              {t(`tier.${pkg.tier}`)}
            </Badge>
          </div>
          <div className="text-right">
            <div className="text-lg font-extrabold tracking-tight">
              {formatMoney(pkg.buyIn, currency)}
            </div>
            <div className="text-[11px] text-muted-foreground">
              {t("draw.buyIn")}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {pkg.teamIds.map((tid) => (
          <div key={tid} className="flex items-center justify-between">
            <TeamChip teamId={tid} />
            <PotBadge teamId={tid} />
          </div>
        ))}

        <div className="pt-2">
          {isMine ? (
            <div className="flex items-center justify-center gap-2 rounded-md bg-primary/10 py-2 text-sm font-semibold text-primary">
              <Check className="h-4 w-4" /> {t("draw.yourPackage")}
            </div>
          ) : taken ? (
            <div className="flex items-center justify-center gap-2 rounded-md bg-muted py-2 text-sm text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> {t("draw.takenBy", { name: owner! })}
            </div>
          ) : confirming ? (
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={onPick}>
                {t("common.confirm")}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="flex-1"
                onClick={onCancel}
              >
                {t("common.cancel")}
              </Button>
            </div>
          ) : (
            <Button className="w-full" variant="default" onClick={onConfirm}>
              <Sparkles className="h-4 w-4" /> {t("draw.choose")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DrawPage() {
  return (
    <RequireAuth>
      <DrawInner />
    </RequireAuth>
  );
}
