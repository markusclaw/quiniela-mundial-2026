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

let saveTimer: ReturnType<typeof setTimeout> | null = null;
export function saveRemote(state: PoolState) {
  const sb = db();
  if (!sb) return;
  // debounce rapid edits into one write
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    sb.from(TABLE)
      .upsert({ id: POOL_ID, data: state, updated_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error) console.warn("[supabase] save failed:", error.message);
      });
  }, 400);
}

/** Subscribe to remote changes from other devices. Returns an unsubscribe fn. */
export function subscribeRemote(cb: (state: PoolState) => void): () => void {
  const sb = db();
  if (!sb) return () => {};
  const channel = sb
    .channel(`pool:${POOL_ID}`)
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
