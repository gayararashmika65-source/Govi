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

begin;

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

commit;
