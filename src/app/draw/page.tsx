"use client";

import { Scale, User, Circle, Users } from "lucide-react";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamChip } from "@/components/team-chip";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/utils";
import { getTeam, TEAMS } from "@/lib/data/teams";
import type { Package, Participant } from "@/lib/types";

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

// Paid / partially paid / pending — shown on each pack.
function PaidBadge({
  paid,
  owed,
  currency,
}: {
  paid: number;
  owed: number;
  currency: string;
}) {
  const { t } = useT();
  if (owed <= 0) return null;
  if (paid >= owed) return <Badge variant="default">{t("pkg.paid")}</Badge>;
  if (paid > 0)
    return (
      <Badge variant="gold">
        {t("pkg.partial")} · {formatMoney(paid, currency)}/
        {formatMoney(owed, currency)}
      </Badge>
    );
  return <Badge variant="muted">{t("pkg.pending")}</Badge>;
}

function DrawInner() {
  const { state } = usePool();
  const { t } = useT();

  if (state.settings.distributionMode === "individual") return <TeamsView />;

  const ownerByPkg: Record<string, Participant> = {};
  for (const p of state.participants) {
    if (p.packageId) ownerByPkg[p.packageId] = p;
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
  owner?: Participant;
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
            <TeamChip teamId={tid} dimIfOut />
            <PotBadge teamId={tid} />
          </div>
        ))}

        <div className="pt-2">
          {owner ? (
            <div className="flex flex-col items-center gap-1.5">
              <div className="flex w-full items-center justify-center gap-2 rounded-md bg-primary/10 py-2 text-sm font-semibold text-primary">
                <User className="h-3.5 w-3.5" /> {owner.name}
              </div>
              <PaidBadge
                paid={owner.paid ? pkg.buyIn : 0}
                owed={pkg.buyIn}
                currency={currency}
              />
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
  const { currency, teamPrice } = state.settings;
  const owners = state.teamOwners ?? {};

  // Group pulled teams by participant.
  const byParticipant = state.participants
    .map((p) => ({
      participant: p,
      teamIds: Object.keys(owners).filter((tid) => owners[tid] === p.id),
    }))
    .filter((g) => g.teamIds.length > 0)
    .sort((a, b) => b.teamIds.length - a.teamIds.length);

  const unassigned = TEAMS.filter((tm) => !owners[tm.id]).map((tm) => tm.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t("draw.individualTitle")}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <User className="h-4 w-4 text-primary" />
          {t("draw.individualNote", {
            price: formatMoney(teamPrice, currency),
          })}
        </p>
      </div>

      {byParticipant.length === 0 && unassigned.length === 48 && (
        <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
          {t("draw.noneAssigned")}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {byParticipant.map(({ participant, teamIds }) => {
          const owed = teamIds.length * teamPrice;
          const paidSet = new Set(participant.paidTeams ?? []);
          const paid = teamIds.filter((tid) => paidSet.has(tid)).length * teamPrice;
          return (
          <Card key={participant.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2 text-base font-bold">
                  <User className="h-4 w-4 shrink-0 text-primary" />
                  <span className="truncate">
                    {t("draw.personPack", { name: participant.name })}
                  </span>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-extrabold tracking-tight">
                    {formatMoney(owed, currency)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {teamIds.length} {t("admin.people.teamsCount")}
                  </div>
                </div>
              </div>
              <div className="mt-1.5">
                <PaidBadge paid={paid} owed={owed} currency={currency} />
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {teamIds.map((tid) => (
                <div key={tid} className="flex items-center justify-between">
                  <TeamChip teamId={tid} dimIfOut />
                  <PotBadge teamId={tid} />
                </div>
              ))}
            </CardContent>
          </Card>
          );
        })}
      </div>

      {unassigned.length > 0 && unassigned.length < 48 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground">
              <Users className="h-4 w-4" />
              {t("draw.inTheCup", { n: unassigned.length })}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {unassigned.map((tid) => (
                <span
                  key={tid}
                  className="rounded-full bg-muted px-2 py-1 text-xs"
                >
                  <TeamChip teamId={tid} size="sm" />
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
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
