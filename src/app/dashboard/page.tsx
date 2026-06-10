"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trophy, Target, Flame, Crown, Pencil, Check } from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamChip } from "@/components/team-chip";
import { StageBadge } from "@/components/stage-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { computeStandings, teamPoints } from "@/lib/scoring";
import { TEAMS } from "@/lib/data/teams";
import { formatMoney } from "@/lib/utils";

function DashboardInner() {
  const { state, me } = usePool();
  const { t } = useT();
  const standings = useMemo(() => computeStandings(state), [state]);
  const mine = standings.find((s) => s.participant.id === me?.id);
  const pkg = state.packages.find((p) => p.id === me?.packageId);

  if (!me) return null;

  if (!pkg) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <CardContent className="space-y-4 p-8">
          <Trophy className="mx-auto h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">{t("dash.noPackage")}</p>
          <Link href="/draw" className={cn(buttonVariants())}>
            {t("dash.pickMy")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  const playing = state.participants.filter((p) => p.packageId).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Trophy}
          label={t("dash.rank")}
          value={`#${mine?.rank ?? "—"}`}
          sub={t("dash.of", { n: playing })}
        />
        <StatCard
          icon={Flame}
          label={t("dash.totalPoints")}
          value={String(mine?.totalPoints ?? 0)}
          sub={t("dash.teamsPicks", {
            teams: mine?.teamPointsTotal ?? 0,
            picks: mine?.prediction.points ?? 0,
          })}
        />
        <StatCard
          icon={Crown}
          label={t("dash.potShare")}
          value={formatMoney(mine?.potShare ?? 0, state.settings.currency)}
          sub={t("dash.owedSoFar")}
          highlight
        />
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            {pkg.label}
            <Badge variant="secondary">{t(`tier.${pkg.tier}`)}</Badge>
          </CardTitle>
          <Link
            href="/draw"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
          >
            {t("common.change")}
          </Link>
        </CardHeader>
        <CardContent className="divide-y">
          {pkg.teamIds.map((tid) => {
            const result = state.results[tid];
            const bd = teamPoints(result, state.scoring);
            return (
              <div
                key={tid}
                className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <TeamChip teamId={tid} size="lg" />
                  <div className="mt-1 flex items-center gap-2">
                    <StageBadge stage={result.stageReached} />
                    {bd.multiplierApplied && (
                      <Badge variant="gold">{t("dash.underdog")}</Badge>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold">{bd.total}</div>
                  <div className="text-[11px] text-muted-foreground">
                    {t("dash.grpKo", {
                      grp: bd.groupPoints,
                      ko: bd.knockoutPoints,
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <PredictionsCard />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/30 bg-primary/5" : ""}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <div className="mt-1 text-2xl font-extrabold tracking-tight">{value}</div>
        <div className="text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

function PredictionsCard() {
  const { state, me, setPredictions } = usePool();
  const { t } = useT();
  const [editing, setEditing] = useState(false);
  const [champ, setChamp] = useState(me?.predChampionId ?? "");
  const [scorer, setScorer] = useState(me?.predTopScorer ?? "");
  const [dark, setDark] = useState(me?.predDarkHorseId ?? "");

  if (!me) return null;

  const save = () => {
    setPredictions(me.id, {
      predChampionId: champ || null,
      predTopScorer: scorer || null,
      predDarkHorseId: dark || null,
    });
    setEditing(false);
  };

  const s = state.scoring;
  const teamOptions = [...TEAMS].sort((a, b) => a.fifaRank - b.fifaRank);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> {t("dash.bonusPicks")}
        </CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => (editing ? save() : setEditing(true))}
        >
          {editing ? (
            <>
              <Check className="h-4 w-4" /> {t("common.save")}
            </>
          ) : (
            <>
              <Pencil className="h-4 w-4" /> {t("common.edit")}
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="-mt-2 text-xs text-muted-foreground">{t("dash.bonusDesc")}</p>

        {editing ? (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t("dash.champion", { n: s.predChampion })}</Label>
              <Select value={champ} onChange={(e) => setChamp(e.target.value)}>
                <option value="">{t("dash.pickTeam")}</option>
                {teamOptions.map((tm) => (
                  <option key={tm.id} value={tm.id}>
                    {tm.flag} {tm.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{t("dash.goldenBoot", { n: s.predTopScorer })}</Label>
              <Input
                placeholder={t("dash.scorer.ph")}
                value={scorer}
                onChange={(e) => setScorer(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("dash.darkHorse", { n: s.predDarkHorse })}</Label>
              <Select value={dark} onChange={(e) => setDark(e.target.value)}>
                <option value="">{t("dash.pickTeam")}</option>
                {teamOptions
                  .filter((tm) => tm.pot >= 3)
                  .map((tm) => (
                    <option key={tm.id} value={tm.id}>
                      {tm.flag} {tm.name} ({t("common.pot", { n: tm.pot })})
                    </option>
                  ))}
              </Select>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <PickRow
              label={t("dash.pick.champion")}
              value={me.predChampionId ? <TeamChip teamId={me.predChampionId} /> : "—"}
            />
            <PickRow label={t("dash.pick.scorer")} value={me.predTopScorer || "—"} />
            <PickRow
              label={t("dash.pick.darkhorse")}
              value={me.predDarkHorseId ? <TeamChip teamId={me.predDarkHorseId} /> : "—"}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function PickRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-muted/40 p-3">
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <RequireAuth>
      <DashboardInner />
    </RequireAuth>
  );
}
