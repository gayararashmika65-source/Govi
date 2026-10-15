-- ============================================================================
-- Migration 00003: Agricultural cases, consultations, messages, recommendations
-- ============================================================================
-- The core consultation workflow:
--   farmer creates case → expert accepts → messaging → recommendation → resolved
-- ============================================================================

begin;

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

create index if not exists messages_consultation_id_idx on public.consultations(consultation_id);
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

commit;
