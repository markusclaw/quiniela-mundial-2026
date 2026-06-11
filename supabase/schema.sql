-- ───────────────────────────────────────────────────────────────────────────
--  Quiniela Mundial 2026 — Supabase schema
-- ───────────────────────────────────────────────────────────────────────────
--  The app stores the entire pool as ONE JSON document per pool (simple and
--  perfect for a ~12-person private pool). Run this in the Supabase SQL editor.
--  Then turn on Realtime for the table and set the API keys in .env.local.
-- ───────────────────────────────────────────────────────────────────────────

create table if not exists pool_state (
  id          text primary key,          -- matches NEXT_PUBLIC_POOL_ID ("default")
  data        jsonb not null,            -- the full PoolState document
  updated_at  timestamptz not null default now()
);

-- Push row changes to connected clients (multi-device sync).
-- Wrapped so re-running the script doesn't error if it's already a member.
do $$
begin
  alter publication supabase_realtime add table pool_state;
exception
  when duplicate_object then null;
end $$;

-- ── Access control ──────────────────────────────────────────────────────────
-- This is a PRIVATE pool guarded by the app's own name+PIN screen, and the
-- anon key is public by design. The simplest setup lets the anon role read and
-- write this single table. Fine for friends & family. If you want it locked
-- down harder later, switch to Supabase Auth and gate writes to the moderator.
alter table pool_state enable row level security;

-- Drop-then-create so the script is safe to run more than once.
drop policy if exists "anon read pool" on pool_state;
create policy "anon read pool" on pool_state
  for select using (true);

drop policy if exists "anon upsert pool" on pool_state;
create policy "anon upsert pool" on pool_state
  for insert with check (true);

drop policy if exists "anon update pool" on pool_state;
create policy "anon update pool" on pool_state
  for update using (true) with check (true);
