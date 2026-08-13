-- Iroko Supabase schema: tables, triggers, and RLS.
-- Run this in the Supabase SQL editor (or via the REST/management API).

-- ============================================================
-- 1. USERS / PROFILES TABLE
-- ============================================================
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text not null default '',
  avatar_url text not null default '',
  plan text not null default 'free' check (plan in ('free','pro','enterprise')),
  confidence_threshold_hide_weak boolean not null default false,
  auto_save_history boolean not null default true,
  model_strictness text not null default 'exact' check (model_strictness in ('exact','strict','relaxed')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 2. EXTRACTION RECORDS TABLE
-- ============================================================
create table if not exists public.extraction_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  title text not null default 'Untitled Extraction',
  raw_input text not null default '',
  extracted_at timestamptz not null default now(),
  character_count integer not null default 0,
  volume integer not null default 0,
  status text not null default 'completed' check (status in ('completed','processing','failed')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- 3. EXTRACTED CHUNKS TABLE
-- ============================================================
create table if not exists public.extracted_chunks (
  id uuid primary key default gen_random_uuid(),
  record_id uuid not null references public.extraction_records(id) on delete cascade,
  category text not null default '',
  verbatim_text text not null default '',
  score integer not null default 85,
  level text not null default 'strong' check (level in ('strong','partial','weak')),
  note text not null default '',
  source_range_start integer,
  source_range_end integer
);

create index if not exists idx_extracted_chunks_record on public.extracted_chunks(record_id);
create index if not exists idx_extraction_records_user on public.extraction_records(user_id);

-- ============================================================
-- 4. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profile email/name in sync on OAuth user metadata updates
create or replace function public.sync_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.users
  set
    email = coalesce(new.email, public.users.email),
    name = case
      when new.raw_user_meta_data->>'name' is not null then new.raw_user_meta_data->>'name'
      when new.raw_user_meta_data->>'full_name' is not null then new.raw_user_meta_data->>'full_name'
      else public.users.name
    end,
    avatar_url = case
      when new.raw_user_meta_data->>'avatar_url' is not null then new.raw_user_meta_data->>'avatar_url'
      else public.users.avatar_url
    end
  where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute function public.sync_user_profile();

-- ============================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================
alter table public.users enable row level security;
alter table public.extraction_records enable row level security;
alter table public.extracted_chunks enable row level security;

-- users: a user can read/update only their own profile row.
drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);

drop policy if exists "users_update_own" on public.users;
create policy "users_update_own" on public.users
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- extraction_records: owner only.
drop policy if exists "records_select_own" on public.extraction_records;
create policy "records_select_own" on public.extraction_records
  for select using (auth.uid() = user_id);

drop policy if exists "records_insert_own" on public.extraction_records;
create policy "records_insert_own" on public.extraction_records
  for insert with check (auth.uid() = user_id);

drop policy if exists "records_update_own" on public.extraction_records;
create policy "records_update_own" on public.extraction_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "records_delete_own" on public.extraction_records;
create policy "records_delete_own" on public.extraction_records
  for delete using (auth.uid() = user_id);

-- extracted_chunks: access through the owning record's user_id.
drop policy if exists "chunks_select_own" on public.extracted_chunks;
create policy "chunks_select_own" on public.extracted_chunks
  for select using (
    exists (
      select 1 from public.extraction_records r
      where r.id = extracted_chunks.record_id
        and r.user_id = auth.uid()
    )
  );

drop policy if exists "chunks_insert_own" on public.extracted_chunks;
create policy "chunks_insert_own" on public.extracted_chunks
  for insert with check (
    exists (
      select 1 from public.extraction_records r
      where r.id = extracted_chunks.record_id
        and r.user_id = auth.uid()
    )
  );

drop policy if exists "chunks_update_own" on public.extracted_chunks;
create policy "chunks_update_own" on public.extracted_chunks
  for update using (
    exists (
      select 1 from public.extraction_records r
      where r.id = extracted_chunks.record_id
        and r.user_id = auth.uid()
    )
  );

drop policy if exists "chunks_delete_own" on public.extracted_chunks;
create policy "chunks_delete_own" on public.extracted_chunks
  for delete using (
    exists (
      select 1 from public.extraction_records r
      where r.id = extracted_chunks.record_id
        and r.user_id = auth.uid()
    )
  );
