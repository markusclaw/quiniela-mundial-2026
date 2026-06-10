"use client";

import { useState } from "react";
import { Trophy, Lock, ArrowRight } from "lucide-react";
import { usePool } from "@/components/pool-provider";
import { AppShell } from "@/components/app-shell";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

function Loading() {
  return (
    <div className="grid min-h-screen place-items-center text-muted-foreground">
      <Trophy className="h-6 w-6 animate-pulse" />
    </div>
  );
}

/** Public, read-only pages — no login required. */
export function PublicShell({ children }: { children: React.ReactNode }) {
  const { ready } = usePool();
  if (!ready) return <Loading />;
  return <AppShell>{children}</AppShell>;
}

/** Organizer-only area. Shows a PIN gate until the organizer logs in. */
export function AdminGate({ children }: { children: React.ReactNode }) {
  const { ready, me, loginModerator } = usePool();
  const { t } = useT();
  const [pin, setPin] = useState("");
  const [err, setErr] = useState("");

  if (!ready) return <Loading />;
  if (me?.isModerator) return <AppShell>{children}</AppShell>;

  const submit = () => {
    if (loginModerator(pin)) setErr("");
    else setErr(t("err.modPin"));
  };

  return (
    <AppShell>
      <Card className="mx-auto max-w-sm">
        <CardContent className="space-y-4 p-6">
          <div className="flex items-center gap-2 text-primary">
            <Lock className="h-5 w-5" />
            <span className="font-bold">{t("admin.login.title")}</span>
          </div>
          <p className="text-sm text-muted-foreground">
            {t("admin.login.prompt")}
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="modpin">{t("landing.modpin")}</Label>
            <Input
              id="modpin"
              inputMode="numeric"
              placeholder={t("landing.modpin.ph")}
              value={pin}
              onChange={(e) =>
                setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
              }
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          {err && <p className="text-sm font-medium text-destructive">{err}</p>}
          <Button className="w-full" onClick={submit}>
            {t("landing.btn.mod")} <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </AppShell>
  );
}
