"use client";

import Link from "next/link";
import { Printer, ArrowLeft, Trophy } from "lucide-react";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/utils";
import { TEAMS, getTeam } from "@/lib/data/teams";

export default function PrintPage() {
  const { ready, state } = usePool();
  const { t } = useT();

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center text-muted-foreground">
        <Trophy className="h-6 w-6 animate-pulse" />
      </div>
    );
  }

  const { distributionMode, currency, buyIn, teamPrice } = state.settings;
  const individual = distributionMode === "individual";

  return (
    <div className="mx-auto max-w-5xl p-4 sm:p-8">
      {/* Toolbar — hidden when printing */}
      <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 border-b pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t("print.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("print.help")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/admin"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-1 inline h-4 w-4" />
            {t("print.back")}
          </Link>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> {t("print.button")}
          </Button>
        </div>
      </div>

      {individual ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {TEAMS.map((tm) => (
            <div
              key={tm.id}
              className="slip flex break-inside-avoid flex-col items-center justify-center rounded border border-dashed border-black/50 px-2 py-4 text-center"
            >
              <div className="text-4xl leading-none">{tm.flag}</div>
              <div className="mt-1.5 text-sm font-bold leading-tight">
                {tm.name}
              </div>
              <div className="mt-0.5 text-[10px] text-black/50">
                {formatMoney(teamPrice, currency)}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {state.packages.map((pkg) => (
            <div
              key={pkg.id}
              className="slip break-inside-avoid rounded border border-dashed border-black/50 p-3"
            >
              <div className="flex items-center justify-between border-b border-dashed border-black/30 pb-1.5">
                <span className="font-bold">{pkg.label}</span>
                <span className="text-sm font-semibold">
                  {formatMoney(pkg.buyIn, currency)}
                </span>
              </div>
              <div className="mt-2 space-y-1">
                {pkg.teamIds.map((tid) => {
                  const tm = getTeam(tid);
                  if (!tm) return null;
                  return (
                    <div key={tid} className="flex items-center gap-2 text-sm">
                      <span className="text-lg leading-none">{tm.flag}</span>
                      <span className="font-medium">{tm.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
