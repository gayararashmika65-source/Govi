-- ============================================================================
-- Migration 00001: Profiles, Roles, and Foundations
-- GoviSahana (GoviConnect) — Supabase backend
-- ============================================================================
-- Creates: enums, profiles table, user_roles table, updated_at trigger fn.
-- Depends on: Supabase Auth (auth.users) — created automatically by Supabase.
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- ENUMS (PostgreSQL native enums — stronger than TEXT for data integrity)
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_role as enum ('FARMER', 'EXPERT', 'ENTERPRISE', 'WORKER', 'BUYER', 'ADMIN');
exception when duplicate_object then null; end $$;

do $$ begin
  create type account_status as enum ('ACTIVE', 'SUSPENDED', 'PENDING');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_status as enum ('OPEN', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type case_category as enum ('PEST', 'DISEASE', 'NUTRIENT', 'WATER', 'WEATHER', 'SOIL', 'OTHER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type consultation_status as enum ('REQUESTED', 'ACCEPTED', 'DECLINED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type consultation_type as enum ('CHAT', 'VIDEO', 'IN_PERSON');
exception when duplicate_object then null; end $$;

do $$ begin
  create type verification_status as enum ('PENDING', 'APPROVED', 'REJECTED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type enquiry_type as enum ('PRODUCT', 'CROP', 'SERVICE', 'BUYER_REQ');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_type as enum ('CASE', 'CONSULTATION', 'MESSAGE', 'VERIFICATION', 'ENQUIRY', 'JOB', 'SYSTEM');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger function (reused by every table)
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- PROFILES — one row per authenticated user (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  name        text not null check (char_length(name) >= 2),
  phone       text,
  role        user_role not null default 'FARMER',
  status      account_status not null default 'ACTIVE',
  avatar_url  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists profiles_role_idx        on public.profiles(role);
create index if not exists profiles_status_idx       on public.profiles(status);
create index if not exists profiles_email_idx        on public.profiles(email);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- USER_ROLES — audit trail of role assignments (immutable history)
-- Allows an admin to see who changed a user's role and when.
-- The CURRENT role lives on public.profiles.role; this table is the history.
-- ---------------------------------------------------------------------------
create table if not exists public.user_roles (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  role         user_role not null,
  assigned_by  uuid references public.profiles(id) on delete set null,
  note         text,
  created_at   timestamptz not null default now()
);

create index if not exists user_roles_user_id_idx on public.user_roles(user_id);

comment on table public.profiles    is 'Extension of auth.users — stores the user role + display info.';
comment on table public.user_roles is 'Immutable audit log of role assignments. The live role is on profiles.role.';

-- ---------------------------------------------------------------------------
-- is_admin() helper — used by RLS policies to check the current user's role.
-- Returns true if the authenticated current user has the ADMIN role.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN' and status = 'ACTIVE'
  );
$$;

-- is_role(r) — true if the current user has role r
create or replace function public.is_role(r user_role)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = r and status = 'ACTIVE'
  );
$$;

commit;
