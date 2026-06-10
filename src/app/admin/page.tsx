"use client";

import { useState } from "react";
import {
  Settings,
  Users,
  ClipboardList,
  Target,
  Trash2,
  RefreshCw,
  Plus,
  Copy,
} from "lucide-react";
import { RequireAuth } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { TeamChip } from "@/components/team-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatMoney } from "@/lib/utils";
import { GROUP_IDS, teamsByGroup, TEAMS } from "@/lib/data/teams";
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

type Tab = "settings" | "people" | "results" | "answers";

function AdminInner() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("results");
  const tabs: { id: Tab; key: string; icon: React.ElementType }[] = [
    { id: "results", key: "admin.tab.results", icon: ClipboardList },
    { id: "people", key: "admin.tab.people", icon: Users },
    { id: "answers", key: "admin.tab.answers", icon: Target },
    { id: "settings", key: "admin.tab.settings", icon: Settings },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">{t("admin.title")}</h1>

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

      {tab === "results" && <ResultsTab />}
      {tab === "people" && <PeopleTab />}
      {tab === "answers" && <AnswersTab />}
      {tab === "settings" && <SettingsTab />}
    </div>
  );
}

function ResultsTab() {
  const { state, setTeamResult } = usePool();
  const { t } = useT();
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("admin.results.desc")}</p>
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
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function PeopleTab() {
  const { state, addParticipant, removeParticipant, choosePackage } = usePool();
  const { t } = useT();
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");

  const ownerByPkg: Record<string, string> = {};
  for (const p of state.participants)
    if (p.packageId) ownerByPkg[p.packageId] = p.id;

  const add = () => {
    if (!name.trim() || pin.length < 4) return;
    addParticipant(name, pin);
    setName("");
    setPin("");
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
            />
          </div>
          <div className="w-28 space-y-1.5">
            <Label>{t("admin.people.pin")}</Label>
            <Input
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              placeholder="1234"
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
                <div className="text-[11px] text-muted-foreground">
                  PIN {p.pin}
                </div>
              </div>
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
    </div>
  );
}

function AnswersTab() {
  const { state, setActuals } = usePool();
  const { t } = useT();
  const [champ, setChamp] = useState(state.actualChampionId ?? "");
  const [scorer, setScorer] = useState(state.actualTopScorer ?? "");
  const teamOptions = [...TEAMS].sort((a, b) => a.fifaRank - b.fifaRank);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("admin.answers.title")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="-mt-1 text-sm text-muted-foreground">
          {t("admin.answers.desc")}
        </p>
        <div className="space-y-1.5">
          <Label>{t("admin.answers.champion")}</Label>
          <Select value={champ} onChange={(e) => setChamp(e.target.value)}>
            <option value="">{t("admin.answers.notDecided")}</option>
            {teamOptions.map((tm) => (
              <option key={tm.id} value={tm.id}>
                {tm.flag} {tm.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>{t("admin.answers.scorer")}</Label>
          <Input
            value={scorer}
            onChange={(e) => setScorer(e.target.value)}
            placeholder={t("admin.answers.scorerPh")}
          />
        </div>
        <Button onClick={() => setActuals(champ || null, scorer || null)}>
          {t("admin.answers.save")}
        </Button>
      </CardContent>
    </Card>
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
          <CardTitle className="text-base">{t("admin.settings.buyIns")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {(["premium", "mid", "value"] as const).map((tier) => (
              <div key={tier} className="space-y-1.5">
                <Label>{t(`tier.${tier}`)}</Label>
                <Input
                  type="number"
                  min={0}
                  value={s.buyIns[tier]}
                  onChange={(e) =>
                    updateSettings({
                      buyIns: {
                        ...s.buyIns,
                        [tier]: Number(e.target.value) || 0,
                      },
                    })
                  }
                />
              </div>
            ))}
          </div>
          <Button variant="secondary" onClick={rebuildPackages}>
            <RefreshCw className="h-4 w-4" /> {t("admin.settings.apply")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("admin.settings.applyNote")}
          </p>
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-base text-destructive">
            {t("admin.settings.danger")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
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
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminPage() {
  return (
    <RequireAuth moderatorOnly>
      <AdminInner />
    </RequireAuth>
  );
}
