-- ───────────────────────────────────────────────────────────────────────────
--  Quiniela Mundial 2026 — Supabase schema (drop-in for multi-device play)
-- ───────────────────────────────────────────────────────────────────────────
--  The app currently runs fully on localStorage (see src/lib/store.ts). To go
--  online, create a Supabase project, run this schema, and swap the bodies of
--  loadState() / saveState() (and the action helpers) for Supabase queries.
--  Team/group/fixture data stays in code (src/lib/data) — it never changes.

create table if not exists pools (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  currency      text not null default 'MXN',
  join_code     text not null,
  buy_in_premium int not null default 600,
  buy_in_mid     int not null default 400,
  buy_in_value   int not null default 250,
  scoring        jsonb not null,           -- ScoringConfig
  actual_champion_id text,
  actual_top_scorer  text,
  created_at    timestamptz not null default now()
);

create table if not exists packages (
  id          text not null,               -- e.g. 'PKG-01'
  pool_id     uuid not null references pools(id) on delete cascade,
  label       text not null,
  tier        text not null check (tier in ('premium','mid','value')),
  buy_in      int  not null,
  team_ids    text[] not null,             -- 4 team ids
  primary key (pool_id, id)
);

create table if not exists participants (
  id             uuid primary key default gen_random_uuid(),
  pool_id        uuid not null references pools(id) on delete cascade,
  name           text not null,
  pin            text not null,            -- 4-digit; hash in production
  package_id     text,
  is_moderator   boolean not null default false,
  pred_champion_id  text,
  pred_top_scorer   text,
  pred_dark_horse_id text,
  joined_at      timestamptz not null default now(),
  unique (pool_id, name)
);

-- One row per team per pool, updated by the moderator.
create table if not exists team_results (
  pool_id       uuid not null references pools(id) on delete cascade,
  team_id       text not null,             -- e.g. 'ARG'
  group_wins    int not null default 0,
  group_draws   int not null default 0,
  group_losses  int not null default 0,
  stage_reached text not null default 'group',
  primary key (pool_id, team_id)
);

-- Suggested RLS sketch (enable + refine before going public):
--   alter table participants enable row level security;
--   create policy "read pool" on participants for select using (true);
--   Writes to team_results / pools restricted to the moderator participant.
