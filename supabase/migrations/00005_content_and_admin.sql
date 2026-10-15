-- ============================================================================
-- Migration 00005: Content + notifications + reports + audit logs
-- ============================================================================

begin;

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

commit;
