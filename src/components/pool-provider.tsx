"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  DistributionMode,
  Participant,
  PoolSettings,
  PoolState,
  ScoringConfig,
  Stage,
  TeamResult,
} from "@/lib/types";

export interface SetupConfig {
  name: string;
  currency: string;
  joinCode: string;
  distributionMode: DistributionMode;
  buyIn: number;
  teamPrice: number;
  tierBuyIns: { premium: number; mid: number; value: number };
  playerNames: string[];
}
import { fetchResults } from "@/lib/results-sync";
import { fetchSeasonResults } from "@/lib/live";
import {
  buildPackagesFor,
  createInitialState,
  loadState,
  migrateState,
  resetState,
  saveState,
  seedDemo,
  uid,
} from "@/lib/store";
import {
  isSupabaseEnabled,
  loadRemote,
  onRemoteSaved,
  saveRemoteMutation,
  subscribeRemote,
} from "@/lib/supabase";

const SESSION_KEY = "quiniela-mundial-2026:session";

interface PoolContextValue {
  state: PoolState;
  ready: boolean;
  sessionId: string | null;
  me: Participant | null;
  // session (organizer only)
  loginModerator: (pin: string) => boolean;
  logout: () => void;
  // moderator actions
  choosePackage: (participantId: string, packageId: string) => void;
  setTeamOwner: (teamId: string, participantId: string | null) => void;
  addParticipant: (name: string) => Participant;
  removeParticipant: (participantId: string) => void;
  setParticipantPaid: (participantId: string, paid: boolean) => void;
  setTeamPaid: (participantId: string, teamId: string, paid: boolean) => void;
  setTeamResult: (
    teamId: string,
    patch: Partial<{
      groupWins: number;
      groupDraws: number;
      groupLosses: number;
      stageReached: Stage;
    }>,
  ) => void;
  clearManual: (teamId: string) => void;
  applyAutoResults: (results: Record<string, Partial<TeamResult>>) => void;
  syncNow: () => Promise<boolean>;
  syncing: boolean;
  lastSync: number | null;
  updateSettings: (patch: Partial<PoolSettings>) => void;
  updateScoring: (patch: Partial<ScoringConfig>) => void;
  rebuildPackages: () => void;
  applySetup: (cfg: SetupConfig) => void;
  loadDemo: () => void;
  reset: () => void;
}

const PoolContext = createContext<PoolContextValue | null>(null);

export function PoolProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<PoolState>(createInitialState);
  const [ready, setReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<number | null>(null);

  // Tracks the last JSON we wrote/received so realtime echoes don't loop.
  const lastJsonRef = useRef<string>("");

  useEffect(() => {
    setSessionId(window.localStorage.getItem(SESSION_KEY));

    if (isSupabaseEnabled) {
      // Whenever a write lands on the server, adopt the authoritative result
      // (which may include changes merged in from other devices).
      onRemoteSaved((saved) => {
        lastJsonRef.current = JSON.stringify(saved);
        setStateRaw(saved);
      });
      // Attach the realtime listener synchronously so cleanup always tears it
      // down (React dev mounts effects twice).
      const unsub = subscribeRemote((incoming) => {
        const json = JSON.stringify(incoming);
        if (json === lastJsonRef.current) return; // ignore our own echo
        lastJsonRef.current = json;
        setStateRaw(migrateState(incoming));
      });
      loadRemote()
        .then((raw) => {
          const remote = raw ? migrateState(raw) : null;
          if (remote) {
            lastJsonRef.current = JSON.stringify(remote);
            setStateRaw(remote);
          } else {
            // First run on a fresh project — seed the document.
            const initial = createInitialState();
            lastJsonRef.current = JSON.stringify(initial);
            setStateRaw(initial);
            saveRemoteMutation(() => initial, initial);
          }
        })
        .catch(() => setStateRaw(loadState()))
        .finally(() => setReady(true));
      return () => unsub();
    }

    // localStorage-only mode
    setStateRaw(loadState());
    setReady(true);
  }, []);

  // Apply a change locally (optimistic) and durably. With Supabase, the change
  // is replayed against the freshest server document so concurrent edits never
  // clobber each other; the authoritative result comes back via onRemoteSaved.
  const update = useCallback((fn: (prev: PoolState) => PoolState) => {
    setStateRaw((prev) => {
      const next = fn(prev);
      if (isSupabaseEnabled) {
        saveRemoteMutation(fn, next);
      } else {
        lastJsonRef.current = JSON.stringify(next);
        saveState(next);
      }
      return next;
    });
  }, []);

  // Wholesale replace (wizard / reset / demo): a replace mutation ignores prev.
  const commit = useCallback((next: PoolState) => {
    setStateRaw(next);
    if (isSupabaseEnabled) {
      saveRemoteMutation(() => next, next);
    } else {
      lastJsonRef.current = JSON.stringify(next);
      saveState(next);
    }
  }, []);

  const setSession = useCallback((id: string | null) => {
    setSessionId(id);
    if (typeof window !== "undefined") {
      if (id) window.localStorage.setItem(SESSION_KEY, id);
      else window.localStorage.removeItem(SESSION_KEY);
    }
  }, []);

  const me = useMemo(
    () => state.participants.find((p) => p.id === sessionId) ?? null,
    [state.participants, sessionId],
  );

  // ── session (organizer only) ──
  const loginModerator = useCallback(
    (pin: string) => {
      const mod = state.participants.find((p) => p.isModerator && p.pin === pin);
      if (mod) {
        setSession(mod.id);
        return true;
      }
      return false;
    },
    [state.participants, setSession],
  );

  const logout = useCallback(() => setSession(null), [setSession]);

  // ── participants (managed by the organizer) ──
  const addParticipant = useCallback(
    (name: string) => {
      const p: Participant = {
        id: uid(),
        name: name.trim(),
        packageId: null,
        isModerator: false,
        joinedAt: Date.now(),
      };
      update((prev) => ({ ...prev, participants: [...prev.participants, p] }));
      return p;
    },
    [update],
  );

  const removeParticipant = useCallback(
    (participantId: string) => {
      update((prev) => ({
        ...prev,
        participants: prev.participants.filter((p) => p.id !== participantId),
      }));
    },
    [update],
  );

  const setParticipantPaid = useCallback(
    (participantId: string, paid: boolean) => {
      update((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === participantId ? { ...p, paid } : p,
        ),
      }));
    },
    [update],
  );

  const setTeamPaid = useCallback(
    (participantId: string, teamId: string, paid: boolean) => {
      update((prev) => ({
        ...prev,
        participants: prev.participants.map((p) => {
          if (p.id !== participantId) return p;
          const current = p.paidTeams ?? [];
          const next = paid
            ? current.includes(teamId)
              ? current
              : [...current, teamId]
            : current.filter((id) => id !== teamId);
          return { ...p, paidTeams: next };
        }),
      }));
    },
    [update],
  );

  const choosePackage = useCallback(
    (participantId: string, packageId: string) => {
      update((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === participantId ? { ...p, packageId } : p,
        ),
      }));
    },
    [update],
  );

  // ── moderator: results & config ──
  const setTeamResult = useCallback(
    (
      teamId: string,
      patch: Partial<{
        groupWins: number;
        groupDraws: number;
        groupLosses: number;
        stageReached: Stage;
      }>,
    ) => {
      update((prev) => ({
        ...prev,
        results: {
          ...prev.results,
          // A manual edit pins the team so auto-sync won't overwrite it.
          [teamId]: { ...prev.results[teamId], ...patch, manual: true },
        },
      }));
    },
    [update],
  );

  // Revert a team back to auto-synced results.
  const clearManual = useCallback(
    (teamId: string) => {
      update((prev) => ({
        ...prev,
        results: {
          ...prev.results,
          [teamId]: { ...prev.results[teamId], manual: false },
        },
      }));
    },
    [update],
  );

  // Merge web-synced results in, leaving manually-pinned teams untouched.
  const applyAutoResults = useCallback(
    (incoming: Record<string, Partial<TeamResult>>) => {
      update((prev) => {
        const results = { ...prev.results };
        let changed = false;
        for (const [teamId, patch] of Object.entries(incoming)) {
          const existing = results[teamId];
          // A manual (organizer-edited) record is never overwritten.
          if (existing?.manual) continue;
          // Seed a default record if this team is somehow missing, so a
          // partial/overwritten results map can't silently drop scores.
          const cur: TeamResult = existing ?? {
            teamId,
            groupWins: 0,
            groupDraws: 0,
            groupLosses: 0,
            goalsFor: 0,
            stageReached: "group",
          };
          const next = { ...cur, ...patch };
          if (
            !existing ||
            next.groupWins !== cur.groupWins ||
            next.groupDraws !== cur.groupDraws ||
            next.groupLosses !== cur.groupLosses ||
            (next.goalsFor ?? 0) !== (cur.goalsFor ?? 0) ||
            (next.groupGoalsFor ?? 0) !== (cur.groupGoalsFor ?? 0) ||
            (next.groupGoalsAgainst ?? 0) !== (cur.groupGoalsAgainst ?? 0) ||
            next.stageReached !== cur.stageReached
          ) {
            results[teamId] = next;
            changed = true;
          }
        }
        return changed ? { ...prev, results } : prev;
      });
    },
    [update],
  );

  const syncNow = useCallback(async () => {
    setSyncing(true);
    try {
      // Prefer API-Football (authoritative + fast); fall back to the free feed.
      const data = (await fetchSeasonResults()) ?? (await fetchResults());
      if (data) {
        applyAutoResults(data.results);
        setLastSync(Date.now());
        return true;
      }
      return false;
    } finally {
      setSyncing(false);
    }
  }, [applyAutoResults]);

  const updateSettings = useCallback(
    (patch: Partial<PoolSettings>) => {
      update((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
    },
    [update],
  );

  const updateScoring = useCallback(
    (patch: Partial<ScoringConfig>) => {
      update((prev) => ({ ...prev, scoring: { ...prev.scoring, ...patch } }));
    },
    [update],
  );

  const rebuildPackages = useCallback(() => {
    update((prev) => ({
      ...prev,
      packages: buildPackagesFor(prev.settings),
    }));
  }, [update]);

  // Individual mode: assign (or clear) the owner of a single team.
  const setTeamOwner = useCallback(
    (teamId: string, participantId: string | null) => {
      update((prev) => {
        const owners = { ...prev.teamOwners };
        if (participantId) owners[teamId] = participantId;
        else delete owners[teamId];
        return { ...prev, teamOwners: owners };
      });
    },
    [update],
  );

  const loadDemo = useCallback(() => {
    const next = seedDemo();
    commit(next);
    setSession("mod");
  }, [commit, setSession]);

  const reset = useCallback(() => {
    commit(resetState());
    setSession(null);
  }, [commit, setSession]);

  // Wizard finish: build a fresh, fully-configured pool in one atomic commit
  // (keeps the organizer logged in).
  const applySetup = useCallback(
    (cfg: SetupConfig) => {
      const base = createInitialState();
      base.settings = {
        ...base.settings,
        name: cfg.name.trim() || base.settings.name,
        currency: cfg.currency,
        joinCode: cfg.joinCode.trim().toUpperCase() || base.settings.joinCode,
        distributionMode: cfg.distributionMode,
        buyIn: cfg.buyIn,
        teamPrice: cfg.teamPrice,
        tierBuyIns: cfg.tierBuyIns,
      };
      base.packages = buildPackagesFor(base.settings);
      base.participants = [
        base.participants[0],
        ...cfg.playerNames
          .map((n) => n.trim())
          .filter(Boolean)
          .map((name) => ({
            id: uid(),
            name,
            packageId: null,
            isModerator: false,
            joinedAt: Date.now(),
          })),
      ];
      base.teamOwners = {};
      commit(base);
      setSession("mod");
    },
    [commit, setSession],
  );

  const value: PoolContextValue = {
    state,
    ready,
    sessionId,
    me,
    loginModerator,
    logout,
    choosePackage,
    setTeamOwner,
    addParticipant,
    removeParticipant,
    setParticipantPaid,
    setTeamPaid,
    setTeamResult,
    clearManual,
    applyAutoResults,
    syncNow,
    syncing,
    lastSync,
    updateSettings,
    updateScoring,
    rebuildPackages,
    applySetup,
    loadDemo,
    reset,
  };

  return <PoolContext.Provider value={value}>{children}</PoolContext.Provider>;
}

export function usePool() {
  const ctx = useContext(PoolContext);
  if (!ctx) throw new Error("usePool must be used within PoolProvider");
  return ctx;
}
