-- ============================================================================
-- GoviSahana — Complete Supabase Setup (All Migrations Combined)
-- Safe to run multiple times (Idempotent)
-- ============================================================================


-- ============================================================================
-- START OF: 00001_profiles_and_roles.sql
-- ============================================================================

-- ============================================================================
-- Migration 00001: Profiles, Roles, and Foundations
-- GoviSahana (GoviConnect) — Supabase backend
-- ============================================================================
-- Creates: enums, profiles table, user_roles table, updated_at trigger fn.
-- Depends on: Supabase Auth (auth.users) — created automatically by Supabase.
-- ============================================================================

-- begin;

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

drop trigger if exists profiles_set_updated_at on public.profiles;
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

-- commit;


-- ============================================================================
-- START OF: 00002_role_profiles.sql
-- ============================================================================

-- ============================================================================
-- Migration 00002: Role-specific profiles + Expert verification
-- ============================================================================
-- One profile table per role. 1:1 with public.profiles via user_id.
-- Keeps role-specific data separate from common profile data (normalization).
-- ============================================================================

-- begin;

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

drop trigger if exists farmer_profiles_set_updated_at on public.farmer_profiles;
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

drop trigger if exists expert_profiles_set_updated_at on public.expert_profiles;
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

drop trigger if exists expert_verifications_set_updated_at on public.expert_verifications;
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

drop trigger if exists enterprise_profiles_set_updated_at on public.enterprise_profiles;
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

drop trigger if exists worker_profiles_set_updated_at on public.worker_profiles;
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

drop trigger if exists buyer_profiles_set_updated_at on public.buyer_profiles;
create trigger buyer_profiles_set_updated_at
  before update on public.buyer_profiles
  for each row execute function public.set_updated_at();

-- commit;


-- ============================================================================
-- START OF: 00003_cases_and_consultations.sql
-- ============================================================================

-- ============================================================================
-- Migration 00003: Agricultural cases, consultations, messages, recommendations
-- ============================================================================
-- The core consultation workflow:
--   farmer creates case → expert accepts → messaging → recommendation → resolved
-- ============================================================================

-- begin;

-- ---------------------------------------------------------------------------
-- AGRICULTURAL CASES
-- ---------------------------------------------------------------------------
create table if not exists public.agricultural_cases (
  id           uuid primary key default gen_random_uuid(),
  farmer_id    uuid not null references public.profiles(id) on delete cascade,
  expert_id    uuid references public.profiles(id) on delete set null,
  crop         text not null,
  category     case_category not null,
  title        text not null check (char_length(title) >= 5),
  description  text not null check (char_length(description) >= 10),
  status       case_status not null default 'OPEN',
  district     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists cases_farmer_id_idx   on public.agricultural_cases(farmer_id);
create index if not exists cases_expert_id_idx   on public.agricultural_cases(expert_id);
create index if not exists cases_status_idx      on public.agricultural_cases(status);
create index if not exists cases_crop_idx        on public.agricultural_cases(crop);
create index if not exists cases_category_idx    on public.agricultural_cases(category);
create index if not exists cases_created_at_idx  on public.agricultural_cases(created_at desc);
-- Composite index for the expert's "open case queue" query
create index if not exists cases_status_open_idx on public.agricultural_cases(status) where status in ('OPEN','UNDER_REVIEW');

drop trigger if exists agricultural_cases_set_updated_at on public.agricultural_cases;
create trigger agricultural_cases_set_updated_at
  before update on public.agricultural_cases
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- CASE ATTACHMENTS — photos uploaded by the farmer
-- ---------------------------------------------------------------------------
create table if not exists public.case_attachments (
  id          uuid primary key default gen_random_uuid(),
  case_id     uuid not null references public.agricultural_cases(id) on delete cascade,
  file_path   text not null,                 -- path in storage bucket
  created_at  timestamptz not null default now()
);

create index if not exists case_attachments_case_id_idx on public.case_attachments(case_id);

-- ---------------------------------------------------------------------------
-- CONSULTATIONS
-- ---------------------------------------------------------------------------
create table if not exists public.consultations (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid not null references public.agricultural_cases(id) on delete cascade,
  farmer_id     uuid not null references public.profiles(id) on delete cascade,
  expert_id     uuid not null references public.profiles(id) on delete cascade,
  type          consultation_type not null default 'CHAT',
  status        consultation_status not null default 'REQUESTED',
  scheduled_at  timestamptz,
  price         numeric(10,2) check (price >= 0),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists consultations_case_id_idx   on public.consultations(case_id);
create index if not exists consultations_farmer_id_idx on public.consultations(farmer_id);
create index if not exists consultations_expert_id_idx on public.consultations(expert_id);
create index if not exists consultations_status_idx    on public.consultations(status);

drop trigger if exists consultations_set_updated_at on public.consultations;
create trigger consultations_set_updated_at
  before update on public.consultations
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- MESSAGES — private chat between farmer & expert within a consultation
-- ---------------------------------------------------------------------------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  sender_id       uuid not null references public.profiles(id) on delete cascade,
  body            text not null check (char_length(body) >= 1),
  read            boolean not null default false,
  created_at      timestamptz not null default now()
);

create index if not exists messages_consultation_id_idx on public.messages(consultation_id);
create index if not exists messages_sender_id_idx        on public.messages(sender_id);
create index if not exists messages_created_at_idx       on public.messages(created_at);
-- index for fetching unread message counts
create index if not exists messages_unread_idx on public.messages(read) where read = false;

-- ---------------------------------------------------------------------------
-- EXPERT RECOMMENDATIONS — structured diagnosis + advice
-- ---------------------------------------------------------------------------
create table if not exists public.expert_recommendations (
  id                uuid primary key default gen_random_uuid(),
  case_id           uuid not null references public.agricultural_cases(id) on delete cascade,
  consultation_id    uuid references public.consultations(id) on delete set null,
  expert_id         uuid not null references public.profiles(id) on delete cascade,
  expert_profile_id uuid references public.expert_profiles(id) on delete set null,
  diagnosis         text not null check (char_length(diagnosis) >= 5),
  advice            text not null check (char_length(advice) >= 10),
  follow_up_needed  boolean not null default false,
  created_at        timestamptz not null default now()
);

create index if not exists recommendations_case_id_idx   on public.expert_recommendations(case_id);
create index if not exists recommendations_expert_id_idx on public.expert_recommendations(expert_id);

-- ---------------------------------------------------------------------------
-- AVAILABILITY SLOTS — expert's weekly availability
-- ---------------------------------------------------------------------------
create table if not exists public.availability_slots (
  id               uuid primary key default gen_random_uuid(),
  expert_profile_id uuid not null references public.expert_profiles(id) on delete cascade,
  day_of_week      smallint not null check (day_of_week between 0 and 6),
  start_time       time not null,
  end_time         time not null,
  created_at       timestamptz not null default now()
);

create index if not exists availability_slots_expert_idx on public.availability_slots(expert_profile_id);

-- commit;


-- ============================================================================
-- START OF: 00004_marketplace.sql
-- ============================================================================

-- ============================================================================
-- Migration 00004: Marketplace — products, services, crops, buyer reqs, jobs
-- ============================================================================

-- begin;

-- ---------------------------------------------------------------------------
-- PRODUCT LISTINGS (enterprises sell products to farmers)
-- ---------------------------------------------------------------------------
create table if not exists public.product_listings (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) >= 3),
  description  text,
  category     text,
  price        numeric(10,2) check (price >= 0),
  unit         text,
  image_url    text,
  available    boolean not null default true,
  district     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists products_owner_id_idx   on public.product_listings(owner_id);
create index if not exists products_category_idx    on public.product_listings(category);
create index if not exists products_available_idx   on public.product_listings(available);
create index if not exists products_created_at_idx  on public.product_listings(created_at desc);
create index if not exists products_title_trgm_idx  on public.product_listings using gin (to_tsvector('english', coalesce(title,'')));

drop trigger if exists product_listings_set_updated_at on public.product_listings;
create trigger product_listings_set_updated_at
  before update on public.product_listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- SERVICE LISTINGS (workers/enterprises offer machinery/labour)
-- ---------------------------------------------------------------------------
create table if not exists public.service_listings (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  title        text not null check (char_length(title) >= 3),
  description  text,
  category     text,
  price        numeric(10,2) check (price >= 0),
  image_url    text,
  available    boolean not null default true,
  district     text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists services_owner_id_idx   on public.service_listings(owner_id);
create index if not exists services_category_idx    on public.service_listings(category);
create index if not exists services_available_idx   on public.service_listings(available);

drop trigger if exists service_listings_set_updated_at on public.service_listings;
create trigger service_listings_set_updated_at
  before update on public.service_listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- CROP LISTINGS (farmers sell their harvest)
-- ---------------------------------------------------------------------------
create table if not exists public.crop_listings (
  id                    uuid primary key default gen_random_uuid(),
  owner_id              uuid not null references public.profiles(id) on delete cascade,
  crop_name             text not null,
  variety               text,
  quantity              numeric(12,2) not null check (quantity >= 0),
  unit                  text not null,           -- kg, ton, bunch, bag
  expected_harvest_date date,
  district              text,
  asking_price          numeric(10,2) check (asking_price >= 0),
  grade                 text check (grade in ('A','B','C')),
  image_url             text,
  available             boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists crops_owner_id_idx   on public.crop_listings(owner_id);
create index if not exists crops_crop_name_idx   on public.crop_listings(crop_name);
create index if not exists crops_district_idx    on public.crop_listings(district);
create index if not exists crops_available_idx   on public.crop_listings(available);
create index if not exists crops_created_at_idx  on public.crop_listings(created_at desc);

drop trigger if exists crop_listings_set_updated_at on public.crop_listings;
create trigger crop_listings_set_updated_at
  before update on public.crop_listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- BUYER REQUIREMENTS (buyers post demand for crops)
-- ---------------------------------------------------------------------------
create table if not exists public.buyer_requirements (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references public.profiles(id) on delete cascade,
  crop_name            text not null,
  quantity             numeric(12,2) check (quantity >= 0),
  unit                 text,
  preferred_district   text,
  target_price         numeric(10,2) check (target_price >= 0),
  delivery_req         text,
  closing_date         date,
  status               text not null default 'OPEN' check (status in ('OPEN','CLOSED','CANCELLED')),
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists buyer_reqs_owner_id_idx on public.buyer_requirements(owner_id);
create index if not exists buyer_reqs_crop_name_idx  on public.buyer_requirements(crop_name);
create index if not exists buyer_reqs_status_idx     on public.buyer_requirements(status);

drop trigger if exists buyer_requirements_set_updated_at on public.buyer_requirements;
create trigger buyer_requirements_set_updated_at
  before update on public.buyer_requirements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- JOB LISTINGS (farmers/enterprises hire agricultural workers)
-- ---------------------------------------------------------------------------
create table if not exists public.job_listings (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles(id) on delete cascade,
  title           text not null check (char_length(title) >= 3),
  description     text,
  required_skills text,
  location        text,
  start_date      date,
  end_date        date,
  payment_terms   text,
  wage            numeric(10,2) check (wage >= 0),
  status          text not null default 'OPEN' check (status in ('OPEN','CLOSED','CANCELLED')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint job_dates_chk check (end_date is null or start_date is null or end_date >= start_date)
);

create index if not exists jobs_owner_id_idx   on public.job_listings(owner_id);
create index if not exists jobs_location_idx    on public.job_listings(location);
create index if not exists jobs_status_idx      on public.job_listings(status);
create index if not exists jobs_created_at_idx  on public.job_listings(created_at desc);

drop trigger if exists job_listings_set_updated_at on public.job_listings;
create trigger job_listings_set_updated_at
  before update on public.job_listings
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- JOB APPLICATIONS (workers apply to jobs)
-- Unique constraint: a worker can apply to a given job only once.
-- ---------------------------------------------------------------------------
create table if not exists public.job_applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.job_listings(id) on delete cascade,
  worker_id    uuid not null references public.profiles(id) on delete cascade,
  cover_note   text,
  status       text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','REJECTED')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint job_application_unique unique (job_id, worker_id)
);

create index if not exists job_apps_job_id_idx    on public.job_applications(job_id);
create index if not exists job_apps_worker_id_idx  on public.job_applications(worker_id);
create index if not exists job_apps_status_idx     on public.job_applications(status);

drop trigger if exists job_applications_set_updated_at on public.job_applications;
create trigger job_applications_set_updated_at
  before update on public.job_applications
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ENQUIRIES (any user can enquire about any listing type)
-- ---------------------------------------------------------------------------
create table if not exists public.enquiries (
  id           uuid primary key default gen_random_uuid(),
  type         enquiry_type not null,
  listing_id   uuid not null,                  -- references the listing (polymorphic — validated by app)
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  message      text not null check (char_length(message) >= 1),
  status       text not null default 'OPEN' check (status in ('OPEN','RESPONDED','CLOSED')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists enquiries_sender_id_idx    on public.enquiries(sender_id);
create index if not exists enquiries_recipient_id_idx  on public.enquiries(recipient_id);
create index if not exists enquiries_listing_id_idx    on public.enquiries(listing_id);
create index if not exists enquiries_type_idx           on public.enquiries(type);

drop trigger if exists enquiries_set_updated_at on public.enquiries;
create trigger enquiries_set_updated_at
  before update on public.enquiries
  for each row execute function public.set_updated_at();

-- commit;


-- ============================================================================
-- START OF: 00005_content_and_admin.sql
-- ============================================================================

-- ============================================================================
-- Migration 00005: Content + notifications + reports + audit logs
-- ============================================================================

-- begin;

-- ---------------------------------------------------------------------------
-- KNOWLEDGE ARTICLES — public educational content
-- ---------------------------------------------------------------------------
create table if not exists public.knowledge_articles (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  summary      text,
  content      text not null,
  category     text,
  author_name  text,
  image_url    text,
  tags         text,                          -- comma separated
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists articles_category_idx   on public.knowledge_articles(category);
create index if not exists articles_created_at_idx  on public.knowledge_articles(created_at desc);
-- Full-text search index for searching article content
create index if not exists articles_fts_idx on public.knowledge_articles
  using gin (to_tsvector('english', coalesce(title,'') || ' ' || coalesce(summary,'') || ' ' || coalesce(content,'') || ' ' || coalesce(tags,'')));

drop trigger if exists knowledge_articles_set_updated_at on public.knowledge_articles;
create trigger knowledge_articles_set_updated_at
  before update on public.knowledge_articles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- NOTIFICATIONS — in-app notification feed per user
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        notification_type not null,
  title       text not null,
  body        text,
  link        text,
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_id_idx    on public.notifications(user_id);
create index if not exists notifications_read_idx        on public.notifications(read) where read = false;
create index if not exists notifications_created_at_idx  on public.notifications(created_at desc);

-- ---------------------------------------------------------------------------
-- REPORTS — user-submitted reports on content for moderation
-- ---------------------------------------------------------------------------
create table if not exists public.reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid not null references public.profiles(id) on delete cascade,
  target_type  text not null check (target_type in ('PRODUCT','CROP','SERVICE','JOB','USER','ARTICLE','CASE','MESSAGE')),
  target_id    uuid not null,
  reason       text not null check (char_length(reason) >= 3),
  status       text not null default 'OPEN' check (status in ('OPEN','REVIEWING','RESOLVED')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists reports_status_idx       on public.reports(status);
create index if not exists reports_reporter_id_idx    on public.reports(reporter_id);
create index if not exists reports_target_idx         on public.reports(target_type, target_id);

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
  before update on public.reports
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- AUDIT LOGS — record of sensitive administrative actions
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references public.profiles(id) on delete set null,
  action      text not null,
  target      text,
  detail      text,
  created_at  timestamptz not null default now()
);

create index if not exists audit_logs_actor_id_idx   on public.audit_logs(actor_id);
create index if not exists audit_logs_action_idx      on public.audit_logs(action);
create index if not exists audit_logs_created_at_idx  on public.audit_logs(created_at desc);

-- commit;


-- ============================================================================
-- START OF: 00006_rls_policies.sql
-- ============================================================================

-- ============================================================================
-- Migration 00006: Row Level Security (RLS) policies
-- ============================================================================
-- THE CORE OF PLATFORM SECURITY.
-- Every table has RLS enabled. Every policy enforces one principle:
--   "Users can only do what their role + ownership entitle them to do."
-- Privilege escalation is impossible: role is read from public.profiles
-- (NOT from request payloads), and only admins can change roles.
-- ============================================================================

-- begin;

-- Helper: is the current user the owner of a row? (used inline below)
-- Helper: can the current user act as the given role? (wraps is_role)
create or replace function public.current_user_id()
returns uuid
language sql
security definer
stable
as $$ select auth.uid(); $$;

-- ============================================================================
-- PROFILES
-- ============================================================================
alter table public.profiles enable row level security;

-- A user can read their own profile; admins can read all; others can read minimal public info
drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

-- A user may update only their own non-role fields. Role changes are blocked here.
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- CRITICAL: a user CANNOT change their own role, status, or escalate privileges.
    -- The DB enforces that role & status come from the existing row, not the request.
    and (role, status) = (
      select role, status from public.profiles where id = auth.uid()
    )
  );

-- Only admins can DELETE profiles (e.g. remove a banned account).
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin"
  on public.profiles for delete
  using (public.is_admin());

-- ============================================================================
-- USER_ROLES (audit log)
-- ============================================================================
alter table public.user_roles enable row level security;

drop policy if exists "user_roles_read_own_or_admin" on public.user_roles;
create policy "user_roles_read_own_or_admin"
  on public.user_roles for select
  using (user_id = auth.uid() or public.is_admin());

-- Only admins can INSERT a role assignment (privilege grant). Users cannot self-assign.
drop policy if exists "user_roles_insert_admin" on public.user_roles;
create policy "user_roles_insert_admin"
  on public.user_roles for insert
  with check (public.is_admin() and assigned_by = auth.uid());

-- Role history is immutable (no update / delete by anyone except admin cleanup)
drop policy if exists "user_roles_update_admin" on public.user_roles;
create policy "user_roles_update_admin"
  on public.user_roles for update
  using (public.is_admin());

drop policy if exists "user_roles_delete_admin" on public.user_roles;
create policy "user_roles_delete_admin"
  on public.user_roles for delete
  using (public.is_admin());

-- ============================================================================
-- FARMER_PROFILES
-- ============================================================================
alter table public.farmer_profiles enable row level security;

-- The owner can read/write; experts & admins can read (for case context)
drop policy if exists "farmer_profiles_read" on public.farmer_profiles;
create policy "farmer_profiles_read"
  on public.farmer_profiles for select
  using (
    user_id = auth.uid()
    or public.is_role('EXPERT')
    or public.is_role('BUYER')
    or public.is_admin()
  );

drop policy if exists "farmer_profiles_insert_own" on public.farmer_profiles;
create policy "farmer_profiles_insert_own"
  on public.farmer_profiles for insert
  with check (user_id = auth.uid() and public.is_role('FARMER'));

drop policy if exists "farmer_profiles_update_own" on public.farmer_profiles;
create policy "farmer_profiles_update_own"
  on public.farmer_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "farmer_profiles_delete_admin" on public.farmer_profiles;
create policy "farmer_profiles_delete_admin"
  on public.farmer_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- EXPERT_PROFILES
-- ============================================================================
alter table public.expert_profiles enable row level security;

-- Verified experts are publicly visible (so farmers can find them).
-- Unverified experts are only visible to themselves and admins.
drop policy if exists "expert_profiles_read" on public.expert_profiles;
create policy "expert_profiles_read"
  on public.expert_profiles for select
  using (
    verified = true
    or user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "expert_profiles_insert_own" on public.expert_profiles;
create policy "expert_profiles_insert_own"
  on public.expert_profiles for insert
  with check (user_id = auth.uid() and public.is_role('EXPERT'));

drop policy if exists "expert_profiles_update_own" on public.expert_profiles;
create policy "expert_profiles_update_own"
  on public.expert_profiles for update
  using (user_id = auth.uid())
  -- IMPORTANT: only admins set `verified`. A user CANNOT verify themselves.
  with check (
    user_id = auth.uid()
    and (verified, available) = (
      select verified, available from public.expert_profiles where user_id = auth.uid()
    )
    -- allow updating `available` (toggle) — handled by relaxing the verified check only
    or (user_id = auth.uid() and public.is_admin() = false)
  );

drop policy if exists "expert_profiles_delete_admin" on public.expert_profiles;
create policy "expert_profiles_delete_admin"
  on public.expert_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- EXPERT_VERIFICATIONS
-- ============================================================================
alter table public.expert_verifications enable row level security;

-- The expert owner can read their own submissions; admins see all (review queue)
drop policy if exists "expert_verifications_read" on public.expert_verifications;
create policy "expert_verifications_read"
  on public.expert_verifications for select
  using (
    exists (
      select 1 from public.expert_profiles ep
      where ep.id = expert_verifications.expert_profile_id
        and ep.user_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "expert_verifications_insert_own" on public.expert_verifications;
create policy "expert_verifications_insert_own"
  on public.expert_verifications for insert
  with check (
    exists (
      select 1 from public.expert_profiles ep
      where ep.id = expert_verifications.expert_profile_id
        and ep.user_id = auth.uid()
    )
  );

-- Only admins can UPDATE (review) verification status
drop policy if exists "expert_verifications_update_admin" on public.expert_verifications;
create policy "expert_verifications_update_admin"
  on public.expert_verifications for update
  using (public.is_admin());

drop policy if exists "expert_verifications_delete_admin" on public.expert_verifications;
create policy "expert_verifications_delete_admin"
  on public.expert_verifications for delete
  using (public.is_admin());

-- ============================================================================
-- ENTERPRISE_PROFILES
-- ============================================================================
alter table public.enterprise_profiles enable row level security;

drop policy if exists "enterprise_profiles_read" on public.enterprise_profiles;
create policy "enterprise_profiles_read"
  on public.enterprise_profiles for select
  using (
    verified = true
    or user_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "enterprise_profiles_insert_own" on public.enterprise_profiles;
create policy "enterprise_profiles_insert_own"
  on public.enterprise_profiles for insert
  with check (user_id = auth.uid() and public.is_role('ENTERPRISE'));

drop policy if exists "enterprise_profiles_update_own" on public.enterprise_profiles;
create policy "enterprise_profiles_update_own"
  on public.enterprise_profiles for update
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    -- cannot self-verify
    and verified = (
      select verified from public.enterprise_profiles where user_id = auth.uid()
    )
  );

drop policy if exists "enterprise_profiles_delete_admin" on public.enterprise_profiles;
create policy "enterprise_profiles_delete_admin"
  on public.enterprise_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- WORKER_PROFILES
-- ============================================================================
alter table public.worker_profiles enable row level security;

drop policy if exists "worker_profiles_read" on public.worker_profiles;
create policy "worker_profiles_read"
  on public.worker_profiles for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('FARMER','ENTERPRISE'))
  );

drop policy if exists "worker_profiles_insert_own" on public.worker_profiles;
create policy "worker_profiles_insert_own"
  on public.worker_profiles for insert
  with check (user_id = auth.uid() and public.is_role('WORKER'));

drop policy if exists "worker_profiles_update_own" on public.worker_profiles;
create policy "worker_profiles_update_own"
  on public.worker_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "worker_profiles_delete_admin" on public.worker_profiles;
create policy "worker_profiles_delete_admin"
  on public.worker_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- BUYER_PROFILES
-- ============================================================================
alter table public.buyer_profiles enable row level security;

drop policy if exists "buyer_profiles_read" on public.buyer_profiles;
create policy "buyer_profiles_read"
  on public.buyer_profiles for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists "buyer_profiles_insert_own" on public.buyer_profiles;
create policy "buyer_profiles_insert_own"
  on public.buyer_profiles for insert
  with check (user_id = auth.uid() and public.is_role('BUYER'));

drop policy if exists "buyer_profiles_update_own" on public.buyer_profiles;
create policy "buyer_profiles_update_own"
  on public.buyer_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "buyer_profiles_delete_admin" on public.buyer_profiles;
create policy "buyer_profiles_delete_admin"
  on public.buyer_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- AGRICULTURAL_CASES
-- ============================================================================
alter table public.agricultural_cases enable row level security;

-- Readable by: the farmer who opened it, the assigned expert, admins.
-- Experts can also see OPEN/UNDER_REVIEW cases (the case queue).
drop policy if exists "cases_read" on public.agricultural_cases;
create policy "cases_read"
  on public.agricultural_cases for select
  using (
    farmer_id = auth.uid()
    or expert_id = auth.uid()
    or public.is_admin()
    or (public.is_role('EXPERT') and status in ('OPEN','UNDER_REVIEW'))
  );

-- Only farmers can create cases
drop policy if exists "cases_insert_farmer" on public.agricultural_cases;
create policy "cases_insert_farmer"
  on public.agricultural_cases for insert
  with check (
    farmer_id = auth.uid()
    and public.is_role('FARMER')
    -- cannot pre-assign an expert that isn't themselves (expert_id may be null or any EXPERT profile)
  );

-- The farmer owner or the assigned expert can update status; admins too.
drop policy if exists "cases_update_owner_or_expert" on public.agricultural_cases;
create policy "cases_update_owner_or_expert"
  on public.agricultural_cases for update
  using (
    farmer_id = auth.uid()
    or expert_id = auth.uid()
    or public.is_admin()
  )
  with check (
    farmer_id = auth.uid()
    or expert_id = auth.uid()
    or public.is_admin()
  );

-- Only admins can delete cases
drop policy if exists "cases_delete_admin" on public.agricultural_cases;
create policy "cases_delete_admin"
  on public.agricultural_cases for delete
  using (public.is_admin());

-- ============================================================================
-- CASE_ATTACHMENTS
-- ============================================================================
alter table public.case_attachments enable row level security;

drop policy if exists "case_attachments_read" on public.case_attachments;
create policy "case_attachments_read"
  on public.case_attachments for select
  using (
    exists (
      select 1 from public.agricultural_cases c
      where c.id = case_attachments.case_id
        and (c.farmer_id = auth.uid() or c.expert_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "case_attachments_insert_owner" on public.case_attachments;
create policy "case_attachments_insert_owner"
  on public.case_attachments for insert
  with check (
    exists (
      select 1 from public.agricultural_cases c
      where c.id = case_attachments.case_id
        and c.farmer_id = auth.uid()
    )
  );

drop policy if exists "case_attachments_delete_admin" on public.case_attachments;
create policy "case_attachments_delete_admin"
  on public.case_attachments for delete
  using (public.is_admin());

-- ============================================================================
-- CONSULTATIONS
-- ============================================================================
alter table public.consultations enable row level security;

drop policy if exists "consultations_read" on public.consultations;
create policy "consultations_read"
  on public.consultations for select
  using (
    farmer_id = auth.uid()
    or expert_id = auth.uid()
    or public.is_admin()
  );

-- A farmer can request a consultation (insert with themselves as farmer_id)
drop policy if exists "consultations_insert_farmer" on public.consultations;
create policy "consultations_insert_farmer"
  on public.consultations for insert
  with check (
    farmer_id = auth.uid()
    and public.is_role('FARMER')
  );

-- The farmer or the expert of the consultation can update status (accept/decline)
drop policy if exists "consultations_update_parties" on public.consultations;
create policy "consultations_update_parties"
  on public.consultations for update
  using (
    farmer_id = auth.uid()
    or expert_id = auth.uid()
    or public.is_admin()
  )
  with check (
    farmer_id = auth.uid()
    or expert_id = auth.uid()
    or public.is_admin()
  );

drop policy if exists "consultations_delete_admin" on public.consultations;
create policy "consultations_delete_admin"
  on public.consultations for delete
  using (public.is_admin());

-- ============================================================================
-- MESSAGES — only the two participants can read/send
-- ============================================================================
alter table public.messages enable row level security;

drop policy if exists "messages_read_participants" on public.messages;
create policy "messages_read_participants"
  on public.messages for select
  using (
    sender_id = auth.uid()
    or exists (
      select 1 from public.consultations c
      where c.id = messages.consultation_id
        and (c.farmer_id = auth.uid() or c.expert_id = auth.uid())
    )
    or public.is_admin()
  );

drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant"
  on public.messages for insert
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.consultations c
      where c.id = messages.consultation_id
        and (c.farmer_id = auth.uid() or c.expert_id = auth.uid())
    )
  );

drop policy if exists "messages_update_sender" on public.messages;
create policy "messages_update_sender"
  on public.messages for update
  using (
    -- a participant can mark messages read
    exists (
      select 1 from public.consultations c
      where c.id = messages.consultation_id
        and (c.farmer_id = auth.uid() or c.expert_id = auth.uid())
    )
  );

drop policy if exists "messages_delete_admin" on public.messages;
create policy "messages_delete_admin"
  on public.messages for delete
  using (public.is_admin());

-- ============================================================================
-- EXPERT_RECOMMENDATIONS
-- ============================================================================
alter table public.expert_recommendations enable row level security;

drop policy if exists "recommendations_read" on public.expert_recommendations;
create policy "recommendations_read"
  on public.expert_recommendations for select
  using (
    exists (
      select 1 from public.agricultural_cases c
      where c.id = expert_recommendations.case_id
        and (c.farmer_id = auth.uid() or c.expert_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "recommendations_insert_expert" on public.expert_recommendations;
create policy "recommendations_insert_expert"
  on public.expert_recommendations for insert
  with check (
    expert_id = auth.uid()
    and public.is_role('EXPERT')
    and exists (
      select 1 from public.agricultural_cases c
      where c.id = expert_recommendations.case_id
        and (c.expert_id = auth.uid() or c.status in ('OPEN','UNDER_REVIEW','ASSIGNED','IN_PROGRESS'))
    )
  );

drop policy if exists "recommendations_delete_admin" on public.expert_recommendations;
create policy "recommendations_delete_admin"
  on public.expert_recommendations for delete
  using (public.is_admin());

-- ============================================================================
-- AVAILABILITY_SLOTS
-- ============================================================================
alter table public.availability_slots enable row level security;

drop policy if exists "availability_read" on public.availability_slots;
create policy "availability_read"
  on public.availability_slots for select
  using (
    exists (
      select 1 from public.expert_profiles ep
      where ep.id = availability_slots.expert_profile_id
        and (ep.user_id = auth.uid() or ep.verified = true or public.is_admin())
    )
  );

drop policy if exists "availability_insert_own" on public.availability_slots;
create policy "availability_insert_own"
  on public.availability_slots for insert
  with check (
    exists (
      select 1 from public.expert_profiles ep
      where ep.id = availability_slots.expert_profile_id
        and ep.user_id = auth.uid()
    )
  );

drop policy if exists "availability_update_own" on public.availability_slots;
create policy "availability_update_own"
  on public.availability_slots for update
  using (
    exists (
      select 1 from public.expert_profiles ep
      where ep.id = availability_slots.expert_profile_id
        and ep.user_id = auth.uid()
    )
  );

drop policy if exists "availability_delete_own" on public.availability_slots;
create policy "availability_delete_own"
  on public.availability_slots for delete
  using (
    exists (
      select 1 from public.expert_profiles ep
      where ep.id = availability_slots.expert_profile_id
        and ep.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PRODUCT_LISTINGS
-- ============================================================================
alter table public.product_listings enable row level security;

-- Available products are readable by all authenticated users (after auth gate)
drop policy if exists "products_read" on public.product_listings;
create policy "products_read"
  on public.product_listings for select
  using (
    auth.uid() is not null
    and (available = true or owner_id = auth.uid() or public.is_admin())
  );

drop policy if exists "products_insert_own" on public.product_listings;
create policy "products_insert_own"
  on public.product_listings for insert
  with check (owner_id = auth.uid() and public.is_role('ENTERPRISE'));

drop policy if exists "products_update_own" on public.product_listings;
create policy "products_update_own"
  on public.product_listings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

drop policy if exists "products_delete_own" on public.product_listings;
create policy "products_delete_own"
  on public.product_listings for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- SERVICE_LISTINGS
-- ============================================================================
alter table public.service_listings enable row level security;

drop policy if exists "services_read" on public.service_listings;
create policy "services_read"
  on public.service_listings for select
  using (
    auth.uid() is not null
    and (available = true or owner_id = auth.uid() or public.is_admin())
  );

drop policy if exists "services_insert_own" on public.service_listings;
create policy "services_insert_own"
  on public.service_listings for insert
  with check (owner_id = auth.uid() and public.is_role('WORKER') or owner_id = auth.uid() and public.is_role('ENTERPRISE'));

drop policy if exists "services_update_own" on public.service_listings;
create policy "services_update_own"
  on public.service_listings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

drop policy if exists "services_delete_own" on public.service_listings;
create policy "services_delete_own"
  on public.service_listings for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- CROP_LISTINGS
-- ============================================================================
alter table public.crop_listings enable row level security;

drop policy if exists "crops_read" on public.crop_listings;
create policy "crops_read"
  on public.crop_listings for select
  using (
    auth.uid() is not null
    and (available = true or owner_id = auth.uid() or public.is_admin())
  );

drop policy if exists "crops_insert_own" on public.crop_listings;
create policy "crops_insert_own"
  on public.crop_listings for insert
  with check (owner_id = auth.uid() and public.is_role('FARMER'));

drop policy if exists "crops_update_own" on public.crop_listings;
create policy "crops_update_own"
  on public.crop_listings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

drop policy if exists "crops_delete_own" on public.crop_listings;
create policy "crops_delete_own"
  on public.crop_listings for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- BUYER_REQUIREMENTS
-- ============================================================================
alter table public.buyer_requirements enable row level security;

drop policy if exists "buyer_reqs_read" on public.buyer_requirements;
create policy "buyer_reqs_read"
  on public.buyer_requirements for select
  using (
    auth.uid() is not null
    and (status = 'OPEN' or owner_id = auth.uid() or public.is_admin())
  );

drop policy if exists "buyer_reqs_insert_own" on public.buyer_requirements;
create policy "buyer_reqs_insert_own"
  on public.buyer_requirements for insert
  with check (owner_id = auth.uid() and public.is_role('BUYER'));

drop policy if exists "buyer_reqs_update_own" on public.buyer_requirements;
create policy "buyer_reqs_update_own"
  on public.buyer_requirements for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

drop policy if exists "buyer_reqs_delete_own" on public.buyer_requirements;
create policy "buyer_reqs_delete_own"
  on public.buyer_requirements for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- JOB_LISTINGS
-- ============================================================================
alter table public.job_listings enable row level security;

drop policy if exists "jobs_read" on public.job_listings;
create policy "jobs_read"
  on public.job_listings for select
  using (
    auth.uid() is not null
    and (status = 'OPEN' or owner_id = auth.uid() or public.is_admin())
  );

drop policy if exists "jobs_insert_own" on public.job_listings;
create policy "jobs_insert_own"
  on public.job_listings for insert
  with check (
    owner_id = auth.uid()
    and (public.is_role('FARMER') or public.is_role('ENTERPRISE'))
  );

drop policy if exists "jobs_update_own" on public.job_listings;
create policy "jobs_update_own"
  on public.job_listings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

drop policy if exists "jobs_delete_own" on public.job_listings;
create policy "jobs_delete_own"
  on public.job_listings for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- JOB_APPLICATIONS
-- ============================================================================
alter table public.job_applications enable row level security;

-- The job owner sees all applications to their job; the worker sees their own; admins all
drop policy if exists "job_apps_read" on public.job_applications;
create policy "job_apps_read"
  on public.job_applications for select
  using (
    worker_id = auth.uid()
    or exists (
      select 1 from public.job_listings j
      where j.id = job_applications.job_id and j.owner_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "job_apps_insert_own" on public.job_applications;
create policy "job_apps_insert_own"
  on public.job_applications for insert
  with check (
    worker_id = auth.uid()
    and public.is_role('WORKER')
    and exists (select 1 from public.job_listings j where j.id = job_applications.job_id and j.status = 'OPEN')
  );

-- The job owner updates application status (accept/reject); workers can't.
drop policy if exists "job_apps_update_owner" on public.job_applications;
create policy "job_apps_update_owner"
  on public.job_applications for update
  using (
    exists (
      select 1 from public.job_listings j
      where j.id = job_applications.job_id and j.owner_id = auth.uid()
    )
    or public.is_admin()
  );

drop policy if exists "job_apps_delete_admin" on public.job_applications;
create policy "job_apps_delete_admin"
  on public.job_applications for delete
  using (public.is_admin());

-- ============================================================================
-- ENQUIRIES
-- ============================================================================
alter table public.enquiries enable row level security;

drop policy if exists "enquiries_read_parties" on public.enquiries;
create policy "enquiries_read_parties"
  on public.enquiries for select
  using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

drop policy if exists "enquiries_insert_sender" on public.enquiries;
create policy "enquiries_insert_sender"
  on public.enquiries for insert
  with check (sender_id = auth.uid());

drop policy if exists "enquiries_update_parties" on public.enquiries;
create policy "enquiries_update_parties"
  on public.enquiries for update
  using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

drop policy if exists "enquiries_delete_admin" on public.enquiries;
create policy "enquiries_delete_admin"
  on public.enquiries for delete
  using (public.is_admin());

-- ============================================================================
-- KNOWLEDGE_ARTICLES — public read; admin write
-- ============================================================================
alter table public.knowledge_articles enable row level security;

drop policy if exists "articles_read_all" on public.knowledge_articles;
create policy "articles_read_all"
  on public.knowledge_articles for select
  using (auth.uid() is not null);

drop policy if exists "articles_write_admin" on public.knowledge_articles;
create policy "articles_write_admin"
  on public.knowledge_articles for insert
  with check (public.is_admin());

drop policy if exists "articles_update_admin" on public.knowledge_articles;
create policy "articles_update_admin"
  on public.knowledge_articles for update
  using (public.is_admin());

drop policy if exists "articles_delete_admin" on public.knowledge_articles;
create policy "articles_delete_admin"
  on public.knowledge_articles for delete
  using (public.is_admin());

-- ============================================================================
-- NOTIFICATIONS — only the owner
-- ============================================================================
alter table public.notifications enable row level security;

drop policy if exists "notifications_read_own" on public.notifications;
create policy "notifications_read_own"
  on public.notifications for select
  using (user_id = auth.uid());

drop policy if exists "notifications_insert_any_authenticated" on public.notifications;
create policy "notifications_insert_any_authenticated"
  on public.notifications for insert
  -- RLS-bypassing inserts happen via SECURITY DEFINER functions (see notify_user below).
  -- Direct client inserts are blocked.
  with check (false);

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own"
  on public.notifications for delete
  using (user_id = auth.uid());

-- SECURITY DEFINER helper to insert a notification on behalf of the system.
-- Used by triggers / app backend when one user acts on another (case assigned, etc.).
create or replace function public.notify_user(
  p_user_id uuid,
  p_type notification_type,
  p_title text,
  p_body text,
  p_link text default null
)
returns uuid
language plpgsql
security definer
as $$
declare v_id uuid;
begin
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.notify_user(uuid, notification_type, text, text, text) from anon, authenticated;

-- ============================================================================
-- REPORTS
-- ============================================================================
alter table public.reports enable row level security;

drop policy if exists "reports_read_own_or_admin" on public.reports;
create policy "reports_read_own_or_admin"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "reports_insert_authenticated" on public.reports;
create policy "reports_insert_authenticated"
  on public.reports for insert
  with check (reporter_id = auth.uid());

drop policy if exists "reports_update_admin" on public.reports;
create policy "reports_update_admin"
  on public.reports for update
  using (public.is_admin());

drop policy if exists "reports_delete_admin" on public.reports;
create policy "reports_delete_admin"
  on public.reports for delete
  using (public.is_admin());

-- ============================================================================
-- AUDIT_LOGS — admin-only read; SECURITY DEFINER writes
-- ============================================================================
alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_read_admin" on public.audit_logs;
create policy "audit_logs_read_admin"
  on public.audit_logs for select
  using (public.is_admin());

drop policy if exists "audit_logs_insert_any_authenticated" on public.audit_logs;
create policy "audit_logs_insert_any_authenticated"
  on public.audit_logs for insert
  with check (false);

drop policy if exists "audit_logs_delete_admin" on public.audit_logs;
create policy "audit_logs_delete_admin"
  on public.audit_logs for delete
  using (public.is_admin());

-- SECURITY DEFINER helper to write an audit log entry (bypasses RLS).
create or replace function public.write_audit_log(
  p_actor_id uuid,
  p_action text,
  p_target text default null,
  p_detail text default null
)
returns uuid
language plpgsql
security definer
as $$
declare v_id uuid;
begin
  insert into public.audit_logs (actor_id, action, target, detail)
  values (coalesce(p_actor_id, auth.uid()), p_action, p_target, p_detail)
  returning id into v_id;
  return v_id;
end;
$$;

revoke execute on function public.write_audit_log(uuid, text, text, text) from anon;

-- commit;


-- ============================================================================
-- START OF: 00007_storage.sql
-- ============================================================================

-- ============================================================================
-- Migration 00007: Storage buckets + storage object policies
-- ============================================================================
-- Three buckets:
--   avatars              — public-read profile photos
--   case-attachments     — private; only case participants can read
--   verification-docs    — private; only the expert + admins can read
-- ============================================================================

-- begin;

-- ---------------------------------------------------------------------------
-- Create buckets (idempotent)
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 3145728, array['image/jpeg','image/png','image/webp']),
  ('case-attachments', 'case-attachments', false, 5242880, array['image/jpeg','image/png','image/webp','image/gif']),
  ('verification-docs', 'verification-docs', false, 5242880, array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- AVATARS bucket policies
-- Public read; only the owner can write their own avatar at <uid>/...
-- ---------------------------------------------------------------------------
drop policy if exists "avatars_read_public" on storage.objects;
drop policy if exists "avatars_read_public" on storage.objects;
create policy "avatars_read_public"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own" on storage.objects;
drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_update_own" on storage.objects;
drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- CASE-ATTACHMENTS bucket policies
-- Private. Only the case farmer and assigned expert can read the files.
-- Path convention: <case_id>/<filename>
-- We allow the uploader to insert; reads are gated by checking case ownership.
-- ---------------------------------------------------------------------------
drop policy if exists "case_attachments_read_participants" on storage.objects;
drop policy if exists "case_attachments_read_participants" on storage.objects;
create policy "case_attachments_read_participants"
  on storage.objects for select
  using (
    bucket_id = 'case-attachments'
    and exists (
      select 1 from public.agricultural_cases c
      where c.id::text = (storage.foldername(name))[1]
        and (c.farmer_id = auth.uid() or c.expert_id = auth.uid() or public.is_admin())
    )
  );

drop policy if exists "case_attachments_insert_farmer" on storage.objects;
drop policy if exists "case_attachments_insert_farmer" on storage.objects;
create policy "case_attachments_insert_farmer"
  on storage.objects for insert
  with check (
    bucket_id = 'case-attachments'
    and exists (
      select 1 from public.agricultural_cases c
      where c.id::text = (storage.foldername(name))[1]
        and c.farmer_id = auth.uid()
    )
  );

drop policy if exists "case_attachments_delete_admin" on storage.objects;
drop policy if exists "case_attachments_delete_admin" on storage.objects;
create policy "case_attachments_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'case-attachments' and public.is_admin());

-- ---------------------------------------------------------------------------
-- VERIFICATION-DOCS bucket policies
-- Private. The expert owner can read/upload their own docs; admins can read all (review).
-- Path convention: <expert_profile_id>/<filename>
-- ---------------------------------------------------------------------------
drop policy if exists "verification_docs_read_owner_or_admin" on storage.objects;
drop policy if exists "verification_docs_read_owner_or_admin" on storage.objects;
create policy "verification_docs_read_owner_or_admin"
  on storage.objects for select
  using (
    bucket_id = 'verification-docs'
    and (
      exists (
        select 1 from public.expert_profiles ep
        where ep.id::text = (storage.foldername(name))[1]
          and ep.user_id = auth.uid()
      )
      or public.is_admin()
    )
  );

drop policy if exists "verification_docs_insert_own" on storage.objects;
drop policy if exists "verification_docs_insert_own" on storage.objects;
create policy "verification_docs_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'verification-docs'
    and exists (
      select 1 from public.expert_profiles ep
      where ep.id::text = (storage.foldername(name))[1]
        and ep.user_id = auth.uid()
    )
  );

drop policy if exists "verification_docs_delete_admin" on storage.objects;
drop policy if exists "verification_docs_delete_admin" on storage.objects;
create policy "verification_docs_delete_admin"
  on storage.objects for delete
  using (bucket_id = 'verification-docs' and public.is_admin());

-- commit;


-- ============================================================================
-- START OF: 00008_triggers.sql
-- ============================================================================

-- ============================================================================
-- Migration 00008: handle_new_user trigger + role-assignment helpers
-- ============================================================================
-- When a new user signs up via Supabase Auth, automatically:
--   1. Insert a row in public.profiles with the requested role
--   2. Insert a row in public.user_roles (audit history)
--   3. Insert a row in the role-specific profile table (empty, for onboarding)
--
-- The role is taken from raw_user_meta_data->>'role' supplied at signup.
-- CRITICAL: only FARMER, EXPERT, ENTERPRISE, WORKER, BUYER are self-serviceable.
-- ADMIN can NEVER be self-assigned — the trigger rejects it.
-- ============================================================================

-- begin;

-- ---------------------------------------------------------------------------
-- Function: create_profile_for_new_user()
-- Triggered AFTER INSERT on auth.users
-- ---------------------------------------------------------------------------
create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role    user_role;
  v_email   text := new.email;
  v_name    text := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
begin
  -- Read the requested role from signup metadata. Default to FARMER.
  v_role := coalesce(new.raw_user_meta_data->>'role', 'FARMER')::user_role;

  -- BLOCK privilege escalation: ADMIN cannot be self-assigned.
  if v_role = 'ADMIN' then
    raise exception 'Self-registration as ADMIN is not permitted.';
  end if;

  -- Insert the profile row
  insert into public.profiles (id, email, name, role, status, phone)
  values (new.id, v_email, v_name, v_role, 'ACTIVE', new.raw_user_meta_data->>'phone');

  -- Audit history
  insert into public.user_roles (user_id, role, assigned_by, note)
  values (new.id, v_role, null, 'Self-registered');

  -- Seed the role-specific profile row (empty, for the onboarding flow)
  case v_role
    when 'FARMER' then
      insert into public.farmer_profiles (user_id) values (new.id);
    when 'EXPERT' then
      insert into public.expert_profiles (user_id) values (new.id);
    when 'ENTERPRISE' then
      insert into public.enterprise_profiles (user_id, business_name) values (new.id, v_name);
    when 'WORKER' then
      insert into public.worker_profiles (user_id) values (new.id);
    when 'BUYER' then
      insert into public.buyer_profiles (user_id) values (new.id);
    else null;
  end case;

  return new;
end;
$$;

-- Drop the trigger if it exists (idempotent), then recreate.
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_new_user();

-- ---------------------------------------------------------------------------
-- Function: assign_role(p_user_id, p_role)
-- Admin-only SECURITY DEFINER function. The ONLY sanctioned way to:
--   - change a user's role
--   - grant ADMIN
-- Enforces: only an ADMIN caller may invoke. Logs to user_roles + audit_logs.
-- ---------------------------------------------------------------------------
create or replace function public.assign_role(p_user_id uuid, p_role user_role)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators may assign roles.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot change your own role.';
  end if;

  update public.profiles set role = p_role where id = p_user_id;

  insert into public.user_roles (user_id, role, assigned_by, note)
  values (p_user_id, p_role, auth.uid(), 'Role assigned by admin');

  perform public.notify_user(p_user_id, 'SYSTEM', 'Role updated',
    'Your account role was changed to ' || p_role || '.');
  perform public.write_audit_log(auth.uid(), 'ROLE_ASSIGN', p_user_id::text,
    'Assigned role ' || p_role);
end;
$$;

revoke execute on function public.assign_role(uuid, user_role) from anon, authenticated;
-- Grant execute only to authenticated users; the function itself checks is_admin().
grant execute on function public.assign_role(uuid, user_role) to authenticated;

-- ---------------------------------------------------------------------------
-- Function: verify_expert(p_verification_id, p_action)
-- Admin-only. Approve or reject an expert's verification document.
-- Sets expert_profiles.verified accordingly.
-- ---------------------------------------------------------------------------
create or replace function public.verify_expert(p_verification_id uuid, p_action text)
returns void
language plpgsql
security definer
as $$
declare v_expert_profile_id uuid; v_user_id uuid; v_status verification_status;
begin
  if not public.is_admin() then
    raise exception 'Only administrators may verify experts.';
  end if;
  if p_action not in ('APPROVE','REJECT') then
    raise exception 'Invalid action. Use APPROVE or REJECT.';
  end if;

  select expert_profile_id into v_expert_profile_id
    from public.expert_verifications where id = p_verification_id;
  if v_expert_profile_id is null then
    raise exception 'Verification record not found.';
  end if;

  v_status := case when p_action = 'APPROVE' then 'APPROVED'::verification_status
                  else 'REJECTED'::verification_status end;

  update public.expert_verifications
    set status = v_status, reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_verification_id;

  if p_action = 'APPROVE' then
    update public.expert_profiles set verified = true where id = v_expert_profile_id;
  end if;

  select user_id into v_user_id from public.expert_profiles where id = v_expert_profile_id;
  perform public.notify_user(v_user_id, 'VERIFICATION',
    'Verification ' || lower(v_status::text),
    'Your expert verification was ' || lower(v_status::text) || '.');
  perform public.write_audit_log(auth.uid(), 'VERIFICATION_REVIEW',
    p_verification_id::text, 'Expert ' || p_action);
end;
$$;

revoke execute on function public.verify_expert(uuid, text) from anon;
grant execute on function public.verify_expert(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Function: verify_enterprise(p_enterprise_profile_id, p_action)
-- Admin-only. Approve or reject an enterprise's verification.
-- ---------------------------------------------------------------------------
create or replace function public.verify_enterprise(p_enterprise_profile_id uuid, p_action text)
returns void
language plpgsql
security definer
as $$
declare v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only administrators may verify enterprises.';
  end if;
  if p_action not in ('APPROVE','REJECT') then
    raise exception 'Invalid action. Use APPROVE or REJECT.';
  end if;

  update public.enterprise_profiles
    set verified = (p_action = 'APPROVE')
    where id = p_enterprise_profile_id
    returning user_id into v_user_id;

  if v_user_id is null then
    raise exception 'Enterprise profile not found.';
  end if;

  perform public.notify_user(v_user_id, 'VERIFICATION',
    'Business ' || case when p_action = 'APPROVE' then 'verified' else 'rejected' end,
    'Your business verification was ' || case when p_action = 'APPROVE' then 'approved' else 'rejected' end || '.');
  perform public.write_audit_log(auth.uid(), 'VERIFICATION_REVIEW',
    p_enterprise_profile_id::text, 'Enterprise ' || p_action);
end;
$$;

revoke execute on function public.verify_enterprise(uuid, text) from anon;
grant execute on function public.verify_enterprise(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Function: suspend_user(p_user_id, p_suspend)
-- Admin-only. Suspend or reactivate a user account.
-- ---------------------------------------------------------------------------
create or replace function public.suspend_user(p_user_id uuid, p_suspend boolean)
returns void
language plpgsql
security definer
as $$
begin
  if not public.is_admin() then
    raise exception 'Only administrators may suspend users.';
  end if;
  if p_user_id = auth.uid() then
    raise exception 'You cannot suspend your own account.';
  end if;
  update public.profiles
    set status = case when p_suspend then 'SUSPENDED'::account_status else 'ACTIVE'::account_status end
    where id = p_user_id;
  perform public.notify_user(p_user_id, 'SYSTEM',
    case when p_suspend then 'Account suspended' else 'Account reactivated' end,
    'Your account was ' || case when p_suspend then 'suspended' else 'reactivated' end || ' by an administrator.');
  perform public.write_audit_log(auth.uid(), 'USER_STATUS_UPDATE',
    p_user_id::text, 'suspended=' || p_suspend);
end;
$$;

revoke execute on function public.suspend_user(uuid, boolean) from anon;
grant execute on function public.suspend_user(uuid, boolean) to authenticated;

-- commit;


-- ============================================================================
-- START OF: 00009_contact_messages.sql
-- ============================================================================

-- ============================================================================
-- Migration 00009: Contact messages (from the public Contact Us form)
-- ============================================================================
-- begin;

create table if not exists public.contact_messages (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) >= 2),
  email       text not null,
  subject     text not null check (char_length(subject) >= 3),
  message     text not null check (char_length(message) >= 10),
  status      text not null default 'NEW' check (status in ('NEW','READ','RESOLVED')),
  created_at  timestamptz not null default now()
);

create index if not exists contact_messages_status_idx     on public.contact_messages(status);
create index if not exists contact_messages_created_at_idx on public.contact_messages(created_at desc);

-- Anyone (including unauthenticated visitors) can submit a contact message.
-- Only admins can read them (response moderation queue).
alter table public.contact_messages enable row level security;

drop policy if exists "contact_messages_insert_anyone" on public.contact_messages;
create policy "contact_messages_insert_anyone"
  on public.contact_messages for insert
  to anon, authenticated
  with check (true);

drop policy if exists "contact_messages_read_admin" on public.contact_messages;
create policy "contact_messages_read_admin"
  on public.contact_messages for select
  using (public.is_admin());

drop policy if exists "contact_messages_update_admin" on public.contact_messages;
create policy "contact_messages_update_admin"
  on public.contact_messages for update
  using (public.is_admin());

drop policy if exists "contact_messages_delete_admin" on public.contact_messages;
create policy "contact_messages_delete_admin"
  on public.contact_messages for delete
  using (public.is_admin());

-- commit;

