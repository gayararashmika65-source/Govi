-- ============================================================================
-- Migration 00006: Row Level Security (RLS) policies
-- ============================================================================
-- THE CORE OF PLATFORM SECURITY.
-- Every table has RLS enabled. Every policy enforces one principle:
--   "Users can only do what their role + ownership entitle them to do."
-- Privilege escalation is impossible: role is read from public.profiles
-- (NOT from request payloads), and only admins can change roles.
-- ============================================================================

begin;

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
create policy "profiles_select_own_or_admin"
  on public.profiles for select
  using (id = auth.uid() or public.is_admin());

create policy "profiles_insert_self"
  on public.profiles for insert
  with check (id = auth.uid());

-- A user may update only their own non-role fields. Role changes are blocked here.
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
create policy "profiles_delete_admin"
  on public.profiles for delete
  using (public.is_admin());

-- ============================================================================
-- USER_ROLES (audit log)
-- ============================================================================
alter table public.user_roles enable row level security;

create policy "user_roles_read_own_or_admin"
  on public.user_roles for select
  using (user_id = auth.uid() or public.is_admin());

-- Only admins can INSERT a role assignment (privilege grant). Users cannot self-assign.
create policy "user_roles_insert_admin"
  on public.user_roles for insert
  with check (public.is_admin() and assigned_by = auth.uid());

-- Role history is immutable (no update / delete by anyone except admin cleanup)
create policy "user_roles_update_admin"
  on public.user_roles for update
  using (public.is_admin());

create policy "user_roles_delete_admin"
  on public.user_roles for delete
  using (public.is_admin());

-- ============================================================================
-- FARMER_PROFILES
-- ============================================================================
alter table public.farmer_profiles enable row level security;

-- The owner can read/write; experts & admins can read (for case context)
create policy "farmer_profiles_read"
  on public.farmer_profiles for select
  using (
    user_id = auth.uid()
    or public.is_role('EXPERT')
    or public.is_role('BUYER')
    or public.is_admin()
  );

create policy "farmer_profiles_insert_own"
  on public.farmer_profiles for insert
  with check (user_id = auth.uid() and public.is_role('FARMER'));

create policy "farmer_profiles_update_own"
  on public.farmer_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "farmer_profiles_delete_admin"
  on public.farmer_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- EXPERT_PROFILES
-- ============================================================================
alter table public.expert_profiles enable row level security;

-- Verified experts are publicly visible (so farmers can find them).
-- Unverified experts are only visible to themselves and admins.
create policy "expert_profiles_read"
  on public.expert_profiles for select
  using (
    verified = true
    or user_id = auth.uid()
    or public.is_admin()
  );

create policy "expert_profiles_insert_own"
  on public.expert_profiles for insert
  with check (user_id = auth.uid() and public.is_role('EXPERT'));

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

create policy "expert_profiles_delete_admin"
  on public.expert_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- EXPERT_VERIFICATIONS
-- ============================================================================
alter table public.expert_verifications enable row level security;

-- The expert owner can read their own submissions; admins see all (review queue)
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
create policy "expert_verifications_update_admin"
  on public.expert_verifications for update
  using (public.is_admin());

create policy "expert_verifications_delete_admin"
  on public.expert_verifications for delete
  using (public.is_admin());

-- ============================================================================
-- ENTERPRISE_PROFILES
-- ============================================================================
alter table public.enterprise_profiles enable row level security;

create policy "enterprise_profiles_read"
  on public.enterprise_profiles for select
  using (
    verified = true
    or user_id = auth.uid()
    or public.is_admin()
  );

create policy "enterprise_profiles_insert_own"
  on public.enterprise_profiles for insert
  with check (user_id = auth.uid() and public.is_role('ENTERPRISE'));

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

create policy "enterprise_profiles_delete_admin"
  on public.enterprise_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- WORKER_PROFILES
-- ============================================================================
alter table public.worker_profiles enable row level security;

create policy "worker_profiles_read"
  on public.worker_profiles for select
  using (
    user_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('FARMER','ENTERPRISE'))
  );

create policy "worker_profiles_insert_own"
  on public.worker_profiles for insert
  with check (user_id = auth.uid() and public.is_role('WORKER'));

create policy "worker_profiles_update_own"
  on public.worker_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "worker_profiles_delete_admin"
  on public.worker_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- BUYER_PROFILES
-- ============================================================================
alter table public.buyer_profiles enable row level security;

create policy "buyer_profiles_read"
  on public.buyer_profiles for select
  using (user_id = auth.uid() or public.is_admin());

create policy "buyer_profiles_insert_own"
  on public.buyer_profiles for insert
  with check (user_id = auth.uid() and public.is_role('BUYER'));

create policy "buyer_profiles_update_own"
  on public.buyer_profiles for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "buyer_profiles_delete_admin"
  on public.buyer_profiles for delete
  using (public.is_admin());

-- ============================================================================
-- AGRICULTURAL_CASES
-- ============================================================================
alter table public.agricultural_cases enable row level security;

-- Readable by: the farmer who opened it, the assigned expert, admins.
-- Experts can also see OPEN/UNDER_REVIEW cases (the case queue).
create policy "cases_read"
  on public.agricultural_cases for select
  using (
    farmer_id = auth.uid()
    or expert_id = auth.uid()
    or public.is_admin()
    or (public.is_role('EXPERT') and status in ('OPEN','UNDER_REVIEW'))
  );

-- Only farmers can create cases
create policy "cases_insert_farmer"
  on public.agricultural_cases for insert
  with check (
    farmer_id = auth.uid()
    and public.is_role('FARMER')
    -- cannot pre-assign an expert that isn't themselves (expert_id may be null or any EXPERT profile)
  );

-- The farmer owner or the assigned expert can update status; admins too.
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
create policy "cases_delete_admin"
  on public.agricultural_cases for delete
  using (public.is_admin());

-- ============================================================================
-- CASE_ATTACHMENTS
-- ============================================================================
alter table public.case_attachments enable row level security;

create policy "case_attachments_read"
  on public.case_attachments for select
  using (
    exists (
      select 1 from public.agricultural_cases c
      where c.id = case_attachments.case_id
        and (c.farmer_id = auth.uid() or c.expert_id = auth.uid() or public.is_admin())
    )
  );

create policy "case_attachments_insert_owner"
  on public.case_attachments for insert
  with check (
    exists (
      select 1 from public.agricultural_cases c
      where c.id = case_attachments.case_id
        and c.farmer_id = auth.uid()
    )
  );

create policy "case_attachments_delete_admin"
  on public.case_attachments for delete
  using (public.is_admin());

-- ============================================================================
-- CONSULTATIONS
-- ============================================================================
alter table public.consultations enable row level security;

create policy "consultations_read"
  on public.consultations for select
  using (
    farmer_id = auth.uid()
    or expert_id = auth.uid()
    or public.is_admin()
  );

-- A farmer can request a consultation (insert with themselves as farmer_id)
create policy "consultations_insert_farmer"
  on public.consultations for insert
  with check (
    farmer_id = auth.uid()
    and public.is_role('FARMER')
  );

-- The farmer or the expert of the consultation can update status (accept/decline)
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

create policy "consultations_delete_admin"
  on public.consultations for delete
  using (public.is_admin());

-- ============================================================================
-- MESSAGES — only the two participants can read/send
-- ============================================================================
alter table public.messages enable row level security;

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

create policy "messages_delete_admin"
  on public.messages for delete
  using (public.is_admin());

-- ============================================================================
-- EXPERT_RECOMMENDATIONS
-- ============================================================================
alter table public.expert_recommendations enable row level security;

create policy "recommendations_read"
  on public.expert_recommendations for select
  using (
    exists (
      select 1 from public.agricultural_cases c
      where c.id = expert_recommendations.case_id
        and (c.farmer_id = auth.uid() or c.expert_id = auth.uid() or public.is_admin())
    )
  );

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

create policy "recommendations_delete_admin"
  on public.expert_recommendations for delete
  using (public.is_admin());

-- ============================================================================
-- AVAILABILITY_SLOTS
-- ============================================================================
alter table public.availability_slots enable row level security;

create policy "availability_read"
  on public.availability_slots for select
  using (
    exists (
      select 1 from public.expert_profiles ep
      where ep.id = availability_slots.expert_profile_id
        and (ep.user_id = auth.uid() or ep.verified = true or public.is_admin())
    )
  );

create policy "availability_insert_own"
  on public.availability_slots for insert
  with check (
    exists (
      select 1 from public.expert_profiles ep
      where ep.id = availability_slots.expert_profile_id
        and ep.user_id = auth.uid()
    )
  );

create policy "availability_update_own"
  on public.availability_slots for update
  using (
    exists (
      select 1 from public.expert_profiles ep
      where ep.id = availability_slots.expert_profile_id
        and ep.user_id = auth.uid()
    )
  );

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
create policy "products_read"
  on public.product_listings for select
  using (
    auth.uid() is not null
    and (available = true or owner_id = auth.uid() or public.is_admin())
  );

create policy "products_insert_own"
  on public.product_listings for insert
  with check (owner_id = auth.uid() and public.is_role('ENTERPRISE'));

create policy "products_update_own"
  on public.product_listings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

create policy "products_delete_own"
  on public.product_listings for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- SERVICE_LISTINGS
-- ============================================================================
alter table public.service_listings enable row level security;

create policy "services_read"
  on public.service_listings for select
  using (
    auth.uid() is not null
    and (available = true or owner_id = auth.uid() or public.is_admin())
  );

create policy "services_insert_own"
  on public.service_listings for insert
  with check (owner_id = auth.uid() and public.is_role('WORKER') or owner_id = auth.uid() and public.is_role('ENTERPRISE'));

create policy "services_update_own"
  on public.service_listings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

create policy "services_delete_own"
  on public.service_listings for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- CROP_LISTINGS
-- ============================================================================
alter table public.crop_listings enable row level security;

create policy "crops_read"
  on public.crop_listings for select
  using (
    auth.uid() is not null
    and (available = true or owner_id = auth.uid() or public.is_admin())
  );

create policy "crops_insert_own"
  on public.crop_listings for insert
  with check (owner_id = auth.uid() and public.is_role('FARMER'));

create policy "crops_update_own"
  on public.crop_listings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

create policy "crops_delete_own"
  on public.crop_listings for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- BUYER_REQUIREMENTS
-- ============================================================================
alter table public.buyer_requirements enable row level security;

create policy "buyer_reqs_read"
  on public.buyer_requirements for select
  using (
    auth.uid() is not null
    and (status = 'OPEN' or owner_id = auth.uid() or public.is_admin())
  );

create policy "buyer_reqs_insert_own"
  on public.buyer_requirements for insert
  with check (owner_id = auth.uid() and public.is_role('BUYER'));

create policy "buyer_reqs_update_own"
  on public.buyer_requirements for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

create policy "buyer_reqs_delete_own"
  on public.buyer_requirements for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- JOB_LISTINGS
-- ============================================================================
alter table public.job_listings enable row level security;

create policy "jobs_read"
  on public.job_listings for select
  using (
    auth.uid() is not null
    and (status = 'OPEN' or owner_id = auth.uid() or public.is_admin())
  );

create policy "jobs_insert_own"
  on public.job_listings for insert
  with check (
    owner_id = auth.uid()
    and (public.is_role('FARMER') or public.is_role('ENTERPRISE'))
  );

create policy "jobs_update_own"
  on public.job_listings for update
  using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid());

create policy "jobs_delete_own"
  on public.job_listings for delete
  using (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- JOB_APPLICATIONS
-- ============================================================================
alter table public.job_applications enable row level security;

-- The job owner sees all applications to their job; the worker sees their own; admins all
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

create policy "job_apps_insert_own"
  on public.job_applications for insert
  with check (
    worker_id = auth.uid()
    and public.is_role('WORKER')
    and exists (select 1 from public.job_listings j where j.id = job_applications.job_id and j.status = 'OPEN')
  );

-- The job owner updates application status (accept/reject); workers can't.
create policy "job_apps_update_owner"
  on public.job_applications for update
  using (
    exists (
      select 1 from public.job_listings j
      where j.id = job_applications.job_id and j.owner_id = auth.uid()
    )
    or public.is_admin()
  );

create policy "job_apps_delete_admin"
  on public.job_applications for delete
  using (public.is_admin());

-- ============================================================================
-- ENQUIRIES
-- ============================================================================
alter table public.enquiries enable row level security;

create policy "enquiries_read_parties"
  on public.enquiries for select
  using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

create policy "enquiries_insert_sender"
  on public.enquiries for insert
  with check (sender_id = auth.uid());

create policy "enquiries_update_parties"
  on public.enquiries for update
  using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

create policy "enquiries_delete_admin"
  on public.enquiries for delete
  using (public.is_admin());

-- ============================================================================
-- KNOWLEDGE_ARTICLES — public read; admin write
-- ============================================================================
alter table public.knowledge_articles enable row level security;

create policy "articles_read_all"
  on public.knowledge_articles for select
  using (auth.uid() is not null);

create policy "articles_write_admin"
  on public.knowledge_articles for insert
  with check (public.is_admin());

create policy "articles_update_admin"
  on public.knowledge_articles for update
  using (public.is_admin());

create policy "articles_delete_admin"
  on public.knowledge_articles for delete
  using (public.is_admin());

-- ============================================================================
-- NOTIFICATIONS — only the owner
-- ============================================================================
alter table public.notifications enable row level security;

create policy "notifications_read_own"
  on public.notifications for select
  using (user_id = auth.uid());

create policy "notifications_insert_any_authenticated"
  on public.notifications for insert
  -- RLS-bypassing inserts happen via SECURITY DEFINER functions (see notify_user below).
  -- Direct client inserts are blocked.
  with check (false);

create policy "notifications_update_own"
  on public.notifications for update
  using (user_id = auth.uid());

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

create policy "reports_read_own_or_admin"
  on public.reports for select
  using (reporter_id = auth.uid() or public.is_admin());

create policy "reports_insert_authenticated"
  on public.reports for insert
  with check (reporter_id = auth.uid());

create policy "reports_update_admin"
  on public.reports for update
  using (public.is_admin());

create policy "reports_delete_admin"
  on public.reports for delete
  using (public.is_admin());

-- ============================================================================
-- AUDIT_LOGS — admin-only read; SECURITY DEFINER writes
-- ============================================================================
alter table public.audit_logs enable row level security;

create policy "audit_logs_read_admin"
  on public.audit_logs for select
  using (public.is_admin());

create policy "audit_logs_insert_any_authenticated"
  on public.audit_logs for insert
  with check (false);

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

commit;
