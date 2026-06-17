"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Flame, Crown, Wallet, Footprints, ArrowRight } from "lucide-react";
import { SoccerBall } from "@/components/ui/soccer-ball";
import { PublicShell } from "@/components/require-auth";
import { usePool } from "@/components/pool-provider";
import { useT } from "@/lib/i18n";
import { MatchdayToday } from "@/components/matchday-today";
import { StandingRow } from "@/components/standing-row";
import { TeamCrest } from "@/components/team-crest";
import { Card, CardContent } from "@/components/ui/card";
import { formatMoney, cn } from "@/lib/utils";
import { fetchTopScorer, type TopScorer } from "@/lib/live";
import {
  computeStandings,
  resolvePrizes,
  totalPot,
  amountCollected,
  ownedTeamIds,
  ownerMap,
  rankStandings,
  teamsAlive,
  type ParticipantStanding,
  type ResolvedPrize,
} from "@/lib/scoring";

/** Leader name(s) for a metric + the reason a tie resolved (for a badge). */
function leaderModel(
  playing: ParticipantStanding[],
  primary: (s: ParticipantStanding) => number,
  secondary: (s: ParticipantStanding) => number,
): { names: string[]; note: "goals" | "tie" | null } {
  const top = Math.max(0, ...playing.map(primary));
  if (top <= 0) return { names: [], note: null };
  const tied = playing.filter((s) => primary(s) === top);
  if (tied.length === 1) return { names: [tied[0].participant.name], note: null };
  const sec = Math.max(...tied.map(secondary));
  const both = tied.filter((s) => secondary(s) === sec);
  return both.length === 1
    ? { names: [both[0].participant.name], note: "goals" }
    : { names: both.map((s) => s.participant.name), note: "tie" };
}

function DashboardInner() {
  const { state, me } = usePool();
  const { t } = useT();
  const standings = useMemo(() => computeStandings(state), [state]);
  const prizes = useMemo(() => resolvePrizes(state), [state]);
  const pot = totalPot(state);
  const cur = state.settings.currency;

  const playing = standings.filter(
    (s) => ownedTeamIds(s.participant, state).length > 0,
  );
  // Standings on the home page only list players who have actually scored,
  // ranked with ties (1,1,3,…); top 10.
  const ranked = rankStandings(
    playing.filter((s) => s.totalPoints > 0),
  ).slice(0, 10);

  const pointsModel = leaderModel(
    playing,
    (s) => s.totalPoints,
    (s) => s.totalGoals,
  );
  const goalsModel = leaderModel(
    playing,
    (s) => s.totalGoals,
    (s) => s.totalPoints,
  );

  const championPrize = prizes.find((p) => p.type === "champion");
  const pointsPrize = prizes.find((p) => p.type === "most_points");
  const goalsPrize = prizes.find((p) => p.type === "most_goals");
  const bootPrize = prizes.find((p) => p.type === "golden_boot");
  const pointsPts = Math.max(0, ...playing.map((s) => s.totalPoints));
  const goalsCount = Math.max(0, ...playing.map((s) => s.totalGoals));

  const collected = amountCollected(state);
  const outstanding = Math.max(0, pot - collected);

  // Golden Boot — live tournament top scorer (for the side prize).
  const DEMO_BOOT = false;
  const [topScorer, setTopScorer] = useState<TopScorer | null>(null);
  useEffect(() => {
    let on = true;
    const load = () =>
      fetchTopScorer().then((ts) => {
        if (!on) return;
        if (ts) setTopScorer(ts);
        else if (DEMO_BOOT)
          setTopScorer({
            player: "L. Messi",
            goals: 5,
            teamName: "Argentina",
            teamId: "ARG",
          });
        // else: keep the last good value (feed hiccup) — do nothing
      });
    load();
    const id = setInterval(load, 3 * 60 * 1000); // refresh every 3 min
    return () => {
      on = false;
      clearInterval(id);
    };
  }, []);
  const owners = useMemo(() => ownerMap(state), [state]);
  const bootOwner = topScorer?.teamId ? owners[topScorer.teamId] : undefined;

  return (
    <div className="space-y-6">
      <MatchdayToday />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <PotCard
          pot={pot}
          collected={collected}
          outstanding={outstanding}
          cur={cur}
        />
        <ChampionCard prize={championPrize} cur={cur} />
        <LeaderCard
          icon={Flame}
          label={t("home.leader")}
          leaders={pointsModel.names}
          sub={pointsModel.names.length ? t("home.leaderSub", { pts: pointsPts }) : ""}
          note={pointsModel.note}
          prize={pointsPrize}
          cur={cur}
        />
        <LeaderCard
          icon={SoccerBall}
          label={t("home.goalsLeader")}
          leaders={goalsModel.names}
          sub={
            goalsModel.names.length
              ? t("home.goalsLeaderSub", { goals: goalsCount })
              : ""
          }
          note={goalsModel.note === "goals" ? null : goalsModel.note}
          prize={goalsPrize}
          cur={cur}
        />
        {topScorer && (
          <BootCard
            scorer={topScorer}
            owner={bootOwner}
            prize={bootPrize}
            cur={cur}
          />
        )}
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b bg-secondary/60 px-4 py-2.5">
          <span className="text-sm font-bold">
            {t("home.standings")}
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              {playing.length} {t("home.players").toLowerCase()}
            </span>
          </span>
          <Link
            href="/leaderboard"
            className="flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
          >
            {t("home.fullTable")} <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {ranked.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            {t("home.noRanked")}
          </p>
        ) : (
          <div className="divide-y">
            {ranked.map(({ s, rank }) => (
              <StandingRow
                key={s.participant.id}
                s={s}
                rank={rank}
                isMe={s.participant.id === me?.id}
                alive={teamsAlive(s.participant, state)}
                owned={ownedTeamIds(s.participant, state).length}
                bare
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Cards ───────────────────────────────────────────────────────────────────

/** Shared chrome: icon chip + label header, flex body so footers align. */
function CardShell({
  icon: Icon,
  label,
  chip,
  accent,
  children,
}: {
  icon: React.ElementType;
  label: string;
  chip: string; // tailwind classes for the icon chip (bg + text)
  accent?: string; // optional card border/background accent
  children: React.ReactNode;
}) {
  return (
    <Card className={cn("overflow-hidden", accent)}>
      <CardContent className="flex h-full flex-col p-3.5 sm:p-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
              chip,
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="truncate text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
        </div>
        <div className="mt-2.5 flex flex-1 flex-col">{children}</div>
      </CardContent>
    </Card>
  );
}

/** Small rounded pill used for prize values / status. */
function Pill({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold",
        className,
      )}
    >
      {children}
    </span>
  );
}

function PotCard({
  pot,
  collected,
  outstanding,
  cur,
}: {
  pot: number;
  collected: number;
  outstanding: number;
  cur: string;
}) {
  const { t } = useT();
  const pct = pot > 0 ? Math.min(100, Math.round((collected / pot) * 100)) : 0;
  return (
    <CardShell
      icon={Wallet}
      label={t("home.pot")}
      chip="bg-primary/15 text-primary"
      accent="border-primary/30 bg-primary/5"
    >
      <div className="truncate text-2xl font-extrabold tracking-tight">
        {formatMoney(pot, cur)}
      </div>
      <div className="mt-auto pt-2.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <div className="mt-1.5 text-[11px] text-muted-foreground">
          {formatMoney(outstanding, cur)} {t("home.owed")}
        </div>
      </div>
    </CardShell>
  );
}

function ChampionCard({
  prize,
  cur,
}: {
  prize: ResolvedPrize | undefined;
  cur: string;
}) {
  const { t } = useT();
  const amount = prize?.amount ?? 0;
  const pct = prize ? Math.round(prize.pct * 100) : 0;
  const who =
    prize && prize.winnerNames.length > 0 ? prize.winnerNames.join(" · ") : null;
  return (
    <CardShell
      icon={Crown}
      label={t("home.champPrize")}
      chip="bg-gold/25 text-gold-foreground"
      accent="border-gold/40 bg-gold/5"
    >
      <div className="truncate text-2xl font-extrabold tracking-tight">
        {formatMoney(amount, cur)}
      </div>
      <div className="text-[11px] text-muted-foreground">
        {pct}% {t("home.ofPot")}
      </div>
      <div className="mt-auto pt-2.5">
        {who ? (
          <Pill className="max-w-full truncate bg-gold/25 text-gold-foreground">
            {t("prize.winning")}: {who}
          </Pill>
        ) : (
          <Pill className="bg-muted text-muted-foreground">{t("prize.tbd")}</Pill>
        )}
      </div>
    </CardShell>
  );
}

function LeaderCard({
  icon: Icon,
  label,
  leaders,
  sub,
  note,
  prize,
  cur,
}: {
  icon: React.ElementType;
  label: string;
  leaders: string[];
  sub: string;
  note: "goals" | "tie" | null;
  prize: ResolvedPrize | undefined;
  cur: string;
}) {
  const { t } = useT();
  const value =
    leaders.length === 0
      ? "—"
      : leaders.length <= 2
        ? leaders.join(" · ")
        : `${leaders.length} ${t("home.tied")}`;
  const pct = prize ? Math.round(prize.pct * 100) : 0;
  return (
    <CardShell icon={Icon} label={label} chip="bg-primary/15 text-primary">
      <div className="line-clamp-2 text-lg font-extrabold leading-tight tracking-tight">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-2.5">
        {prize && (
          <Pill className="bg-primary/10 text-primary">
            {formatMoney(prize.amount, cur)} · {pct}%
          </Pill>
        )}
        {note && (
          <Pill className="bg-muted text-muted-foreground">
            {note === "goals" ? t("tiebreak.goals") : t("tiebreak.tie")}
          </Pill>
        )}
      </div>
    </CardShell>
  );
}

// Bota de Oro — the tournament's top scorer + who owns their national team.
function BootCard({
  scorer,
  owner,
  prize,
  cur,
}: {
  scorer: TopScorer;
  owner?: string;
  prize: ResolvedPrize | undefined;
  cur: string;
}) {
  const { t } = useT();
  return (
    <CardShell
      icon={Footprints}
      label={t("prize.golden_boot")}
      chip="bg-gold/25 text-gold-foreground"
      accent="border-gold/40 bg-gold/5"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        {scorer.teamId && <TeamCrest teamId={scorer.teamId} size="xs" />}
        <span className="truncate text-lg font-extrabold leading-tight tracking-tight">
          {scorer.player}
        </span>
      </div>
      <div className="text-[11px] text-muted-foreground">
        {t("home.goalsLeaderSub", { goals: scorer.goals })}
      </div>
      <div className="mt-auto pt-2.5">
        {prize && (
          <div className="text-base font-extrabold tabular-nums">
            {formatMoney(prize.amount, cur)}
          </div>
        )}
        <div className="line-clamp-1 text-[11px] text-muted-foreground">
          {owner ? (
            <>
              <span>{t("prize.winning")}: </span>
              <span className="font-semibold text-foreground">{owner}</span>
            </>
          ) : (
            t("prize.tbd")
          )}
        </div>
      </div>
    </CardShell>
  );
}

export default function DashboardPage() {
  return (
    <PublicShell>
      <DashboardInner />
    </PublicShell>
  );
}
