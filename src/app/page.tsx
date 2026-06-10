"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Trophy, Users, Sparkles, ArrowRight } from "lucide-react";
import { usePool } from "@/components/pool-provider";
import { LangToggle } from "@/components/lang-toggle";
import { useT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function LandingPage() {
  const router = useRouter();
  const { ready, me, join, login, loginModerator, state, loadDemo } = usePool();
  const { t } = useT();
  const [mode, setMode] = useState<"join" | "login" | "mod">("join");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (ready && me) router.replace(me.packageId ? "/dashboard" : "/draw");
  }, [ready, me, router]);

  const submit = () => {
    setError("");
    if (mode === "mod") {
      if (loginModerator(pin)) router.replace("/admin");
      else setError(t("err.modPin"));
      return;
    }
    if (!name.trim() || pin.length < 4) {
      setError(t("err.nameAndPin"));
      return;
    }
    if (mode === "join") {
      if (code.trim().toUpperCase() !== state.settings.joinCode.toUpperCase()) {
        setError(t("err.code"));
        return;
      }
      const exists = state.participants.some(
        (p) => p.name.trim().toLowerCase() === name.trim().toLowerCase(),
      );
      if (exists) {
        setError(t("err.nameTaken"));
        return;
      }
      join(name, pin);
      router.replace("/draw");
    } else {
      const found = login(name, pin);
      if (found) router.replace(found.packageId ? "/dashboard" : "/draw");
      else setError(t("err.noMatch"));
    }
  };

  const titleLines = t("landing.title").split("\n");

  return (
    <div className="min-h-screen">
      <section className="pitch-stripes text-primary-foreground">
        <div className="container relative z-10 py-14 md:py-20">
          <div className="mb-6 flex items-center justify-end">
            <LangToggle variant="onDark" />
          </div>
          <Badge className="bg-white/15 text-white hover:bg-white/15">
            <Sparkles className="mr-1 h-3 w-3" /> {t("landing.badge")}
          </Badge>
          <h1 className="mt-4 max-w-2xl text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
            {titleLines.map((line, i) => (
              <span key={i}>
                {line}
                {i < titleLines.length - 1 && <br />}
              </span>
            ))}
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/80 md:text-lg">
            {t("landing.subtitle")}
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-white/80">
            <span className="flex items-center gap-2">
              <Users className="h-4 w-4" /> {t("landing.feature1")}
            </span>
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4" /> {t("landing.feature2")}
            </span>
          </div>
        </div>
      </section>

      <section className="container -mt-10 pb-16">
        <Card className="mx-auto max-w-md animate-pop shadow-lg">
          <CardContent className="p-6">
            <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
              <TabBtn active={mode === "join"} onClick={() => setMode("join")}>
                {t("landing.tab.join")}
              </TabBtn>
              <TabBtn active={mode === "login"} onClick={() => setMode("login")}>
                {t("landing.tab.login")}
              </TabBtn>
            </div>

            {mode !== "mod" && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t("landing.name")}</Label>
                  <Input
                    id="name"
                    placeholder={t("landing.name.ph")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pin">{t("landing.pin")}</Label>
                  <Input
                    id="pin"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="••••"
                    value={pin}
                    onChange={(e) =>
                      setPin(e.target.value.replace(/\D/g, "").slice(0, 4))
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    {t("landing.pin.help")}
                  </p>
                </div>
                {mode === "join" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="code">{t("landing.code")}</Label>
                    <Input
                      id="code"
                      placeholder={t("landing.code.ph")}
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            {mode === "mod" && (
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
                />
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm font-medium text-destructive">{error}</p>
            )}

            <Button className="mt-5 w-full" size="lg" onClick={submit}>
              {mode === "join"
                ? t("landing.btn.join")
                : mode === "mod"
                  ? t("landing.btn.mod")
                  : t("landing.btn.login")}
              <ArrowRight className="h-4 w-4" />
            </Button>

            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <button
                className="underline-offset-2 hover:underline"
                onClick={() => {
                  setMode(mode === "mod" ? "join" : "mod");
                  setError("");
                }}
              >
                {mode === "mod" ? t("landing.backPlayer") : t("landing.toMod")}
              </button>
              <button
                className="underline-offset-2 hover:underline"
                onClick={() => {
                  loadDemo();
                  router.replace("/leaderboard");
                }}
              >
                {t("landing.demo")}
              </button>
            </div>
          </CardContent>
        </Card>
        <p className="mx-auto mt-4 max-w-md text-center text-xs text-muted-foreground">
          {t("landing.footnote")}
        </p>
      </section>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-2 text-sm font-semibold transition-colors",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
