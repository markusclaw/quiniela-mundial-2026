"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Settings,
  Users,
  ClipboardList,
  Trash2,
  RefreshCw,
  Plus,
  Copy,
  Sparkles,
  Printer,
} from "lucide-react";
import { AdminGate } from "@/components/require-auth";
import { SetupWizard } from "@/components/setup-wizard";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamChip } from "@/components/team-chip";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";
import { GROUP_IDS, teamsByGroup } from "@/lib/data/teams";
import type { Stage } from "@/lib/types";

const STAGE_KEYS: { value: Stage; key: string }[] = [
  { value: "group", key: "stageOpt.group" },
  { value: "eliminated", key: "stageOpt.eliminated" },
  { value: "r32", key: "stage.r32" },
  { value: "r16", key: "stage.r16" },
  { value: "qf", key: "stage.qf" },
  { value: "sf", key: "stage.sf" },
  { value: "final", key: "stage.final" },
  { value: "champion", key: "stage.champion" },
];

type Tab = "settings" | "people";

function AdminInner() {
  const { t } = useT();
  const { state } = usePool();
  const fresh =
    state.participants.filter((p) => !p.isModerator).length === 0 &&
    Object.keys(state.teamOwners ?? {}).length === 0;
  const [setup, setSetup] = useState(fresh);
  const [tab, setTab] = useState<Tab>("people");
  const tabs: { id: Tab; key: string; icon: React.ElementType }[] = [
    { id: "people", key: "admin.tab.people", icon: Users },
    { id: "settings", key: "admin.tab.settings", icon: Settings },
  ];

  if (setup) return <SetupWizard onClose={() => setSetup(false)} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/print"
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            <Printer className="h-4 w-4" /> {t("print.button")}
          </Link>
          <Button variant="outline" size="sm" onClick={() => setSetup(true)}>
            <Sparkles className="h-4 w-4" /> {t("wizard.heading")}
          </Button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-lg bg-muted p-1 no-scrollbar">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 text-sm font-semibold transition-colors",
              tab === tb.id
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <tb.icon className="h-4 w-4" />
            {t(tb.key)}
          </button>
        ))}
      </div>

      {tab === "people" && <PeopleTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

function ResultsPanel() {
  const { state, setTeamResult, clearManual, syncNow, syncing } = usePool();
  const { t } = useT();
  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex-1">
            <div className="font-semibold">{t("admin.results.autoTitle")}</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("admin.results.autoNote")}
            </p>
          </div>
          <Button variant="secondary" onClick={() => void syncNow()} disabled={syncing}>
            <RefreshCw className={cn("h-4 w-4", syncing && "animate-spin")} />
            {t("admin.results.syncNow")}
          </Button>
        </CardContent>
      </Card>

      <details className="rounded-xl border bg-card">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-muted-foreground">
          {t("admin.results.overrideTitle")}
        </summary>
        <div className="space-y-4 p-4 pt-0">
      {GROUP_IDS.map((g) => (
        <Card key={g}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("fx.group", { g })}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {teamsByGroup(g).map((tm) => {
              const r = state.results[tm.id];
              return (
                <div
                  key={tm.id}
                  className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0"
                >
                  <div className="w-40 shrink-0">
                    <TeamChip teamId={tm.id} />
                  </div>
                  <div className="flex items-center gap-1">
                    {(["groupWins", "groupDraws", "groupLosses"] as const).map(
                      (k, i) => (
                        <div key={k} className="flex flex-col items-center">
                          <span className="text-[10px] uppercase text-muted-foreground">
                            {["W", "D", "L"][i]}
                          </span>
                          <Input
                            type="number"
                            min={0}
                            max={3}
                            value={r[k]}
                            onChange={(e) =>
                              setTeamResult(tm.id, {
                                [k]: Math.max(
                                  0,
                                  Math.min(3, Number(e.target.value) || 0),
                                ),
                              })
                            }
                            className="h-9 w-12 px-1 text-center"
                          />
                        </div>
                      ),
                    )}
                  </div>
                  <Select
                    value={r.stageReached}
                    onChange={(e) =>
                      setTeamResult(tm.id, {
                        stageReached: e.target.value as Stage,
                      })
                    }
                    className="h-9 flex-1 min-w-[150px]"
                  >
                    {STAGE_KEYS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {t(s.key)}
                      </option>
                    ))}
                  </Select>
                  {r.manual && (
                    <button
                      onClick={() => clearManual(tm.id)}
                      title={t("admin.results.revert")}
                      className="inline-flex items-center gap-1 rounded-full bg-gold/15 px-2 py-1 text-[11px] font-semibold text-gold-foreground hover:bg-gold/25"
                    >
                      {t("admin.results.manualBadge")}
                      <RefreshCw className="h-3 w-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
        </div>
      </details>
    </div>
  );
}

function PeopleTab() {
  const { state, addParticipant, removeParticipant, choosePackage, setTeamOwner } =
    usePool();
  const { t } = useT();
  const [name, setName] = useState("");
  const individual = state.settings.distributionMode === "individual";
  const ownedCount = (pid: string) =>
    Object.values(state.teamOwners ?? {}).filter((id) => id === pid).length;

  const ownerByPkg: Record<string, string> = {};
  for (const p of state.participants)
    if (p.packageId) ownerByPkg[p.packageId] = p.id;

  const add = () => {
    if (!name.trim()) return;
    addParticipant(name);
    setName("");
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("admin.people.add")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <div className="flex-1 space-y-1.5">
            <Label>{t("admin.people.name")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("admin.people.namePh")}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
          </div>
          <Button onClick={add}>
            <Plus className="h-4 w-4" /> {t("admin.people.addBtn")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t("admin.people.players", { n: state.participants.length })}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {state.participants.map((p) => (
            <div
              key={p.id}
              className="flex flex-wrap items-center gap-2 border-b py-2 last:border-0"
            >
              <div className="w-32 shrink-0">
                <div className="flex items-center gap-1.5 font-medium">
                  {p.name}
                  {p.isModerator && <Badge variant="muted">org</Badge>}
                </div>
              </div>
              {individual ? (
                <span className="flex-1 text-xs text-muted-foreground">
                  {ownedCount(p.id)} {t("admin.people.teamsCount")}
                </span>
              ) : (
                <Select
                  value={p.packageId ?? ""}
                  onChange={(e) => choosePackage(p.id, e.target.value)}
                  className="h-9 flex-1 min-w-[160px]"
                >
                  <option value="">{t("admin.people.noPackage")}</option>
                  {state.packages.map((k) => {
                    const taken = ownerByPkg[k.id] && ownerByPkg[k.id] !== p.id;
                    return (
                      <option key={k.id} value={k.id} disabled={!!taken}>
                        {k.label} · {formatMoney(k.buyIn, state.settings.currency)}
                        {taken ? t("admin.people.taken") : ""}
                      </option>
                    );
                  })}
                </Select>
              )}
              {!p.isModerator && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeParticipant(p.id)}
                  aria-label="Remove"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {individual && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("admin.assign.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="-mt-1 text-xs text-muted-foreground">
              {t("admin.assign.note")}
            </p>
            {GROUP_IDS.map((g) => (
              <div key={g} className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                  {t("fx.group", { g })}
                </div>
                {teamsByGroup(g).map((tm) => (
                  <div key={tm.id} className="flex items-center gap-2">
                    <div className="w-40 shrink-0">
                      <TeamChip teamId={tm.id} />
                    </div>
                    <Select
                      value={state.teamOwners?.[tm.id] ?? ""}
                      onChange={(e) =>
                        setTeamOwner(tm.id, e.target.value || null)
                      }
                      className="h-9 flex-1 min-w-[150px]"
                    >
                      <option value="">{t("admin.people.unassigned")}</option>
                      {state.participants
                        .filter((p) => !p.isModerator)
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                    </Select>
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SettingsTab() {
  const { state, updateSettings, rebuildPackages, loadDemo, reset } = usePool();
  const { t } = useT();
  const s = state.settings;
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard?.writeText(s.joinCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{t("admin.settings.pool")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{t("admin.settings.name")}</Label>
              <Input
                value={s.name}
                onChange={(e) => updateSettings({ name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t("admin.settings.currency")}</Label>
              <Select
                value={s.currency}
                onChange={(e) => updateSettings({ currency: e.target.value })}
              >
                {["MXN", "USD", "EUR", "COP", "ARS"].map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("admin.settings.joinCode")}</Label>
            <div className="flex gap-2">
              <Input
                value={s.joinCode}
                onChange={(e) =>
                  updateSettings({ joinCode: e.target.value.toUpperCase() })
                }
              />
              <Button variant="outline" size="icon" onClick={copyCode}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-primary">{t("admin.settings.copied")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {t("admin.settings.distMode")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Select
              value={s.distributionMode}
              onChange={(e) =>
                updateSettings({
                  distributionMode: e.target.value as typeof s.distributionMode,
                })
              }
            >
              <option value="balanced">{t("mode.balanced")}</option>
              <option value="tiered">{t("mode.tiered")}</option>
              <option value="individual">{t("mode.individual")}</option>
            </Select>
            <p className="text-xs text-muted-foreground">
              {t(`mode.${s.distributionMode}.desc`)}
            </p>
          </div>

          {s.distributionMode === "balanced" && (
            <div className="max-w-[200px] space-y-1.5">
              <Label>{t("admin.settings.buyInLabel")}</Label>
              <Input
                type="number"
                min={0}
                value={s.buyIn}
                onChange={(e) =>
                  updateSettings({ buyIn: Number(e.target.value) || 0 })
                }
              />
            </div>
          )}

          {s.distributionMode === "tiered" && (
            <div className="grid max-w-md grid-cols-3 gap-3">
              {(["premium", "mid", "value"] as const).map((tier) => (
                <div key={tier} className="space-y-1.5">
                  <Label>{t(`tier.${tier}`)}</Label>
                  <Input
                    type="number"
                    min={0}
                    value={s.tierBuyIns[tier]}
                    onChange={(e) =>
                      updateSettings({
                        tierBuyIns: {
                          ...s.tierBuyIns,
                          [tier]: Number(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              ))}
            </div>
          )}

          {s.distributionMode === "individual" && (
            <div className="max-w-[200px] space-y-1.5">
              <Label>{t("admin.settings.teamPriceLabel")}</Label>
              <Input
                type="number"
                min={0}
                value={s.teamPrice}
                onChange={(e) =>
                  updateSettings({ teamPrice: Number(e.target.value) || 0 })
                }
              />
            </div>
          )}

          {s.distributionMode !== "individual" && (
            <>
              <Button variant="secondary" onClick={rebuildPackages}>
                <RefreshCw className="h-4 w-4" /> {t("admin.settings.apply")}
              </Button>
              <p className="text-xs text-muted-foreground">
                {t("admin.settings.applyNote")}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <ResultsPanel />

      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-destructive">
            {t("admin.settings.danger")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-xs text-muted-foreground">
            {t("admin.settings.resetNote")}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={loadDemo}>
              {t("admin.settings.loadDemo")}
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm(t("admin.settings.resetConfirm"))) reset();
              }}
            >
              <Trash2 className="h-4 w-4" /> {t("admin.settings.reset")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminInner />
    </AdminGate>
  );
}
