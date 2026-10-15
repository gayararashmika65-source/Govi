-- ============================================================================
-- Policy test script: 0003_marketplace_and_admin.sql
-- ============================================================================
-- Verifies marketplace ownership rules and admin verification:
--   1. Owners can CRUD their own listings; others can read only.
--   2. Only the listing owner can delete it.
--   3. A worker can apply to a job (once).
--   4. Only the job owner can update application status.
--   5. Admin verification: an expert CANNOT self-verify; admin CAN via verify_expert().
--   6. An unverified expert cannot see OTHER unverified experts' profiles.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- TEST 1: Farmer A creates a crop listing. Farmer B CANNOT delete it.
-- EXPECTED: 0 rows deleted (RLS blocks).
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';  -- Farmer A
insert into public.crop_listings (id, owner_id, crop_name, variety, quantity, unit, asking_price, grade, district, available)
values ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '11111111-1111-1111-1111-111111111111',
  'Rice (Paddy)', 'BG 352', 1200, 'kg', 105, 'A', 'Anuradhapura', true)
on conflict (id) do nothing;

-- Farmer B attempts delete:
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
delete from public.crop_listings where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
select 'TEST 1: non-owner cannot delete listing' as test,
       count(*) as n from public.crop_listings where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
-- EXPECTED: n=1 (still exists)


-- ---------------------------------------------------------------------------
-- TEST 2: Farmer B CANNOT update Farmer A's crop listing (e.g. change price)
-- EXPECTED: 0 rows updated.
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
update public.crop_listings set asking_price = 1 where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
select 'TEST 2: non-owner cannot update listing price' as test,
       asking_price from public.crop_listings where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
-- EXPECTED: asking_price=105 (unchanged)


-- ---------------------------------------------------------------------------
-- TEST 3: A worker can apply to a job; a second application is rejected by the
-- unique constraint; a non-worker (Farmer B) CANNOT apply.
-- ---------------------------------------------------------------------------
-- Farmer A posts a job:
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into public.job_listings (id, owner_id, title, location, wage, status)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  'Paddy harvesting workers needed', 'Kekirawa', 3500, 'OPEN')
on conflict (id) do nothing;

-- Create a worker user to apply:
insert into auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, instance_id, created_at, updated_at)
values ('55555555-5555-5555-5555-555555555555', 'worker@test.lk',
  crypt('password123', gen_salt('bf')),
  jsonb_build_object('role','WORKER','name','Test Worker'),
  'authenticated','authenticated','00000000-0000-0000-0000-000000000000', now(), now())
on conflict (id) do nothing;

-- Worker applies:
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
insert into public.job_applications (id, job_id, worker_id, cover_note, status)
values ('99999999-9999-9999-9999-999999999999',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '55555555-5555-5555-5555-555555555555',
  'I have 8 years of experience.', 'PENDING')
on conflict (id) do nothing;

select 'TEST 3a: worker can apply to a job' as test,
       count(*) as n from public.job_applications where job_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
-- EXPECTED: n=1

-- Worker applies AGAIN -> unique constraint blocks:
-- insert into public.job_applications (job_id, worker_id) values (...);
-- EXPECTED: ERROR: duplicate key value violates unique constraint "job_application_unique"

-- Farmer B (a FARMER, not WORKER) attempts to apply:
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into public.job_applications (job_id, worker_id, cover_note)
values ('ffffffff-ffff-ffff-ffff-ffffffffffff', '33333333-3333-3333-3333-333333333333', 'I am a farmer');
-- EXPECTED: 0 rows inserted (RLS with check fails — worker_id must match auth.uid() AND role must be WORKER)


-- ---------------------------------------------------------------------------
-- TEST 4: Only the job owner can ACCEPT/REJECT an application
-- The worker CANNOT update their own application status.
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';  -- Worker
update public.job_applications set status = 'ACCEPTED' where id = '99999999-9999-9999-9999-999999999999';
select 'TEST 4a: worker cannot self-accept their application' as test,
       status from public.job_applications where id = '99999999-9999-9999-9999-999999999999';
-- EXPECTED: status=PENDING (unchanged)

-- Job owner (Farmer A) accepts:
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update public.job_applications set status = 'ACCEPTED' where id = '99999999-9999-9999-9999-999999999999';
select 'TEST 4b: job owner can accept the application' as test,
       status from public.job_applications where id = '99999999-9999-9999-9999-999999999999';
-- EXPECTED: status=ACCEPTED


-- ---------------------------------------------------------------------------
-- TEST 5: An expert CANNOT self-verify (verify column is read-only for owner)
-- EXPECTED: 0 rows updated (or ERROR if updated via the WITH CHECK constraint).
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';  -- Expert
update public.expert_profiles set verified = true where user_id = '22222222-2222-2222-2222-222222222222';
select 'TEST 5: expert cannot self-verify' as test,
       verified from public.expert_profiles where user_id = '22222222-2222-2222-2222-222222222222';
-- EXPECTED: verified=false (unchanged)


-- ---------------------------------------------------------------------------
-- TEST 6: An admin CAN verify an expert via the verify_expert() function.
-- First create an ADMIN user (manually, since signup is blocked).
-- Then the admin approves the expert's submitted verification document.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, instance_id, created_at, updated_at)
values ('66666666-6666-6666-6666-666666666666', 'admin@test.lk',
  crypt('password123', gen_salt('bf')),
  jsonb_build_object('role','FARMER','name','Admin'),  -- meta role is irrelevant
  'authenticated','authenticated','00000000-0000-0000-0000-000000000000', now(), now())
on conflict (id) do nothing;

-- Promote to ADMIN via direct update (service-role / DB superuser only):
update public.profiles set role = 'ADMIN' where id = '66666666-6666-6666-6666-666666666666';

-- The expert submits a verification document:
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into public.expert_verifications (id, expert_profile_id, document_path, status, note)
select '77777777-7777-7777-7777-777777777777', id, '/verification-docs/sample.pdf', 'PENDING', 'BSc certificate'
from public.expert_profiles where user_id = '22222222-2222-2222-2222-222222222222'
on conflict (id) do nothing;

-- Admin approves:
set request.jwt.claim.sub = '66666666-6666-6666-6666-666666666666';
select public.verify_expert('77777777-7777-7777-7777-777777777777', 'APPROVE');

select 'TEST 6: admin verified the expert' as test,
       ep.verified, ev.status
from public.expert_profiles ep
join public.expert_verifications ev on ev.expert_profile_id = ep.id
where ep.user_id = '22222222-2222-2222-2222-222222222222';
-- EXPECTED: verified=true, status=APPROVED


-- ---------------------------------------------------------------------------
-- TEST 7: An unverified expert cannot see another unverified expert's profile.
-- (Verified experts are public; unverified are only visible to self/admin.)
-- Create a second, unverified expert:
-- ---------------------------------------------------------------------------
insert into auth.users (id, email, encrypted_password, raw_user_meta_data, aud, role, instance_id, created_at, updated_at)
values ('88888888-8888-8888-8888-888888888888', 'expert2@test.lk',
  crypt('password123', gen_salt('bf')),
  jsonb_build_object('role','EXPERT','name','Unverified Expert 2'),
  'authenticated','authenticated','00000000-0000-0000-0000-000000000000', now(), now())
on conflict (id) do nothing;

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';  -- verified expert
select 'TEST 7: verified expert cannot see unverified expert' as test,
       count(*) as n from public.expert_profiles where user_id = '88888888-8888-8888-8888-888888888888';
-- EXPECTED: n=0 (because the other expert is unverified AND not self AND not admin)

reset request.jwt.claim.sub;
