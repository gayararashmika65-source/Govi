-- ============================================================================
-- Migration 00002: Role-specific profiles + Expert verification
-- ============================================================================
-- One profile table per role. 1:1 with public.profiles via user_id.
-- Keeps role-specific data separate from common profile data (normalization).
-- ============================================================================

begin;

-- ---------------------------------------------------------------------------
-- FARMER PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.farmer_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles(id) on delete cascade,
  district        text,
  location        text,
  farm_size_acres numeric(10,2) check (farm_size_acres >= 0),
  crops           text,                       -- comma separated crop names
  bio             text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists farmer_profiles_district_idx on public.farmer_profiles(district);
create index if not exists farmer_profiles_user_id_idx   on public.farmer_profiles(user_id);

create trigger farmer_profiles_set_updated_at
  before update on public.farmer_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- EXPERT PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.expert_profiles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null unique references public.profiles(id) on delete cascade,
  title           text,                        -- e.g. "Agricultural Officer"
  qualifications  text,
  expertise       text,                        -- comma separated
  crops           text,                        -- comma separated crops advised on
  languages       text,                        -- comma separated
  service_areas   text,                        -- comma separated districts
  bio             text,
  hourly_rate     numeric(10,2) check (hourly_rate >= 0),
  verified        boolean not null default false,
  available       boolean not null default true,
  rating          numeric(2,1) check (rating >= 0 and rating <= 5),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists expert_profiles_verified_idx  on public.expert_profiles(verified);
create index if not exists expert_profiles_available_idx on public.expert_profiles(available);
create index if not exists expert_profiles_user_id_idx    on public.expert_profiles(user_id);
-- GIN indexes for searching expertise/crops (using full-text on comma-separated text)
create index if not exists expert_profiles_expertise_idx on public.expert_profiles using gin (to_tsvector('english', coalesce(expertise,'')));
create index if not exists expert_profiles_crops_idx     on public.expert_profiles using gin (to_tsvector('english', coalesce(crops,'')));

create trigger expert_profiles_set_updated_at
  before update on public.expert_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- EXPERT VERIFICATIONS — documents submitted for admin review
-- ---------------------------------------------------------------------------
create table if not exists public.expert_verifications (
  id                uuid primary key default gen_random_uuid(),
  expert_profile_id uuid not null references public.expert_profiles(id) on delete cascade,
  document_path     text not null,           -- path in the verifications storage bucket
  note              text,
  status            verification_status not null default 'PENDING',
  reviewed_by       uuid references public.profiles(id) on delete set null,
  reviewed_at       timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists expert_verifications_status_idx    on public.expert_verifications(status);
create index if not exists expert_verifications_expert_idx     on public.expert_verifications(expert_profile_id);

create trigger expert_verifications_set_updated_at
  before update on public.expert_verifications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ENTERPRISE PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.enterprise_profiles (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references public.profiles(id) on delete cascade,
  business_name    text not null,
  business_type    text,
  registration_no  text,
  district         text,
  address          text,
  verified         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists enterprise_profiles_verified_idx on public.enterprise_profiles(verified);
create index if not exists enterprise_profiles_user_id_idx  on public.enterprise_profiles(user_id);

create trigger enterprise_profiles_set_updated_at
  before update on public.enterprise_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- WORKER PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.worker_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  skills      text,
  experience  text,
  district    text,
  available   boolean not null default true,
  bio         text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists worker_profiles_district_idx on public.worker_profiles(district);
create index if not exists worker_profiles_user_id_idx   on public.worker_profiles(user_id);

create trigger worker_profiles_set_updated_at
  before update on public.worker_profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- BUYER PROFILES
-- ---------------------------------------------------------------------------
create table if not exists public.buyer_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references public.profiles(id) on delete cascade,
  buyer_type  text,                          -- wholesaler, supermarket, exporter, ...
  company     text,
  district    text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists buyer_profiles_user_id_idx on public.buyer_profiles(user_id);

create trigger buyer_profiles_set_updated_at
  before update on public.buyer_profiles
  for each row execute function public.set_updated_at();

commit;
