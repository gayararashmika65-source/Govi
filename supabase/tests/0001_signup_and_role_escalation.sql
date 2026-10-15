-- ============================================================================
-- Policy test script: 0001_signup_and_role_escalation.sql
-- ============================================================================
-- Run in the Supabase SQL editor (or `psql` against the DB) to verify:
--   1. A user CAN sign up with a self-serviceable role (FARMER, EXPERT, etc.)
--   2. A user CANNOT sign up as ADMIN (privilege escalation blocked at signup)
--   3. A user CANNOT change their own role via direct UPDATE
--   4. A user CANNOT change another user's role
--   5. Only an admin (via assign_role()) can change roles
-- ============================================================================
--
-- EXPECTED OUTCOMES are documented as comments above each test block.
-- Each test sets `request.jwt.claim.sub` to impersonate a user (Supabase RLS
-- reads auth.uid() from this in the SQL editor).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SETUP: create two test users in auth.users (only works as service role)
-- In production, the auth flow creates these rows. Here we insert manually.
-- ---------------------------------------------------------------------------
-- IMPORTANT: run the next block with the service_role key (anon is blocked).

-- User A: a farmer
insert into auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, email_confirmed_at, instance_id, created_at, updated_at)
values (
  '11111111-1111-1111-1111-111111111111',
  'farmer@test.lk',
  crypt('password123', gen_salt('bf')),
  jsonb_build_object('role', 'FARMER', 'name', 'Test Farmer'),
  'authenticated', 'authenticated', now(), '00000000-0000-0000-0000-000000000000', now(), now()
) on conflict (id) do nothing;

-- User B: an expert (will be verified later)
insert into auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, email_confirmed_at, instance_id, created_at, updated_at)
values (
  '22222222-2222-2222-2222-222222222222',
  'expert@test.lk',
  crypt('password123', gen_salt('bf')),
  jsonb_build_object('role', 'EXPERT', 'name', 'Test Expert'),
  'authenticated', 'authenticated', now(), '00000000-0000-0000-0000-000000000000', now(), now()
) on conflict (id) do nothing;

-- User C: a second farmer (for cross-user tests)
insert into auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, email_confirmed_at, instance_id, created_at, updated_at)
values (
  '33333333-3333-3333-3333-333333333333',
  'farmer2@test.lk',
  crypt('password123', gen_salt('bf')),
  jsonb_build_object('role', 'FARMER', 'name', 'Test Farmer 2'),
  'authenticated', 'authenticated', now(), '00000000-0000-0000-0000-000000000000', now(), now()
) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- TEST 1: Signup with a self-serviceable role creates a profile
-- EXPECTED: the profiles row exists with role=FARMER, and a farmer_profiles row exists.
-- (Trigger fired on the auth.users insert above.)
-- ---------------------------------------------------------------------------
select 'TEST 1: profile auto-created on signup' as test,
       p.id, p.email, p.role, p.status,
       (fp.id is not null) as has_farmer_profile
from public.profiles p
left join public.farmer_profiles fp on fp.user_id = p.id
where p.id = '11111111-1111-1111-1111-111111111111';
-- EXPECTED: role=FARMER, status=ACTIVE, has_farmer_profile=true


-- ---------------------------------------------------------------------------
-- TEST 2: Attempt to sign up as ADMIN (privilege escalation at signup)
-- EXPECTED: ERROR raised — "Self-registration as ADMIN is not permitted."
-- ---------------------------------------------------------------------------
-- (Uncomment the insert to run it; expect an error.)
-- insert into auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, instance_id, created_at, updated_at)
-- values (
--   '44444444-4444-4444-4444-444444444444',
--   'rogue@test.lk', crypt('password123', gen_salt('bf')),
--   jsonb_build_object('role', 'ADMIN', 'name', 'Rogue'),
--   'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000', now(), now()
-- );
-- EXPECTED: ERROR: Self-registration as ADMIN is not permitted.


-- ---------------------------------------------------------------------------
-- TEST 3: A user CANNOT change their own role via direct UPDATE (RLS blocks it)
-- EXPECTED: 0 rows updated (policy check fails — role mismatch).
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.profiles set role = 'ADMIN' where id = '11111111-1111-1111-1111-111111111111';
-- Check: role is still FARMER
select 'TEST 3: farmer cannot self-promote to ADMIN' as test, role
from public.profiles where id = '11111111-1111-1111-1111-111111111111';
-- EXPECTED: role=FARMER (unchanged)


-- ---------------------------------------------------------------------------
-- TEST 4: A user CANNOT update another user's profile row
-- EXPECTED: 0 rows updated (policy "profiles_update_own" blocks it).
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.profiles set name = 'Hacked' where id = '33333333-3333-3333-3333-333333333333';
select 'TEST 4: farmer cannot edit another farmer profile' as test,
       name from public.profiles where id = '33333333-3333-3333-3333-333333333333';
-- EXPECTED: name='Test Farmer 2' (unchanged)


-- ---------------------------------------------------------------------------
-- TEST 5: assign_role() rejects non-admin callers
-- EXPECTED: ERROR — "Only administrators may assign roles."
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';  -- farmer
-- select public.assign_role('11111111-1111-1111-1111-111111111111', 'ADMIN'::user_role);
-- EXPECTED: ERROR: Only administrators may assign roles.


-- ---------------------------------------------------------------------------
-- (Reset claim to unset impersonation.)
-- ---------------------------------------------------------------------------
reset request.jwt.claim.sub;
