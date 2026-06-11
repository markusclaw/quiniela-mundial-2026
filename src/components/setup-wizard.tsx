"use client";

import { useState } from "react";
import { ArrowRight, ArrowLeft, Check, Sparkles } from "lucide-react";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatMoney } from "@/lib/utils";
import type { DistributionMode } from "@/lib/types";

const MODES: DistributionMode[] = ["balanced", "tiered", "individual"];
const TOTAL = 5;

export function SetupWizard({ onClose }: { onClose: () => void }) {
  const { state, applySetup } = usePool();
  const { t } = useT();
  const s = state.settings;

  const [step, setStep] = useState(1);
  const [name, setName] = useState(s.name);
  const [currency, setCurrency] = useState(s.currency);
  const [joinCode, setJoinCode] = useState(s.joinCode);
  const [mode, setMode] = useState<DistributionMode>(s.distributionMode);
  const [buyIn, setBuyIn] = useState(s.buyIn);
  const [teamPrice, setTeamPrice] = useState(s.teamPrice);
  const [tierBuyIns, setTierBuyIns] = useState(s.tierBuyIns);
  const [playersText, setPlayersText] = useState("");

  const playerNames = playersText
    .split("\n")
    .map((n) => n.trim())
    .filter(Boolean);

  const finish = () => {
    applySetup({ name, currency, joinCode, distributionMode: mode, buyIn, teamPrice, tierBuyIns, playerNames });
    onClose();
  };

  return (
    <Card className="mx-auto max-w-xl">
      <CardContent className="space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="h-5 w-5 text-primary" /> {t("wizard.heading")}
          </div>
          <span className="text-xs text-muted-foreground">
            {t("wizard.step", { n: step, total: TOTAL })}
          </span>
        </div>

        <div className="flex gap-1">
          {Array.from({ length: TOTAL }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 flex-1 rounded-full",
                i < step ? "bg-primary" : "bg-muted",
              )}
            />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-semibold">{t("wizard.s1")}</h2>
            <div className="space-y-1.5">
              <Label>{t("admin.settings.name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("admin.settings.currency")}</Label>
                <Select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                  {["MXN", "USD", "EUR", "COP", "ARS"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>{t("admin.settings.joinCode")}</Label>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <h2 className="font-semibold">{t("wizard.s2")}</h2>
            {MODES.map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "w-full rounded-lg border p-3 text-left transition-colors",
                  mode === m
                    ? "border-primary bg-primary/5 ring-1 ring-primary"
                    : "hover:bg-muted/50",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{t(`mode.${m}`)}</span>
                  {mode === m && <Check className="h-4 w-4 text-primary" />}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {t(`mode.${m}.desc`)}
                </p>
              </button>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h2 className="font-semibold">{t("wizard.s3")}</h2>
            {mode === "balanced" && (
              <div className="max-w-[200px] space-y-1.5">
                <Label>{t("admin.settings.buyInLabel")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={buyIn}
                  onChange={(e) => setBuyIn(Number(e.target.value) || 0)}
                />
              </div>
            )}
            {mode === "individual" && (
              <div className="max-w-[200px] space-y-1.5">
                <Label>{t("admin.settings.teamPriceLabel")}</Label>
                <Input
                  type="number"
                  min={0}
                  value={teamPrice}
                  onChange={(e) => setTeamPrice(Number(e.target.value) || 0)}
                />
              </div>
            )}
            {mode === "tiered" && (
              <div className="grid max-w-md grid-cols-3 gap-3">
                {(["premium", "mid", "value"] as const).map((tier) => (
                  <div key={tier} className="space-y-1.5">
                    <Label>{t(`tier.${tier}`)}</Label>
                    <Input
                      type="number"
                      min={0}
                      value={tierBuyIns[tier]}
                      onChange={(e) =>
                        setTierBuyIns({
                          ...tierBuyIns,
                          [tier]: Number(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-2">
            <h2 className="font-semibold">{t("wizard.s4")}</h2>
            <Label>{t("wizard.playersLabel")}</Label>
            <textarea
              value={playersText}
              onChange={(e) => setPlayersText(e.target.value)}
              rows={8}
              placeholder={"Greg\nXavi\nLucía\n…"}
              className="w-full rounded-md border border-input bg-background p-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="text-xs text-muted-foreground">
              {t("wizard.playersHelp")} · {t("wizard.playersCount", { n: playerNames.length })}
            </p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            <h2 className="font-semibold">{t("wizard.s5")}</h2>
            <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
              <Row label={t("admin.settings.name")} value={name} />
              <Row label={t("admin.settings.distMode")} value={t(`mode.${mode}`)} />
              <Row
                label={t("wizard.s3")}
                value={
                  mode === "individual"
                    ? `${formatMoney(teamPrice, currency)} / ${t("admin.people.teamsCount")}`
                    : mode === "tiered"
                      ? `${formatMoney(tierBuyIns.premium, currency)} · ${formatMoney(tierBuyIns.mid, currency)} · ${formatMoney(tierBuyIns.value, currency)}`
                      : formatMoney(buyIn, currency)
                }
              />
              <Row
                label={t("wizard.s4")}
                value={String(playerNames.length)}
              />
            </div>
            <p className="text-xs text-muted-foreground">{t("wizard.reviewNote")}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <Button variant="ghost" onClick={() => setStep((x) => x - 1)}>
              <ArrowLeft className="h-4 w-4" /> {t("wizard.back")}
            </Button>
          ) : (
            <Button variant="ghost" onClick={onClose}>
              {t("wizard.cancel")}
            </Button>
          )}
          {step < TOTAL ? (
            <Button onClick={() => setStep((x) => x + 1)}>
              {t("wizard.next")} <ArrowRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button onClick={finish}>
              <Check className="h-4 w-4" /> {t("wizard.finish")}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
