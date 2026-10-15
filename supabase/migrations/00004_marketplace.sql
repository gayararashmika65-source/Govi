-- ============================================================================
-- Migration 00004: Marketplace — products, services, crops, buyer reqs, jobs
-- ============================================================================

begin;

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

create trigger enquiries_set_updated_at
  before update on public.enquiries
  for each row execute function public.set_updated_at();

commit;
