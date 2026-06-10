"use client";

import { Scale, User, Circle } from "lucide-react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamChip } from "@/components/team-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { getTeam, GROUP_IDS, teamsByGroup } from "@/lib/data/teams";
import { ownerMap } from "@/lib/scoring";
import type { Package } from "@/lib/types";

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
  const { state } = usePool();
  const { t } = useT();

  if (state.settings.distributionMode === "individual") return <TeamsView />;

  const ownerByPkg: Record<string, string> = {};
  for (const p of state.participants) {
    if (p.packageId) ownerByPkg[p.packageId] = p.name;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("draw.title")}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Scale className="h-4 w-4 text-primary" />
          {t("draw.balancedNote", {
            price: formatMoney(state.settings.buyIn, state.settings.currency),
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {state.packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            owner={ownerByPkg[pkg.id]}
            currency={state.settings.currency}
          />
        ))}
      </div>
    </div>
  );
}

function PackageCard({
  pkg,
  owner,
  currency,
}: {
  pkg: Package;
  owner?: string;
  currency: string;
}) {
  const { t } = useT();
  return (
    <Card className={`overflow-hidden ${owner ? "" : "opacity-90"}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-bold">{pkg.label}</div>
            <Badge variant="secondary" className="mt-1">
              <Scale className="mr-1 h-3 w-3" /> {t("pkg.balanced")}
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
          {owner ? (
            <div className="flex items-center justify-center gap-2 rounded-md bg-primary/10 py-2 text-sm font-semibold text-primary">
              <User className="h-3.5 w-3.5" /> {owner}
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 rounded-md bg-muted py-2 text-sm text-muted-foreground">
              <Circle className="h-3 w-3" /> {t("pkg.unassigned")}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TeamsView() {
  const { state } = usePool();
  const { t } = useT();
  const owners = ownerMap(state);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{t("draw.title")}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4 text-primary" />
          {t("draw.individualNote", {
            price: formatMoney(state.settings.teamPrice, state.settings.currency),
          })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {GROUP_IDS.map((g) => (
          <Card key={g} className="overflow-hidden">
            <div className="flex items-center justify-between bg-primary px-3 py-2 text-primary-foreground">
              <span className="text-xs font-bold uppercase tracking-[0.18em]">
                {t("fx.group", { g })}
              </span>
              <span className="grid h-6 w-6 place-items-center rounded-md bg-white/20 text-sm font-extrabold">
                {g}
              </span>
            </div>
            <div className="divide-y">
              {teamsByGroup(g).map((tm) => {
                const owner = owners[tm.id];
                return (
                  <div key={tm.id} className="flex items-center gap-2 px-3 py-2">
                    <TeamChip teamId={tm.id} className="flex-1" />
                    {owner ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-primary">
                        <User className="h-3 w-3" /> {owner}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">
                        {t("pkg.unassigned")}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function DrawPage() {
  return (
    <PublicShell>
      <DrawInner />
    </PublicShell>
  );
}
