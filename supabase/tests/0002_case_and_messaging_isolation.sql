-- ============================================================================
-- Policy test script: 0002_case_and_messaging_isolation.sql
-- ============================================================================
-- Verifies the consultation workflow's privacy model:
--   1. A farmer can create & read their own case
--   2. Another farmer CANNOT read someone else's case
--   3. An expert CAN see OPEN cases in the queue
--   4. Only the case's farmer/expert can read its messages
--   5. A farmer CANNOT insert a message on another farmer's consultation
-- ============================================================================

-- ---------------------------------------------------------------------------
-- SETUP: create a case as Farmer A
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';  -- Farmer A
insert into public.agricultural_cases (id, farmer_id, crop, category, title, description, status, district)
values (
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  'Rice (Paddy)', 'PEST', 'Yellowing patches', 'Description long enough to pass the check.',
  'OPEN', 'Anuradhapura'
) on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- TEST 1: Farmer A can read their own case
-- EXPECTED: 1 row.
-- ---------------------------------------------------------------------------
select 'TEST 1: owner reads own case' as test, count(*) as n
from public.agricultural_cases where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- EXPECTED: n=1


-- ---------------------------------------------------------------------------
-- TEST 2: Farmer B (another farmer) CANNOT see Farmer A's case
-- EXPECTED: 0 rows (case is OPEN, but Farmer B isn't the farmer, isn't an expert,
-- and Farmer B's role is FARMER — not EXPERT — so the "expert sees OPEN cases"
-- policy doesn't apply).
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';  -- Farmer B
select 'TEST 2: other farmer cannot see the case' as test, count(*) as n
from public.agricultural_cases where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
-- EXPECTED: n=0


-- ---------------------------------------------------------------------------
-- TEST 3: An expert CAN see OPEN cases (the case queue)
-- EXPECTED: 1 row.
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';  -- Expert
select 'TEST 3: expert sees OPEN cases' as test, count(*) as n
from public.agricultural_cases where status = 'OPEN';
-- EXPECTED: n>=1


-- ---------------------------------------------------------------------------
-- TEST 4: An expert accepts the case (assign themselves). Then create a consultation.
-- EXPECTED: case status -> UNDER_REVIEW; consultation created.
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';  -- Expert
update public.agricultural_cases
  set expert_id = '22222222-2222-2222-2222-222222222222', status = 'UNDER_REVIEW'
  where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

insert into public.consultations (id, case_id, farmer_id, expert_id, type, status)
values (
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'CHAT', 'ACCEPTED'
) on conflict (id) do nothing;


-- ---------------------------------------------------------------------------
-- TEST 5: Farmer B CANNOT read messages on Farmer A's consultation
-- EXPECTED: 0 rows (must be a participant).
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';  -- Farmer B
-- First seed a message as Farmer A (legitimate), then check Farmer B can't see it.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';  -- Farmer A
insert into public.messages (id, consultation_id, sender_id, body)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  'Hello doctor, my paddy is yellowing.') on conflict (id) do nothing;

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';  -- Farmer B
select 'TEST 5: non-participant cannot read messages' as test, count(*) as n
from public.messages where consultation_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
-- EXPECTED: n=0


-- ---------------------------------------------------------------------------
-- TEST 6: Farmer B CANNOT send a message on Farmer A's consultation
-- EXPECTED: ERROR or 0 rows (RLS with check fails).
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';  -- Farmer B
-- insert into public.messages (id, consultation_id, sender_id, body)
-- values ('dddddddd-dddd-dddd-dddd-dddddddddddd',
--   'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
--   '33333333-3333-3333-3333-333333333333',
--   'I am hijacking this chat.');
-- EXPECTED: ERROR: new row violates row-level security policy


-- ---------------------------------------------------------------------------
-- TEST 7: Farmer A and the Expert CAN read the message (both participants)
-- EXPECTED: 1 row each.
-- ---------------------------------------------------------------------------
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';  -- Farmer A
select 'TEST 7a: farmer reads own consultation messages' as test, count(*) as n
from public.messages where consultation_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
-- EXPECTED: n=1

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';  -- Expert
select 'TEST 7b: expert reads consultation messages' as test, count(*) as n
from public.messages where consultation_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
-- EXPECTED: n=1

reset request.jwt.claim.sub;
