import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { PoolState } from "@/lib/types";

/**
 * ───────────────────────────────────────────────────────────────────────────
 *  SUPABASE — optional multi-device backend
 * ───────────────────────────────────────────────────────────────────────────
 *  The whole pool lives as a single JSON document in the `pool_state` table
 *  (one row, id = POOL_ID). On change we upsert the document; Realtime pushes
 *  it to every other device. This is a deliberately simple model that fits a
 *  ~12-person pool with zero backend code. See supabase/schema.sql.
 *
 *  If the env vars below are not set, the app silently runs on localStorage
 *  exactly as before — nothing breaks.
 */

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Each pool is one document. Change this to run several independent pools.
export const POOL_ID = process.env.NEXT_PUBLIC_POOL_ID || "default";
const TABLE = "pool_state";

export const isSupabaseEnabled = Boolean(URL && ANON);

let client: SupabaseClient | null = null;
function db(): SupabaseClient | null {
  if (!isSupabaseEnabled) return null;
  if (!client) client = createClient(URL as string, ANON as string);
  return client;
}

export async function loadRemote(): Promise<PoolState | null> {
  const sb = db();
  if (!sb) return null;
  const { data, error } = await sb
    .from(TABLE)
    .select("data")
    .eq("id", POOL_ID)
    .maybeSingle();
  if (error) {
    console.warn("[supabase] load failed:", error.message);
    return null;
  }
  return (data?.data as PoolState) ?? null;
}

// ── Conflict-safe writes ─────────────────────────────────────────────────────
// Every change is expressed as a pure mutation `(prev) => next` and applied to
// the FRESHEST document on the server, never to a possibly-stale in-memory blob.
// We then write with an optimistic-concurrency guard (only if the row hasn't
// changed since we read it) and retry on conflict. This prevents a stale tab —
// or the periodic auto-sync — from silently clobbering edits made elsewhere
// (e.g. dropping participants added on another device).

type Mutation = (prev: PoolState) => PoolState;

let queue: Mutation[] = [];
let fallbackState: PoolState | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;
let onSavedCb: ((saved: PoolState) => void) | null = null;

/** Register a callback that fires with the authoritative saved state. */
export function onRemoteSaved(cb: (saved: PoolState) => void) {
  onSavedCb = cb;
}

/**
 * Queue a change. `mutate` is applied server-side to the latest document;
 * `fallback` is the optimistic local result, used only if no row exists yet.
 */
export function saveRemoteMutation(mutate: Mutation, fallback: PoolState) {
  if (!db()) return;
  queue.push(mutate);
  fallbackState = fallback;
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => void flush(), 350);
}

async function flush(): Promise<void> {
  const sb = db();
  if (!sb) return;
  if (flushing) {
    // A flush is already running; re-arm so queued changes aren't lost.
    if (flushTimer) clearTimeout(flushTimer);
    flushTimer = setTimeout(() => void flush(), 150);
    return;
  }
  if (!queue.length) return;
  flushing = true;
  const pending = queue;
  queue = [];
  const fallback = fallbackState;

  try {
    for (let attempt = 0; attempt < 6; attempt++) {
      const { data: row, error: readErr } = await sb
        .from(TABLE)
        .select("data, updated_at")
        .eq("id", POOL_ID)
        .maybeSingle();
      if (readErr) {
        console.warn("[supabase] read-before-write failed:", readErr.message);
        break;
      }

      const base = (row?.data as PoolState | undefined) ?? fallback;
      if (!base) break; // nothing to write yet
      const next = pending.reduce<PoolState>((acc, fn) => fn(acc), base);
      const newTs = new Date().toISOString();

      if (!row) {
        // No row yet → create it. If someone else created it first, retry.
        const { error } = await sb
          .from(TABLE)
          .insert({ id: POOL_ID, data: next, updated_at: newTs });
        if (!error) {
          onSavedCb?.(next);
          return;
        }
        continue;
      }

      // Optimistic-concurrency update: only succeeds if the row hasn't changed
      // since we read it. Empty result = someone wrote in between → re-read.
      const { data: updated, error } = await sb
        .from(TABLE)
        .update({ data: next, updated_at: newTs })
        .eq("id", POOL_ID)
        .eq("updated_at", row.updated_at)
        .select("data");
      if (error) {
        console.warn("[supabase] save failed:", error.message);
        break;
      }
      if (updated && updated.length > 0) {
        onSavedCb?.(next);
        return;
      }
      // Conflict — loop and re-apply onto the newer document.
    }
  } finally {
    flushing = false;
    if (queue.length) {
      if (flushTimer) clearTimeout(flushTimer);
      flushTimer = setTimeout(() => void flush(), 50);
    }
  }
}

/** Subscribe to remote changes from other devices. Returns an unsubscribe fn. */
export function subscribeRemote(cb: (state: PoolState) => void): () => void {
  const sb = db();
  if (!sb) return () => {};
  // Unique channel name per subscription so listeners are always attached to a
  // fresh channel before subscribe() — avoids "add callbacks after subscribe"
  // when React (dev) mounts the provider twice.
  const channel = sb
    .channel(`pool:${POOL_ID}:${Math.random().toString(36).slice(2)}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: TABLE, filter: `id=eq.${POOL_ID}` },
      (payload) => {
        const next = (payload.new as { data?: PoolState })?.data;
        if (next) cb(next);
      },
    )
    .subscribe();
  return () => {
    sb.removeChannel(channel);
  };
}
