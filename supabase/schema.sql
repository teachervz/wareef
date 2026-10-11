-- ==========================================================================
-- schema.sql — the table used by js/cloud-sync.js
-- Run once in Supabase → SQL Editor → New query → paste → Run.
-- One row per data part: settings, progress, class_<id> (one per class).
-- Row-level security: a signed-in user sees and changes only her own rows;
-- without signing in (the public key alone) nothing can be read or written.
-- ==========================================================================

create table if not exists public.teacher_data (
  owner      uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  part       text        not null check (part ~ '^[a-z0-9_]+$'),
  data       jsonb       not null,
  rev        integer     not null default 1,
  updated_at timestamptz not null default now(),
  primary key (owner, part)
);

alter table public.teacher_data enable row level security;

drop policy if exists "own rows only" on public.teacher_data;
create policy "own rows only" on public.teacher_data
  for all to authenticated
  using (owner = (select auth.uid()))
  with check (owner = (select auth.uid()));

revoke all on public.teacher_data from anon;
grant select, insert, update, delete on public.teacher_data to authenticated;

create or replace function public.teacher_data_touch() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists teacher_data_touch on public.teacher_data;
create trigger teacher_data_touch before update on public.teacher_data
  for each row execute function public.teacher_data_touch();
