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
  saveRemote,
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

  // Persist a state snapshot to the active backend (Supabase or localStorage).
  const persist = useCallback((next: PoolState) => {
    lastJsonRef.current = JSON.stringify(next);
    if (isSupabaseEnabled) saveRemote(next);
    else saveState(next);
  }, []);

  useEffect(() => {
    setSessionId(window.localStorage.getItem(SESSION_KEY));

    if (isSupabaseEnabled) {
      let unsub = () => {};
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
            saveRemote(initial);
          }
        })
        .catch(() => setStateRaw(loadState()))
        .finally(() => {
          setReady(true);
          unsub = subscribeRemote((incoming) => {
            const json = JSON.stringify(incoming);
            if (json === lastJsonRef.current) return; // ignore our own echo
            lastJsonRef.current = json;
            setStateRaw(incoming);
          });
        });
      return () => unsub();
    }

    // localStorage-only mode
    setStateRaw(loadState());
    setReady(true);
  }, []);

  const commit = useCallback(
    (next: PoolState) => {
      setStateRaw(next);
      persist(next);
    },
    [persist],
  );

  const update = useCallback(
    (fn: (prev: PoolState) => PoolState) => {
      setStateRaw((prev) => {
        const next = fn(prev);
        persist(next);
        return next;
      });
    },
    [persist],
  );

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
          const cur = results[teamId];
          if (!cur || cur.manual) continue;
          const next = { ...cur, ...patch };
          if (
            next.groupWins !== cur.groupWins ||
            next.groupDraws !== cur.groupDraws ||
            next.groupLosses !== cur.groupLosses ||
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
      const data = await fetchResults();
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
