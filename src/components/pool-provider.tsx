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
  Participant,
  PoolSettings,
  PoolState,
  ScoringConfig,
  Stage,
} from "@/lib/types";
import {
  createInitialState,
  loadState,
  resetState,
  saveState,
  seedDemo,
  uid,
} from "@/lib/store";
import { buildPackages } from "@/lib/packages";
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
  // session
  login: (name: string, pin: string) => Participant | null;
  loginModerator: (pin: string) => boolean;
  logout: () => void;
  // participant actions
  join: (name: string, pin: string) => Participant;
  choosePackage: (participantId: string, packageId: string) => void;
  setPredictions: (
    participantId: string,
    preds: Partial<
      Pick<Participant, "predChampionId" | "predTopScorer" | "predDarkHorseId">
    >,
  ) => void;
  // moderator actions
  addParticipant: (name: string, pin: string) => Participant;
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
  setActuals: (championId: string | null, topScorer: string | null) => void;
  updateSettings: (patch: Partial<PoolSettings>) => void;
  updateScoring: (patch: Partial<ScoringConfig>) => void;
  rebuildPackages: () => void;
  loadDemo: () => void;
  reset: () => void;
}

const PoolContext = createContext<PoolContextValue | null>(null);

export function PoolProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateRaw] = useState<PoolState>(createInitialState);
  const [ready, setReady] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

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
        .then((remote) => {
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

  // ── session ──
  const login = useCallback(
    (name: string, pin: string) => {
      const found = state.participants.find(
        (p) =>
          p.name.trim().toLowerCase() === name.trim().toLowerCase() &&
          p.pin === pin,
      );
      if (found) setSession(found.id);
      return found ?? null;
    },
    [state.participants, setSession],
  );

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

  // ── participants ──
  const createParticipant = useCallback(
    (name: string, pin: string): Participant => ({
      id: uid(),
      name: name.trim(),
      pin,
      packageId: null,
      isModerator: false,
      joinedAt: Date.now(),
      predChampionId: null,
      predTopScorer: null,
      predDarkHorseId: null,
    }),
    [],
  );

  const join = useCallback(
    (name: string, pin: string) => {
      const p = createParticipant(name, pin);
      update((prev) => ({ ...prev, participants: [...prev.participants, p] }));
      setSession(p.id);
      return p;
    },
    [createParticipant, update, setSession],
  );

  const addParticipant = useCallback(
    (name: string, pin: string) => {
      const p = createParticipant(name, pin);
      update((prev) => ({ ...prev, participants: [...prev.participants, p] }));
      return p;
    },
    [createParticipant, update],
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

  const setPredictions = useCallback(
    (
      participantId: string,
      preds: Partial<
        Pick<
          Participant,
          "predChampionId" | "predTopScorer" | "predDarkHorseId"
        >
      >,
    ) => {
      update((prev) => ({
        ...prev,
        participants: prev.participants.map((p) =>
          p.id === participantId ? { ...p, ...preds } : p,
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
          [teamId]: { ...prev.results[teamId], ...patch },
        },
      }));
    },
    [update],
  );

  const setActuals = useCallback(
    (championId: string | null, topScorer: string | null) => {
      update((prev) => ({
        ...prev,
        actualChampionId: championId,
        actualTopScorer: topScorer,
      }));
    },
    [update],
  );

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
      packages: buildPackages(prev.settings.buyIns),
    }));
  }, [update]);

  const loadDemo = useCallback(() => {
    const next = seedDemo();
    commit(next);
    setSession("mod");
  }, [commit, setSession]);

  const reset = useCallback(() => {
    commit(resetState());
    setSession(null);
  }, [commit, setSession]);

  const value: PoolContextValue = {
    state,
    ready,
    sessionId,
    me,
    login,
    loginModerator,
    logout,
    join,
    choosePackage,
    setPredictions,
    addParticipant,
    removeParticipant,
    setTeamResult,
    setActuals,
    updateSettings,
    updateScoring,
    rebuildPackages,
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
